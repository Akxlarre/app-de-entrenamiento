import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  AfterViewInit,
  ElementRef,
  signal,
  computed,
} from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonList,
  IonItem,
  IonLabel,
  IonSearchbar,
  IonSpinner,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
} from '@ionic/angular';
import { AppHeaderComponent } from '@shared/components/app-header/app-header.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { IconComponent } from '@shared/components/icon/icon.component';
import { ExerciseFacade, ExerciseDefinition } from '@core/facades/exercise.facade';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { GsapAnimationsService } from '@core/services/ui/gsap-animations.service';
import { ExerciseDetailComponent } from './components/exercise-detail/exercise-detail.component';

const MUSCLE_GROUPS = [
  { label: 'Todos', value: '', icon: 'zap' },
  { label: 'Pecho', value: 'Pecho', icon: 'shield-check' },
  { label: 'Espalda', value: 'Espalda', icon: 'layers' },
  { label: 'Piernas', value: 'Pierna', icon: 'activity' },
  { label: 'Hombros', value: 'Hombro', icon: 'dumbbell' },
  { label: 'Bíceps', value: 'Bíceps', icon: 'activity' },
  { label: 'Tríceps', value: 'Tríceps', icon: 'activity' },
  { label: 'Abdomen', value: 'Abdom', icon: 'target' },
  { label: 'Glúteos', value: 'Glúteo', icon: 'circle' },
  { label: 'Cardio', value: 'Cardio', icon: 'activity' },
];

@Component({
  selector: 'app-explorer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonSearchbar,
    IonSpinner,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    AppHeaderComponent,
    DrawerComponent,
    IconComponent,
    EmptyStateComponent,
    ExerciseDetailComponent,
  ],
  template: `
    <ion-content class="explorer-content tier-trabajo" [fullscreen]="true">
      <app-header title="Catálogo de Ejercicios">
        <div slot="bottom" class="search-container">
          <ion-searchbar
            class="custom-searchbar"
            placeholder="Buscar ejercicio..."
            [debounce]="0"
            [value]="searchQuery()"
            (ionInput)="onSearch($event)"
          >
          </ion-searchbar>

          <!-- Muscle Group Chips -->
          <div class="chips-container mt-2">
            @for (group of muscleGroups; track group.value) {
              <button
                class="chip-pill"
                [class.chip-active]="selectedGroup() === group.value"
                (click)="selectGroup(group.value)"
              >
                <app-icon
                  class="chip-icon flex items-center justify-center"
                  [name]="group.icon"
                  [size]="14"
                ></app-icon>
                <span class="chip-label">{{ group.label }}</span>
              </button>
            }
          </div>
        </div>
      </app-header>

      <ion-list class="exercise-list">
        @if (facade.loading()) {
          <div class="empty-state">
            <ion-spinner color="primary"></ion-spinner>
            <p>Cargando ejercicios...</p>
          </div>
        } @else if (facade.exercises().length === 0) {
          <!-- "No encontré lo que buscás" y "no hay nada cargado" son
               situaciones distintas: la primera se resuelve borrando el
               filtro, la segunda no se resuelve desde acá. -->
          @if (hayFiltroActivo()) {
            <app-empty-state
              message="Ningún ejercicio coincide"
              subtitle="Probá con otro término o quitá el filtro de grupo muscular."
              icon="search"
              actionLabel="Limpiar filtros"
              actionIcon="x"
              (action)="limpiarFiltros()"
            />
          } @else {
            <app-empty-state
              message="El catálogo está vacío"
              subtitle="Todavía no hay ejercicios cargados en la base."
              icon="clipboard-list"
            />
          }
        } @else {
          @for (exercise of facade.exercises().slice(0, displayLimit()); track exercise.id) {
            <ion-item
              button
              detail="false"
              lines="none"
              class="exercise-item"
              (click)="openDetail(exercise)"
            >
              <ion-label>
                <h2 class="exercise-name">{{ exercise.name_es || exercise.name_en }}</h2>
                <p class="exercise-meta capitalize">
                  <span class="exercise-muscle">{{ exercise.muscle }}</span> ·
                  <span>{{ exercise.equipment }}</span> ·
                  <span>{{ exercise.category }}</span>
                </p>
              </ion-label>
              <app-icon
                slot="end"
                class="exercise-chevron"
                name="chevron-right"
                [size]="20"
                [ariaHidden]="true"
              ></app-icon>
            </ion-item>
          }
        }
      </ion-list>

      <ion-infinite-scroll (ionInfinite)="loadMore($event)">
        <ion-infinite-scroll-content
          loadingSpinner="bubbles"
          loadingText="Cargando más ejercicios..."
        ></ion-infinite-scroll-content>
      </ion-infinite-scroll>
    </ion-content>

    <!-- Drawer para Detalles del Ejercicio -->
    <app-drawer
      [isOpen]="drawerOpen()"
      [title]="selectedExercise()?.name_es || 'Detalle del ejercicio'"
      (closed)="closeDetail()"
    >
      @if (selectedExercise(); as exercise) {
        <app-exercise-detail [exercise]="exercise" />
      }
    </app-drawer>
  `,
  styles: [
    `
      .search-container {
        padding: 0 0 1rem 0;
      }
      /* Sin regla de fondo propia: la regla global de ion-content ya
         pinta la tinta (fix-028). */

      /* ion-searchbar no expone variable de alto: el input interno lo
         fija en su propio CSS y medía 42px.

         Necesita ::ng-deep. Sin él, Angular le estampa su atributo de
         encapsulación al descendiente, pero ese input lo crea Ionic
         dentro de su propio componente y nunca lleva ese atributo, así
         que el selector no matchea nunca. Verificado en navegador: el
         input no tiene atributo de encapsulación. */
      .custom-searchbar ::ng-deep .searchbar-input {
        min-height: var(--target-min);
      }

      .custom-searchbar {
        --background: var(--bg-surface);
        --color: var(--text-primary);
        --placeholder-color: var(--text-muted);
        --icon-color: var(--text-muted);
        --border-radius: 12px;
        padding: 0 16px 8px 16px;
      }

      /* === CHIPS SCROLLBAR === */
      .chips-container {
        display: flex;
        gap: 0.5rem;
        overflow-x: auto;
        scrollbar-width: none;
        padding: 0.25rem 1rem 0.5rem 1rem;
      }
      .chips-container::-webkit-scrollbar {
        display: none;
      }

      /* Medido antes: 30px de alto. Es el control más usado de la
         vista y era el más chico de toda la app. */
      .chip-pill {
        min-height: var(--tier-target, var(--target-min));
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.45rem 0.85rem;
        background: var(--bg-surface);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-full);
        color: var(--text-secondary);
        font-size: var(--text-xs);
        font-weight: 600;
        white-space: nowrap;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .chip-pill:active {
        transform: scale(0.96);
      }
      /* Tinta sobre ember da 7.0:1; hueso sobre ember daba 2.9:1 y
         reprobaba. El resplandor era del azul de marca anterior. */
      .chip-pill.chip-active {
        background: var(--ds-brand);
        border-color: var(--ds-brand);
        color: var(--color-primary-text);
      }
      .chip-icon {
        font-size: var(--text-sm);
      }

      .exercise-list {
        background: transparent;
        padding: 0 8px;
        padding-bottom: calc(90px + env(safe-area-inset-bottom, 16px));
      }

      .exercise-item {
        --background: transparent;
        --color: var(--text-primary);
        --border-color: var(--border-subtle);
        --padding-start: 12px;
        --padding-end: 12px;
        --inner-padding-end: 12px;
        margin-bottom: 4px;
        border-radius: 12px;
        transition: all 0.2s ease;
        cursor: pointer;
      }

      /* Antes era 5% de blanco sobre la tinta: --bg-surface es el token
         que más se le acerca y mantiene el mismo pulso sutil. */
      .exercise-item:active {
        transform: scale(0.98);
        --background: var(--bg-surface);
      }

      .exercise-icon {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.3rem;
        margin-right: 12px;
        flex-shrink: 0;
        transition: all 0.2s ease;
      }

      .exercise-name {
        font-weight: 600 !important;
        font-size: 1rem !important;
        color: var(--text-primary) !important;
        margin-bottom: 4px !important;
        letter-spacing: -0.01em;
        text-transform: capitalize;
      }

      .exercise-meta {
        font-size: var(--text-xs) !important;
        display: flex;
        align-items: center;
        gap: 0.3rem;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem 1rem;
        color: var(--text-muted);
        gap: 1rem;
      }
    `,
  ],
})
export class ExplorerPage implements OnInit {
  facade = inject(ExerciseFacade);

