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
  imports: [
    IonContent,
    IonSpinner,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    DrawerComponent,
    IconComponent,
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
        <button class="close-pill-btn" (click)="close.emit()" aria-label="Cerrar modal">
          <app-icon name="x" [size]="20" />
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
          <button class="clear-search-btn" (click)="clearSearch(searchInput)">
            <app-icon name="x-circle" [size]="18" />
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
            {{ facade.exercises().length }} ejercicios disponibles
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
            <div class="exercise-row-card">
              <div
                class="flex-1 min-w-0 flex items-center gap-3"
                (click)="selectExercise(exercise)"
              >
                <div class="exercise-thumb" [style]="getIconStyle(exercise.muscle)">
                  <app-icon
                    [name]="getIconName(exercise.muscle, exercise.category)"
                    [size]="24"
                  ></app-icon>
                </div>

                <div class="exercise-details min-w-0">
                  <h3 class="exercise-name capitalize truncate">
                    {{ exercise.name_es || exercise.name_en }}
                  </h3>
                  <p
                    class="exercise-meta m-0 text-xs flex items-center gap-1.5 capitalize truncate"
                  >
                    <span class="text-primary font-semibold shrink-0">{{ exercise.muscle }}</span>
                    <span class="text-muted shrink-0">·</span>
                    <span class="text-muted truncate">{{ exercise.equipment }}</span>
                    <span class="text-muted shrink-0">·</span>
                    <span class="text-secondary shrink-0">{{ exercise.category }}</span>
                  </p>
                </div>
              </div>
              <button
                class="w-10 h-10 flex items-center justify-center shrink-0 cursor-pointer transition-all active:scale-90"
                style="border-radius: 50%; background: rgba(255,255,255,0.06); border: none;"
                (click)="openDetail(exercise); $event.stopPropagation()"
              >
                <app-icon name="info" [size]="18" style="color: var(--text-muted);"></app-icon>
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
        <div class="flex flex-col gap-6 pb-8">
          <!-- Hero Images or Placeholder -->
          @if (exercise.images && exercise.images.length > 0) {
            <div
              class="rounded-xl overflow-hidden flex relative min-h-[160px]"
              style="background: var(--bg-elevated); border: 1px solid var(--border-subtle);"
            >
              @for (img of exercise.images; track img) {
                <div class="flex-1 w-1/2 relative bg-white flex items-center justify-center">
                  <ion-spinner color="primary" class="absolute z-0"></ion-spinner>
                  <img
                    [src]="img"
                    alt="Ejecución de {{ exercise.name_es }}"
                    class="w-full h-full object-cover relative z-10 transition-opacity duration-300 opacity-0"
                    (load)="$event.target.classList.remove('opacity-0')"
                    loading="lazy"
                  />
                </div>
              }
            </div>
          } @else {
            <div
              class="rounded-xl p-6 flex flex-col items-center justify-center min-h-[160px] relative overflow-hidden"
              style="background: var(--bg-elevated); border: 1px solid var(--border-subtle);"
            >
              <app-icon
                [name]="getIconName(exercise.muscle, exercise.category)"
                [size]="64"
                class="z-10 filter drop-shadow-lg text-primary"
              ></app-icon>
              <div
                class="absolute inset-0 opacity-10 pointer-events-none"
                style="background: radial-gradient(circle at center, var(--color-primary), transparent 70%);"
              ></div>
            </div>
          }

          <!-- Stats Grid -->
          <div class="grid grid-cols-2 gap-4">
            <div
              class="p-4 flex flex-col gap-1 rounded-xl"
              style="background: var(--bg-elevated); border: 1px solid var(--border-subtle);"
            >
              <span
                class="text-xs font-semibold uppercase tracking-wider"
                style="color: var(--text-muted)"
                >Músculo</span
              >
              <span
                class="text-base font-bold capitalize flex items-center gap-2"
                style="color: var(--color-primary)"
              >
                <app-icon name="activity" [size]="16" /> {{ exercise.muscle }}
              </span>
            </div>

            <div
              class="p-4 flex flex-col gap-1 rounded-xl"
              style="background: var(--bg-elevated); border: 1px solid var(--border-subtle);"
            >
              <span
                class="text-xs font-semibold uppercase tracking-wider"
                style="color: var(--text-muted)"
                >Equipo</span
              >
              <span
                class="text-base font-bold capitalize flex items-center gap-2"
                style="color: var(--text-primary)"
              >
                <app-icon name="dumbbell" [size]="16" /> {{ exercise.equipment }}
              </span>
            </div>

            <div
              class="p-4 flex flex-col gap-1 col-span-2 rounded-xl"
              style="background: var(--color-tertiary-tint, rgba(168, 85, 247, 0.08)); border: 1px solid var(--color-tertiary-tint, rgba(168, 85, 247, 0.2));"
            >
              <span
                class="text-xs font-semibold uppercase tracking-wider"
                style="color: var(--color-tertiary, #c084fc)"
                >Categoría</span
              >
              <span
                class="text-base font-bold capitalize flex items-center gap-2"
                style="color: var(--color-tertiary, #c084fc)"
              >
                <app-icon name="tag" [size]="16" /> {{ exercise.category }}
              </span>
            </div>
          </div>

          <!-- Instructions / Step-by-Step Guide -->
          <div class="flex flex-col gap-4 mt-2">
            @let steps = getInstructions(exercise.instructions_es || exercise.instructions_en);

            <div
              class="flex items-center justify-between pb-1 border-b"
              style="border-color: var(--border-subtle)"
            >
              <div class="flex items-center gap-2">
                <div
                  class="w-8 h-8 rounded-lg flex items-center justify-center"
                  style="background: var(--color-primary-tint); color: var(--color-primary)"
                >
                  <app-icon name="list-checks" [size]="18"></app-icon>
                </div>
                <div>
                  <h3 class="text-sm font-bold m-0" style="color: var(--text-primary)">
                    Guía de Ejecución
                  </h3>
                  <span class="text-[11px]" style="color: var(--text-muted)"
                    >Instrucciones paso a paso del Coach</span
                  >
                </div>
              </div>
              @if (steps.length > 0) {
                <span
                  class="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style="background: var(--bg-elevated); color: var(--color-primary); border: 1px solid var(--border-subtle)"
                >
                  {{ steps.length }} pasos
                </span>
              }
            </div>

            <div class="flex flex-col gap-3">
              @if (isEnglish(exercise.instructions_es, exercise.instructions_en)) {
                <div
                  class="p-3 rounded-xl flex items-center gap-3"
                  style="background: rgba(234, 179, 8, 0.1); border: 1px solid rgba(234, 179, 8, 0.25); color: var(--color-warning, #eab308);"
                >
                  <app-icon name="alert-triangle" [size]="18" />
                  <span class="text-xs font-semibold leading-snug"
                    >Instrucción en idioma original (pendiente de traducción).</span
                  >
                </div>
              }

              @if (steps.length > 0) {
                <!-- Connected Stepper / Timeline -->
                <div class="relative pl-6 flex flex-col gap-3.5 my-1">
                  <!-- Vertical timeline track line -->
                  <div
                    class="absolute left-2.5 top-3 bottom-3 w-0.5 rounded-full opacity-60"
                    style="background: linear-gradient(to bottom, var(--color-primary), var(--border-subtle))"
                  ></div>

                  @for (step of steps; track $index) {
                    @let phase = getStepPhase($index, steps.length);
                    <div class="relative flex items-start gap-3">
                      <!-- Stepper Node Dot -->
                      <div
                        class="absolute -left-6 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 z-10 shadow-sm"
                        [style.background]="
                          $first
                            ? 'var(--color-primary)'
                            : $last
                              ? 'var(--state-success)'
                              : 'var(--bg-surface)'
                        "
                        [style.color]="$first || $last ? '#000' : 'var(--text-primary)'"
                        [style.border]="
                          $first || $last ? 'none' : '1.5px solid var(--color-primary)'
                        "
                      >
                        {{ $index + 1 }}
                      </div>

                      <!-- Step Card -->
                      <div
                        class="p-3.5 rounded-xl flex-1 flex flex-col gap-1.5 transition-all shadow-sm"
                        style="background: var(--bg-elevated); border: 1px solid var(--border-subtle)"
                      >
                        <div class="flex items-center gap-1.5">
                          <span
                            class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                            [style.background]="
                              $first
                                ? 'var(--color-primary-tint)'
                                : $last
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : 'rgba(255,255,255,0.05)'
                            "
                            [style.color]="
                              $first
                                ? 'var(--color-primary)'
                                : $last
                                  ? 'var(--state-success)'
                                  : 'var(--text-muted)'
                            "
                          >
                            {{ phase.label }}
                          </span>
                        </div>
                        <p
                          class="text-xs sm:text-sm leading-relaxed m-0 font-normal"
                          style="color: var(--text-primary)"
                        >
                          {{ step }}
                        </p>
                      </div>
                    </div>
                  }
                </div>

                <!-- Coach Pro-Tip Callout -->
                <div
                  class="p-3.5 rounded-xl flex items-start gap-3 mt-1"
                  style="background: rgba(var(--color-primary-rgb, 59, 130, 246), 0.06); border: 1px dashed var(--color-primary)"
                >
                  <div
                    class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style="background: var(--color-primary-tint); color: var(--color-primary)"
                  >
                    <app-icon name="info" [size]="16"></app-icon>
                  </div>
                  <div class="flex flex-col gap-0.5">
                    <span
                      class="text-xs font-bold uppercase tracking-wider"
                      style="color: var(--color-primary)"
                      >Consejo de Técnica</span
                    >
                    <span class="text-xs leading-relaxed" style="color: var(--text-secondary)">
                      Controlá el tempo en la bajada (fase excéntrica) y evitá usar el impulso o
                      balanceo para maximizar la activación muscular.
                    </span>
                  </div>
                </div>
              } @else {
                <div
                  class="p-6 flex flex-col items-center justify-center text-center gap-3 rounded-xl"
                  style="background: var(--bg-elevated); border: 1px solid var(--border-subtle);"
                >
                  <app-icon name="info" [size]="24" color="var(--text-muted)" />
                  <p class="text-sm m-0" style="color: var(--text-muted)">
                    No hay instrucciones detalladas para este ejercicio.
                  </p>
                </div>
              }
            </div>
          </div>

          <button
            class="w-full mt-4 py-3 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
            style="background: var(--color-primary); color: #000; border: none; box-shadow: 0 4px 14px rgba(var(--color-primary-rgb, 59, 130, 246), 0.4);"
            (click)="selectExercise(exercise)"
          >
            <app-icon name="check" [size]="20"></app-icon>
            Seleccionar Ejercicio
          </button>
        </div>
      }
    </app-drawer>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #0d0d11;
        color: var(--text-primary);
        font-family: var(--font-body, system-ui, sans-serif);
      }

      /* === MODAL HEADER === */
      .selector-modal-header {
        background: #111116;
        border-bottom: 1px solid rgba(255, 255, 255, 0.07);
        padding: 0.75rem 1rem 0 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        flex-shrink: 0;
      }

      .modal-handle {
        width: 36px;
        height: 4px;
        border-radius: 2px;
        background: rgba(255, 255, 255, 0.2);
        margin: 0 auto 0.25rem auto;
      }

      .header-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .header-titles {
        display: flex;
        flex-direction: column;
      }

      .modal-title {
        font-family: var(--font-display);
        font-size: 1.25rem;
        font-weight: 800;
        color: var(--text-primary);
        margin: 0;
        letter-spacing: -0.02em;
      }

      .modal-subtitle {
        font-size: 0.75rem;
        color: #71717a;
        margin-top: 0.1rem;
      }

      .close-pill-btn {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #a1a1aa;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .close-pill-btn:active {
        transform: scale(0.92);
        background: rgba(255, 255, 255, 0.15);
        color: var(--text-primary);
      }

      /* === SEARCH BOX === */
      .search-box {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        height: 44px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 0 0.85rem;
        transition: all 0.2s ease;
      }
      .search-box:focus-within {
        background: rgba(59, 130, 246, 0.04);
        border-color: var(--ds-brand);
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
      }
      .search-icon {
        color: var(--text-muted);
        flex-shrink: 0;
      }
      .native-search-input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        color: var(--text-primary);
        font-size: 0.9rem;
      }
      .native-search-input::placeholder {
        color: #71717a;
      }
      .clear-search-btn {
        background: transparent;
        border: none;
        color: #71717a;
        padding: 0;
        display: flex;
        cursor: pointer;
      }

      /* === CHIPS SCROLLBAR === */
      .chips-container {
        display: flex;
        gap: 0.5rem;
        overflow-x: auto;
        scrollbar-width: none;
        padding-bottom: 0.5rem;
      }
      .chips-container::-webkit-scrollbar {
        display: none;
      }

      .chip-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.45rem 0.85rem;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 18px;
        color: #a1a1aa;
        font-size: 0.8rem;
        font-weight: 600;
        white-space: nowrap;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .chip-pill:active {
        transform: scale(0.96);
      }
      .chip-pill.chip-active {
        background: var(--ds-brand);
        border-color: var(--ds-brand);
        color: var(--text-primary);
        box-shadow: 0 2px 10px rgba(59, 130, 246, 0.35);
      }
      .chip-icon {
        font-size: 0.95rem;
      }

      .meta-status-bar {
        display: flex;
        align-items: center;
        padding-bottom: 0.5rem;
      }
      .count-label {
        font-size: 0.72rem;
        font-weight: 700;
        color: #71717a;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      /* === CONTENT LIST === */
      .modal-scroll-content {
        --background: #09090c;
      }

      .exercise-card-list {
        padding: 0.75rem 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .exercise-row-card {
        display: flex;
        align-items: center;
        gap: 0.85rem;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 14px;
        padding: 0.75rem 0.85rem;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .exercise-row-card:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.1);
      }
      .exercise-row-card:active {
        transform: scale(0.98);
        background: rgba(59, 130, 246, 0.08);
        border-color: rgba(59, 130, 246, 0.3);
      }

      .exercise-thumb {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: rgba(59, 130, 246, 0.1);
        border: 1px solid rgba(59, 130, 246, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.3rem;
        flex-shrink: 0;
      }

      .exercise-details {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
      }

      .exercise-name {
        font-size: 0.92rem;
        font-weight: 700;
        color: var(--text-primary);
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        letter-spacing: -0.01em;
      }

      .exercise-badges-row {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        font-size: 0.75rem;
        color: #71717a;
      }

      .badge-muscle {
        color: var(--color-primary-hover);
        font-weight: 600;
      }

      .badge-dot {
        color: #52525b;
      }

      .badge-equip {
        color: #a1a1aa;
      }

      .exercise-category-tag {
        padding: 0.25rem 0.55rem;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
        font-size: 0.68rem;
        font-weight: 600;
        color: #a1a1aa;
        text-transform: capitalize;
        flex-shrink: 0;
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
        color: #71717a;
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

  getIconName(muscle: string, category: string): string {
    const m = (muscle || '').toLowerCase();
    const c = (category || '').toLowerCase();
    if (m.includes('pecho') || m.includes('chest')) return 'shield-check';
    if (m.includes('espalda') || m.includes('back')) return 'layers';
    if (
      m.includes('pierna') ||
      m.includes('cuádriceps') ||
      m.includes('quad') ||
      m.includes('isquio') ||
      m.includes('femoral') ||
      m.includes('hamstring') ||
      m.includes('pantorrilla') ||
      m.includes('calves')
    )
      return 'activity';
    if (m.includes('hombro') || m.includes('shoulder') || m.includes('deltoid')) return 'dumbbell';
    if (m.includes('bíceps') || m.includes('bicep')) return 'activity';
    if (m.includes('tríceps') || m.includes('tricep')) return 'activity';
    if (m.includes('abdom') || m.includes('core')) return 'circle';
    if (m.includes('glúteo') || m.includes('glute')) return 'circle';
    if (c.includes('cardio')) return 'activity';
    return 'dumbbell';
  }

  getIconStyle(muscle: string): string {
    const m = (muscle || '').toLowerCase();
    if (m.includes('pecho') || m.includes('chest'))
      return 'background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: var(--state-error);'; // Red
    if (m.includes('espalda') || m.includes('back'))
      return 'background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); color: var(--state-success);'; // Emerald
    if (m.includes('pierna') || m.includes('quad') || m.includes('femoral') || m.includes('isquio'))
      return 'background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); color: var(--ds-brand);'; // Blue
    if (m.includes('hombro') || m.includes('shoulder'))
      return 'background: rgba(249, 115, 22, 0.1); border: 1px solid rgba(249, 115, 22, 0.2); color: #f97316;'; // Orange
    if (
      m.includes('bíceps') ||
      m.includes('tríceps') ||
      m.includes('bicep') ||
      m.includes('tricep')
    )
      return 'background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.2); color: #8b5cf6;'; // Violet
    if (m.includes('abdom') || m.includes('core'))
      return 'background: rgba(234, 179, 8, 0.1); border: 1px solid rgba(234, 179, 8, 0.2); color: #eab308;'; // Yellow
    if (m.includes('glúteo') || m.includes('glute'))
      return 'background: rgba(236, 72, 153, 0.1); border: 1px solid rgba(236, 72, 153, 0.2); color: #ec4899;'; // Pink

    // Default (e.g. Cardio or others)
    return 'background: rgba(161, 161, 170, 0.1); border: 1px solid rgba(161, 161, 170, 0.2); color: #a1a1aa;'; // Zinc/Gray
  }

  getInstructions(text: string | undefined): string[] {
    if (!text) return [];
    // Normalize literal \n, /n, \\n, and standard newlines
    const normalized = text
      .replace(/\\n/g, '\n')
      .replace(/\/n/g, '\n')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

    return normalized
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => s.replace(/^(\d+[\.\)]|\-|\*|Paso\s*\d+:?)\s*/i, ''));
  }

  getStepPhase(index: number, total: number): { label: string } {
    if (index === 0) return { label: 'Posición Inicial' };
    if (index === total - 1) return { label: 'Finalización' };
    return { label: `Paso ${index + 1}` };
  }

  isEnglish(es: string | undefined, en: string | undefined): boolean {
    if (!es) return true;
    if (es.trim() === en?.trim()) return true;
    return false;
  }
}
