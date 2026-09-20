import { Component, ChangeDetectionStrategy, inject, OnInit, output, signal } from '@angular/core';
import {
  IonContent,
  IonSpinner,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
} from '@ionic/angular';
import { ExerciseFacade, ExerciseDefinition } from '@core/facades/exercise.facade';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { IconComponent } from '@shared/components/icon/icon.component';
import { ExerciseDetailComponent } from '../components/exercise-detail/exercise-detail.component';
import { TranslateExercisePipe } from '@shared/pipes/translate-exercise.pipe';
import { addIcons } from 'ionicons';

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
  selector: 'app-exercise-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Tier 2 también desde la sesión activa: acá se busca, no se registra.
  host: { class: 'tier-trabajo' },
  imports: [
    IonContent,
    IonSpinner,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    DrawerComponent,
    IconComponent,
    ExerciseDetailComponent,
    TranslateExercisePipe,
  ],
  template: `
    <!-- Top Modal Header -->
    <div class="selector-modal-header">
      <div class="modal-handle"></div>

      <div class="header-row">
        <div class="header-titles">
          <h2 class="modal-title">Seleccionar Ejercicio</h2>
          <span class="modal-subtitle">Catálogo de ejercicios</span>
        </div>
        <button
          type="button"
          class="close-pill-btn"
          (click)="close.emit()"
          aria-label="Cerrar modal"
        >
          <app-icon name="x" [size]="20" [ariaHidden]="true" />
        </button>
      </div>

      <!-- Search Input Container -->
      <div class="search-box">
        <app-icon name="search" [size]="18" class="search-icon" />
        <input
          #searchInput
          type="text"
          class="native-search-input"
          placeholder="Buscar por nombre, músculo o equipo..."
          [value]="searchQuery()"
          (input)="onSearchInput($event)"
        />
        @if (searchQuery()) {
          <button
            type="button"
            class="clear-search-btn"
            aria-label="Borrar búsqueda"
            data-llm-action="limpiar-busqueda"
            (click)="clearSearch(searchInput)"
          >
            <app-icon name="x-circle" [size]="18" [ariaHidden]="true" />
          </button>
        }
      </div>

      <!-- Muscle Group Chips -->
      <div class="chips-container">
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

      <div class="meta-status-bar">
        <span class="count-label">
          @if (facade.loading()) {
            Buscando ejercicios...
          } @else {
            {{ facade.exercises().length }}
            {{
              facade.exercises().length === 1 ? 'ejercicio disponible' : 'ejercicios disponibles'
            }}
          }
        </span>
      </div>
    </div>

    <ion-content class="modal-scroll-content">
      @if (facade.loading()) {
        <div class="loading-state">
          <ion-spinner color="primary"></ion-spinner>
          <p>Consultando base de datos...</p>
        </div>
      } @else if (facade.exercises().length === 0) {
        <div class="empty-state">
          <app-icon name="search" [size]="40" />
          <h4>No encontramos ejercicios</h4>
          <p>Prueba con otros términos de búsqueda o selecciona "Todos".</p>
        </div>
      } @else {
        <div class="exercise-card-list">
          @for (exercise of facade.exercises().slice(0, displayLimit()); track exercise.id) {
            <!-- Sin miniatura, como el Catálogo (AC-05 de 0004): el ícono
                 se repetía entre grupos y lo que distinguía era un color
                 por músculo, con rojo de error y verde de éxito. -->
            <div class="exercise-row-card">
              <div class="exercise-details" (click)="selectExercise(exercise)">
                <h3 class="exercise-name">
                  {{ exercise.name_es || exercise.name_en }}
                </h3>
                <p class="exercise-meta">
                  <span class="meta-muscle">{{ exercise.muscle | translateExercise }}</span>
                  <span class="meta-fixed">·</span>
                  <span class="meta-equipment">{{ exercise.equipment | translateExercise }}</span>
                  <span class="meta-fixed">·</span>
                  <span class="meta-fixed">{{ exercise.category | translateExercise }}</span>
                </p>
              </div>
              <button
                type="button"
                class="info-btn"
                [attr.aria-label]="'Detalle de ' + (exercise.name_es || exercise.name_en)"
                (click)="openDetail(exercise); $event.stopPropagation()"
              >
                <app-icon name="info" [size]="18" [ariaHidden]="true" />
              </button>
            </div>
          }
        </div>
      }
      <ion-infinite-scroll (ionInfinite)="loadMore($event)">
        <ion-infinite-scroll-content
          loadingSpinner="bubbles"
          loadingText="Cargando más ejercicios..."
        ></ion-infinite-scroll-content>
      </ion-infinite-scroll>
      <div class="safe-scroll-bottom"></div>
    </ion-content>

    <!-- Drawer para Detalles del Ejercicio -->
    <app-drawer
      [isOpen]="!!selectedDetail()"
      [title]="selectedDetail()?.name_es || 'Detalle del ejercicio'"
      (closed)="closeDetail()"
    >
      @if (selectedDetail(); as exercise) {
        <app-exercise-detail [exercise]="exercise">
          <button
            type="button"
            class="detail-select-btn"
            data-llm-action="seleccionar-ejercicio"
            (click)="selectExercise(exercise)"
          >
            <app-icon name="check" [size]="20" [ariaHidden]="true" />
            Seleccionar Ejercicio
          </button>
        </app-exercise-detail>
      }
    </app-drawer>
  `,
  styles: [
    `
      /* Tinta sobre ember (7.0:1). Iba en negro puro con una sombra azul
         de una variable que no existe (spec 0007). */
      .detail-select-btn {
        width: 100%;
        min-height: var(--target-min);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-2);
        padding: var(--space-3) var(--space-4);
        border: none;
        border-radius: var(--radius-lg);
        background: var(--ds-brand);
        color: var(--color-primary-text);
        font-weight: 700;
        cursor: pointer;
      }
      .detail-select-btn:active {
        background: var(--color-primary-hover);
        transform: scale(0.98);
      }

      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        color: var(--text-primary);
        font-family: var(--font-body);
      }

      /* === ENCABEZADO DEL MODAL === */
      .selector-modal-header {
        border-bottom: 1px solid var(--border-subtle);
        padding: var(--space-3) var(--space-4) 0;
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        flex-shrink: 0;
      }

      .modal-handle {
        width: 36px;
        height: 4px;
        border-radius: var(--radius-full);
        background: var(--border-strong);
        margin: 0 auto var(--space-1);
      }

      .header-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-3);
      }

      .header-titles {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      /* Iba a 20px y en peso 800: debajo del piso de Anton, y con un
         peso que no tiene, así que el navegador la engordaba a mano. */
      .modal-title {
        font-family: var(--font-display);
        font-size: var(--font-display-floor);
        font-weight: var(--font-regular);
        line-height: 1.1;
        letter-spacing: 0.005em;
        color: var(--text-primary);
        margin: 0;
        text-wrap: balance;
      }

      .modal-subtitle {
        font-size: var(--text-xs);
        color: var(--text-muted);
        margin-top: var(--space-1);
      }

      /* Medía 32px. */
      .close-pill-btn {
        width: var(--target-min);
        height: var(--target-min);
        flex-shrink: 0;
        border-radius: var(--radius-full);
        background: var(--bg-surface);
        border: 1px solid var(--border-default);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-secondary);
        cursor: pointer;
        transition: transform 0.15s ease;
      }
      .close-pill-btn:active {
        transform: scale(0.92);
        background: var(--bg-elevated);
        color: var(--text-primary);
      }

      /* === BUSCADOR === */
      .search-box {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        min-height: var(--target-min);
        background: var(--bg-surface);
        border: 1px solid var(--border-default);
        border-radius: 12px;
        padding-left: var(--space-3);
        transition: border-color 0.2s ease;
      }
      /* El foco iba en el azul de la marca anterior. */
      .search-box:focus-within {
        border-color: var(--ds-brand);
        box-shadow: var(--shadow-focus);
      }
      .search-icon {
        color: var(--text-muted);
        flex-shrink: 0;
      }
      /* 16px: con menos, iOS hace zoom al enfocar el campo. */
      .native-search-input {
        flex: 1;
        min-width: 0;
        min-height: var(--target-min);
        background: transparent;
        border: none;
        outline: none;
        color: var(--text-primary);
        font-size: 1rem;
      }
      .native-search-input::placeholder {
        color: var(--text-muted);
      }
      .clear-search-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: var(--target-min);
        height: var(--target-min);
        flex-shrink: 0;
        background: transparent;
        border: none;
        color: var(--text-muted);
        padding: 0;
        cursor: pointer;
      }

      /* === CHIPS: los mismos valores que el Catálogo (0004) === */
      .chips-container {
        display: flex;
        gap: var(--space-2);
        overflow-x: auto;
        scrollbar-width: none;
        padding-bottom: var(--space-2);
      }
      .chips-container::-webkit-scrollbar {
        display: none;
      }

      /* Medían 30px de alto y 12.8px de texto. */
      .chip-pill {
        min-height: var(--tier-target, var(--target-min));
        flex-shrink: 0;
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
        transition: transform 0.15s ease;
      }
      .chip-pill:active {
        transform: scale(0.96);
      }
      /* Tinta sobre ember (7.0:1), sin el resplandor azul. */
      .chip-pill.chip-active {
        background: var(--ds-brand);
        border-color: var(--ds-brand);
        color: var(--color-primary-text);
      }
      .chip-icon {
        font-size: var(--text-sm);
      }

      .meta-status-bar {
        display: flex;
        align-items: center;
        padding-bottom: var(--space-2);
      }
      /* Medía 11.5px. */
      .count-label {
        font-size: var(--text-xs);
        font-weight: 700;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      /* === LISTA === */
      .modal-scroll-content {
        --background: var(--bg-base);
      }

      .exercise-card-list {
        padding: var(--space-2);
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
      }

      /* Fila como la del Catálogo: sin tarjeta ni borde, porque se
         repite decenas de veces (regla de densidad). */
      .exercise-row-card {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        border-radius: 12px;
        padding: var(--space-2) var(--space-1) var(--space-2) var(--space-3);
        cursor: pointer;
        transition: transform 0.15s ease;
      }
      .exercise-row-card:active {
        transform: scale(0.98);
        background: var(--bg-surface);
      }

      .exercise-details {
        flex: 1;
        min-width: 0;
        min-height: var(--target-min);
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: var(--space-1);
      }

      .exercise-name {
        font-family: var(--font-body);
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        letter-spacing: -0.01em;
        text-transform: capitalize;
      }

      .exercise-meta {
        margin: 0;
        display: flex;
        align-items: center;
        gap: 0.3rem;
        min-width: 0;
        font-size: var(--text-xs);
        color: var(--text-muted);
        white-space: nowrap;
        text-transform: capitalize;
      }
      .meta-muscle {
        flex-shrink: 0;
        color: var(--text-secondary);
        font-weight: 600;
      }
      .meta-fixed {
        flex-shrink: 0;
      }
      .meta-equipment {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* Medía 40px, con un blanco al 6% escrito en línea. */
      .info-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: var(--target-min);
        height: var(--target-min);
        flex-shrink: 0;
        border-radius: var(--radius-full);
        background: var(--bg-surface);
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        transition: transform 0.15s ease;
      }
      .info-btn:active {
        transform: scale(0.9);
        background: var(--bg-elevated);
        color: var(--text-primary);
      }

      .loading-state,
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem 1.5rem;
        text-align: center;
        gap: 0.75rem;
        color: var(--text-muted);
      }
      .empty-state h4 {
        margin: 0;
        color: var(--text-primary);
        font-size: 1.05rem;
        font-weight: 700;
      }
      .empty-state p,
      .loading-state p {
        margin: 0;
        color: var(--text-muted);
        font-size: 0.85rem;
        max-width: 260px;
      }

      .safe-scroll-bottom {
        height: 3rem;
      }
    `,
  ],
})
export class ExerciseSelectorComponent implements OnInit {
  facade = inject(ExerciseFacade);