  gsap = inject(GsapAnimationsService);
  private host = inject(ElementRef<HTMLElement>);

  muscleGroups = MUSCLE_GROUPS;
  selectedGroup = signal('');
  searchQuery = signal('');

  displayLimit = signal(30);

  selectedExercise = signal<ExerciseDefinition | null>(null);
  drawerOpen = signal(false);

  /** Distingue "no encontré nada" de "no hay nada cargado". */
  hayFiltroActivo = computed(() => this.searchQuery().trim() !== '' || this.selectedGroup() !== '');

  ngOnInit() {
    this.facade.loadExercises('', '');
  }

  ngAfterViewInit() {
    this.gsap.animateTierEnter(this.host.nativeElement.querySelector('.tier-trabajo'));
  }

  limpiarFiltros() {
    this.searchQuery.set('');
    this.selectedGroup.set('');
    this.displayLimit.set(30);
    this.facade.loadExercises('', '');
  }

  onSearch(event: any) {
    // Se guarda tal como se escribe: el buscador muestra este valor y, si
    // se normalizara, le borraría al usuario el espacio mientras escribe.
    // ExerciseFacade ya normaliza al filtrar.
    this.searchQuery.set(event.detail.value ?? '');
    this.displayLimit.set(30);
    this.facade.loadExercises(this.searchQuery(), this.selectedGroup());
  }

  selectGroup(groupValue: string) {
    this.selectedGroup.set(groupValue);
    this.displayLimit.set(30);
    this.facade.loadExercises(this.searchQuery(), this.selectedGroup());
  }

  loadMore(event: any) {
    this.displayLimit.update((val) => val + 30);
    event.target.complete();

    if (this.displayLimit() >= this.facade.exercises().length) {
      event.target.disabled = true;
    }
  }

  openDetail(exercise: ExerciseDefinition) {
    this.selectedExercise.set(exercise);
    this.drawerOpen.set(true);
  }

  closeDetail() {
    this.drawerOpen.set(false);
    setTimeout(() => this.selectedExercise.set(null), 300); // Clear after animation
  }
}