  exerciseSelected = output<ExerciseDefinition>();
  close = output<void>();

  muscleGroups = MUSCLE_GROUPS;
  selectedGroup = signal('');
  searchQuery = signal('');
  selectedDetail = signal<ExerciseDefinition | null>(null);

  displayLimit = signal(30);

  constructor() {
    addIcons({
      informationCircleOutline:
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" class="ionicon" viewBox="0 0 512 512"><path d="M256 56C145.72 56 56 145.72 56 256s89.72 200 200 200 200-89.72 200-200S366.28 56 256 56zm0 336c-75 0-136-61-136-136S181 120 256 120s136 61 136 136-61 136-136 136z" fill="currentColor"/><path d="M256 160a24 24 0 1024 24 24 24 0 00-24-24zm16 192h-32v-96h32z" fill="currentColor"/></svg>',
    });
  }

  ngOnInit() {
    this.facade.loadExercises('', '');
  }

  onSearchInput(event: any) {
    const val = event.target.value || '';
    this.searchQuery.set(val);
    this.displayLimit.set(30);
    this.facade.loadExercises(this.searchQuery(), this.selectedGroup());
  }

  clearSearch(inputEl: HTMLInputElement) {
    inputEl.value = '';
    this.searchQuery.set('');
    this.displayLimit.set(30);
    this.facade.loadExercises('', this.selectedGroup());
  }

  selectGroup(groupValue: string) {
    this.selectedGroup.set(groupValue);
    this.displayLimit.set(30);
    this.facade.loadExercises(this.searchQuery(), groupValue);
  }

  loadMore(event: any) {
    this.displayLimit.update((val) => val + 30);
    event.target.complete();

    if (this.displayLimit() >= this.facade.exercises().length) {
      event.target.disabled = true;
    }
  }

  selectExercise(exercise: ExerciseDefinition) {
    this.exerciseSelected.emit(exercise);
  }

  openDetail(exercise: ExerciseDefinition) {
    this.selectedDetail.set(exercise);
  }

  closeDetail() {
    this.selectedDetail.set(null);
  }
}
