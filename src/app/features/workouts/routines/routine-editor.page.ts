import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  input,
  output,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonButtons,
  IonBackButton,
  IonModal,
  IonReorderGroup,
  IonReorder,
  ItemReorderEventDetail,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, timerOutline, flameOutline, checkmarkOutline } from 'ionicons/icons';
import { RoutineFacade } from '@core/facades/routine.facade';
import { ExerciseSelectorComponent } from '../../explorer/exercise-selector/exercise-selector.component';
import { IconComponent } from '@shared/components/icon/icon.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { CreateRoutineDto, RoutineSetType } from '@core/models/routine.model';
import { ExerciseDefinition } from '@core/facades/exercise.facade';

interface DraftSet {
  id: string;
  set_number: number;
  set_type: RoutineSetType;
  target_reps: string;
}

interface DraftExercise {
  id: string; // exercise_id
  name: string;
  rest_seconds: number;
  notes: string;
  sets: DraftSet[];
}

@Component({
  selector: 'app-routine-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonButtons,
    IonBackButton,
    IonModal,
    IonReorderGroup,
    IonReorder,
    IconComponent,
    EmptyStateComponent,
    ExerciseSelectorComponent,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="editor-toolbar">
        <ion-buttons slot="start">
          @if (isInline()) {
            <ion-button color="medium" class="close-btn" (click)="cancelInline.emit()">
              <ion-icon name="close-outline"></ion-icon>
            </ion-button>
          } @else {
            <ion-back-button defaultHref="/app/workouts" color="medium"></ion-back-button>
          }
        </ion-buttons>
        <ion-title class="editor-title">{{
          isEditMode() ? 'Editar Rutina' : 'Nueva Rutina'
        }}</ion-title>
        <ion-buttons slot="end">
          <ion-button
            class="save-btn"
            data-llm-action="guardar-rutina"
            (click)="saveRoutine()"
            [disabled]="!canSave() || facade.isLoading()"
            color="primary"
          >
            @if (facade.isLoading()) {
              Guardando...
            } @else {
              {{ isEditMode() ? 'Actualizar' : 'Guardar' }}
            }
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding tier-trabajo">
      <div class="editor-container">
        <!-- Nombre y Notas Generales -->
        <div class="meta-card">
          <div class="input-group">
            <label class="field-label">Nombre de la rutina *</label>
            <input
              type="text"
              class="custom-input title-input"
              placeholder="Ej. Torso Pesado - Hipertrofia"
              [value]="name()"
              (input)="name.set($any($event.target).value)"
            />
          </div>

          <div class="input-group">
            <label class="field-label">Notas o descripción general (opcional)</label>
            <textarea
              class="custom-input textarea-input"
              placeholder="Ej. Descansar 2 minutos en compuestos y foco en fase excéntrica..."
              [value]="notes()"
              (input)="notes.set($any($event.target).value)"
              rows="3"
            ></textarea>
          </div>
        </div>

        <!-- Sección de Ejercicios -->
        <div class="exercises-section">
          <div class="section-top">
            <div>
              <h3 class="section-heading">Ejercicios y Series</h3>
              <p class="section-subheading">Configura series, tipos y descansos sugeridos</p>
            </div>
            <button type="button" class="add-exercise-btn" (click)="isSelectorOpen.set(true)">
              <app-icon name="plus" [size]="16" [ariaHidden]="true" />
              <span>Añadir</span>
            </button>
          </div>

          @if (exercises().length === 0) {
            <app-empty-state
              class="empty-exercises"
              icon="dumbbell"
              message="Sin ejercicios en la rutina"
              subtitle='Presiona "Añadir" para incluir ejercicios a esta plantilla.'
            />
          } @else {
            <ion-reorder-group
              [disabled]="false"
              (ionItemReorder)="handleReorder($any($event))"
              class="exercises-list"
            >
              @for (ex of exercises(); track ex.id; let exIndex = $index) {
                <div class="exercise-card">
                  <!-- Header del ejercicio -->
                  <!-- El nombre a lo ancho, como título de la tarjeta; entre
                       cuatro controles de 44 quedaba en cuatro líneas. -->
                  <div class="ex-card-header">
                    <span class="ex-index">{{ exIndex + 1 }}</span>
                    <h4 class="ex-name">{{ ex.name }}</h4>
                  </div>
                  <div class="ex-toolbar">
                    <ion-reorder class="drag-handle" title="Arrastrar para reordenar">
                      <app-icon name="menu" [size]="18" [ariaHidden]="true"></app-icon>
                    </ion-reorder>
                    <span class="toolbar-spacer"></span>
                    <button
                      type="button"
                      class="icon-btn"
                      [disabled]="exIndex === 0"
                      (click)="moveExercise(exIndex, -1)"
                      title="Mover arriba"
                    >
                      <app-icon name="chevron-up" [size]="18" [ariaHidden]="true"></app-icon>
                    </button>
                    <button
                      type="button"
                      class="icon-btn"
                      [disabled]="exIndex === exercises().length - 1"
                      (click)="moveExercise(exIndex, 1)"
                      title="Mover abajo"
                    >
                      <app-icon name="chevron-down" [size]="18" [ariaHidden]="true"></app-icon>
                    </button>
                    <button
                      type="button"
                      class="icon-btn danger"
                      (click)="removeExercise(ex.id)"
                      title="Eliminar ejercicio"
                    >
                      <app-icon name="x" [size]="20" [ariaHidden]="true" />
                    </button>
                  </div>

                  <!-- Descanso y Notas -->
                  <div class="ex-options-row">
                    <div class="rest-selector-group">
                      <span class="option-label">
                        <app-icon name="clock" [size]="13"></app-icon> Descanso:
                      </span>
                      <div class="rest-pills">
                        @for (sec of [60, 90, 120, 180]; track sec) {
                          <button
                            type="button"
                            class="rest-pill"
                            [class.active]="ex.rest_seconds === sec"
                            (click)="updateRestSeconds(ex.id, sec)"
                          >
                            {{ sec < 60 ? sec + 's' : sec / 60 + 'm' }}
                          </button>
                        }
                      </div>
                    </div>
                  </div>

                  <!-- Tabla de Series -->
                  <div class="sets-table">
                    <div class="sets-header">
                      <span class="col-num">SERIE</span>
                      <span class="col-type">TIPO</span>
                      <span class="col-reps">OBJETIVO REPS</span>
                      <span class="col-action"></span>
                    </div>

                    <div class="sets-rows">
                      @for (set of ex.sets; track set.id; let sIndex = $index) {
                        <div class="set-row">
                          <!-- Número de serie -->
                          <span class="set-num-label">{{ sIndex + 1 }}</span>

                          <!-- Badge / Selector de Tipo de Serie -->
                          <div class="type-cell">
                            <button
                              type="button"
                              class="set-type-badge {{ set.set_type }}"
                              (click)="cycleSetType(ex.id, set.id)"
                              title="Toca para cambiar: Normal, Calentamiento, Dropset, Fallo"
                            >
                              {{ getSetTypeLabel(set.set_type) }}
                            </button>
                          </div>

                          <!-- Rango de Reps Objetivo (Guía visual) -->
                          <div class="reps-cell">
                            <input
                              type="text"
                              class="reps-input"
                              placeholder="ej. 8-12"
                              [value]="set.target_reps"
                              (input)="
                                updateSetTargetReps(ex.id, set.id, $any($event.target).value)
                              "
                            />
                          </div>

                          <!-- Eliminar serie -->
                          <div class="action-cell">
                            @if (ex.sets.length > 1) {
                              <button
                                type="button"
                                class="icon-btn danger"
                                (click)="removeSet(ex.id, set.id)"
                                title="Eliminar serie"
                              >
                                <app-icon name="trash-2" [size]="18" [ariaHidden]="true" />
                              </button>
                            }
                          </div>
                        </div>
                      }
                    </div>

                    <!-- Botón agregar serie -->
                    <button type="button" class="add-set-btn" (click)="addSet(ex.id)">
                      + Añadir Serie
                    </button>
                  </div>
                </div>
              }
            </ion-reorder-group>
          }
        </div>
      </div>
    </ion-content>

    <!-- Modal de Selección de Ejercicios -->
    <ion-modal [isOpen]="isSelectorOpen()" (didDismiss)="isSelectorOpen.set(false)">
      <ng-template>
        <app-exercise-selector
          (exerciseSelected)="onExerciseSelected($event)"
          (close)="isSelectorOpen.set(false)"
        >
        </app-exercise-selector>
      </ng-template>
    </ion-modal>
  `,
  styles: [
    `
      /* Tier 2 — Trabajo (spec 0012): objetivos de 44px, color solo
         para estado. */

      /* === CABECERA === */
      .editor-toolbar {
        --background: var(--bg-base);
      }
      .editor-title {
        font-weight: var(--font-bold);
        color: var(--text-primary);
      }
      /* "Guardar" medía 32px. */
      .save-btn,
      .close-btn {
        min-height: var(--target-min);
        font-weight: var(--font-bold);
      }

      .editor-container {
        max-width: 620px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: var(--space-5);
        padding-bottom: 3rem;
      }

      /* === NOMBRE Y NOTAS === */
      .meta-card {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
        padding: var(--space-4);
        background: var(--bg-surface);
        border: var(--border-tier3) solid var(--border-subtle);
        border-radius: var(--radius-lg);
      }
      .input-group {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }
      /* Medían 12.5px. */
      .field-label {
        font-size: var(--text-xs);
        font-weight: var(--font-bold);
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      /* 16px o más: con menos, iOS hace zoom al tocar el campo. Las
         notas medían 14px. */
      .custom-input {
        min-height: var(--target-min);
        padding: var(--space-3);
        background: var(--bg-elevated);
        border: var(--border-tier3) solid var(--border-default);
        border-radius: 10px;
        color: var(--text-primary);
        font-family: inherit;
        font-size: var(--text-base);
        outline: none;
        transition: border-color 0.15s ease;
      }
      .custom-input:focus {
        border-color: var(--ds-brand);
      }
      .title-input {
        font-size: var(--text-lg);
        font-weight: var(--font-bold);
      }
      .textarea-input {
        resize: none;
        line-height: 1.4;
      }

      /* === EJERCICIOS === */
      .exercises-section {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
      }
      .section-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-3);
      }
      .section-heading {
        margin: 0;
        font-size: var(--text-lg);
        font-weight: var(--font-bold);
        color: var(--text-primary);
      }
      .section-subheading {
        margin: 2px 0 0;
        font-size: var(--text-xs);
        color: var(--text-muted);
      }
      /* Hueso sobre ember daba 2.9:1; tinta da 7.0:1. Sin la sombra
         azul. Medía 30px. */
      .add-exercise-btn {
        flex-shrink: 0;
        min-height: var(--target-min);
        display: flex;
        align-items: center;
        gap: var(--space-1);
        padding: 0 var(--space-4);
        background: var(--ds-brand);
        color: var(--color-primary-text);
        border: none;
        border-radius: 10px;
        font-size: var(--text-sm);
        font-weight: var(--font-bold);
        cursor: pointer;
      }
      .add-exercise-btn:active {
        transform: scale(0.96);
        background: var(--color-primary-hover);
      }

      .empty-exercises {
        background: var(--bg-surface);
        border: var(--border-tier3) dashed var(--border-default);
        border-radius: var(--radius-lg);
      }

      /* === TARJETA DE EJERCICIO === */
      .exercises-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
      }
      .exercise-card {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        padding: var(--space-3);
        background: var(--bg-surface);
        border: var(--border-tier3) solid var(--border-subtle);
        border-radius: var(--radius-lg);
      }
      .ex-card-header {
        display: flex;
        align-items: baseline;
        gap: var(--space-2);
      }
      .ex-toolbar {
        display: flex;
        align-items: center;
        gap: var(--space-1);
        margin: calc(-1 * var(--space-2)) 0;
      }
      .toolbar-spacer {
        flex: 1;
      }
      /* Iba en un círculo azul. */
      .ex-index {
        flex-shrink: 0;
        font-family: var(--font-data);
        font-weight: var(--font-semibold);
        font-variant-numeric: tabular-nums;
        color: var(--text-muted);
      }
      .ex-name {
        margin: 0;
        font-size: var(--text-base);
        font-weight: var(--font-bold);
        color: var(--text-primary);
        overflow-wrap: anywhere;
      }
      /* Subir, bajar y quitar medían 28px; borrar serie, 20. */
      .icon-btn {
        flex-shrink: 0;
        width: var(--target-min);
        height: var(--target-min);
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        border-radius: 10px;
        color: var(--text-secondary);
        cursor: pointer;
      }
      .icon-btn:active:not(:disabled) {
        background: var(--bg-elevated);
      }
      .icon-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }
      .icon-btn.danger {
        color: var(--text-muted);
      }
      .icon-btn.danger:active {
        color: var(--state-error);
      }
      /* Medía 23×19. */
      .drag-handle {
        flex-shrink: 0;
        width: var(--target-min);
        height: var(--target-min);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-muted);
        cursor: grab;
      }

      /* === DESCANSO === */
      .ex-options-row {
        display: flex;
        align-items: center;
      }
      .rest-selector-group {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--space-2);
      }
      /* Medía 11.5px. */
      .option-label {
        display: flex;
        align-items: center;
        gap: var(--space-1);
        font-size: var(--text-xs);
        font-weight: var(--font-bold);
        color: var(--text-muted);
        text-transform: uppercase;
      }
      .rest-pills {
        display: flex;
        gap: var(--space-1);
      }
      /* Medían 35×18. Elegido en ember, no en azul. */
      .rest-pill {
        min-width: var(--target-min);
        min-height: var(--target-min);
        padding: 0 var(--space-2);
        background: var(--bg-elevated);
        border: var(--border-tier3) solid var(--border-default);
        border-radius: 10px;
        color: var(--text-secondary);
        font-family: var(--font-data);
        font-size: var(--text-base);
        font-weight: var(--font-semibold);
        cursor: pointer;
      }
      .rest-pill.active {
        background: var(--color-primary-muted);
        border-color: var(--ds-brand);
        color: var(--text-primary);
      }

      /* === SERIES === */
      .sets-table {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }
      /* 44 · tipo · 72 · 44: en 375px la columna del tipo mide unos
         140px y "Calentamiento (W)" entra en una línea. */
      .sets-header,
      .set-row {
        display: grid;
        grid-template-columns: var(--target-min) 1fr 72px var(--target-min);
        gap: 6px;
        align-items: center;
      }
      /* Medía 10.4px, y "SERIE" se partía en dos líneas. */
      .sets-header {
        text-align: center;
        white-space: nowrap;
        font-size: var(--text-xs);
        font-weight: var(--font-bold);
        color: var(--text-muted);
        letter-spacing: 0.02em;
      }
      /* "OBJETIVO REPS" no entra en 72px: toma también la columna de
         borrar, que no tiene encabezado. */
      .sets-header .col-reps {
        grid-column: span 2;
        text-align: left;
      }
      .sets-header .col-action {
        display: none;
      }
      /* Filas sin tarjeta propia: se repiten (regla de densidad). */
      .sets-rows {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }
      .set-num-label {
        text-align: center;
        font-family: var(--font-data);
        font-weight: var(--font-semibold);
        color: var(--text-muted);
      }

      /* Neutros, como en la sesión activa y el historial: iban en verde
         de éxito, amarillo, morado y rojo de error. Medían 25px. */
      .set-type-badge {
        width: 100%;
        min-height: var(--target-min);
        padding: 0 6px;
        border-radius: 10px;
        background: transparent;
        border: var(--border-tier3) solid var(--border-default);
        color: var(--text-secondary);
        font-size: var(--text-xs);
        font-weight: var(--font-bold);
        white-space: nowrap;
        cursor: pointer;
      }
      .set-type-badge.warmup,
      .set-type-badge.dropset,
      .set-type-badge.failure {
        border-color: var(--border-strong);
        color: var(--text-primary);
      }

      /* Medía 34px de alto y 13.6px de letra: iOS hacía zoom. */
      .reps-input {
        width: 100%;
        min-height: var(--target-min);
        padding: 0 var(--space-1);
        background: var(--bg-elevated);
        border: var(--border-tier3) solid var(--border-default);
        border-radius: 10px;
        color: var(--text-primary);
        font-family: var(--font-data);
        font-size: var(--text-base);
        font-weight: var(--font-semibold);
        text-align: center;
        outline: none;
      }
      .reps-input:focus {
        border-color: var(--ds-brand);
      }

      .action-cell {
        display: flex;
        justify-content: center;
      }

      /* Medía 29px. */
      .add-set-btn {
        min-height: var(--target-min);
        background: transparent;
        border: var(--border-tier3) dashed var(--border-default);
        border-radius: 10px;
        color: var(--text-secondary);
        font-size: var(--text-sm);
        font-weight: var(--font-bold);
        cursor: pointer;
      }
      .add-set-btn:active {
        background: var(--bg-elevated);
        color: var(--text-primary);
      }
    `,
  ],
})
export class RoutineEditorPage implements OnInit {
  facade = inject(RoutineFacade);
  router = inject(Router);
  route = inject(ActivatedRoute);

  isEditMode = signal<boolean>(false);

  // Inline mode (modal) props
  isInline = input<boolean>(false);
  routineCreated = output<string>();
  cancelInline = output<void>();

  // Router mode props
  editId = signal<string | null>(null);

  name = signal<string>('');
  notes = signal<string>('');
  exercises = signal<DraftExercise[]>([]);
  isSelectorOpen = signal<boolean>(false);

  constructor() {
    addIcons({
      closeOutline,
      timerOutline,
      flameOutline,
      checkmarkOutline,
    });
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.editId.set(id);
      const routine = await this.facade.getRoutine(id);
      if (routine) {
        this.name.set(routine.name);
        this.notes.set(routine.notes || '');
        if (routine.routine_exercises && routine.routine_exercises.length > 0) {
          const mapped: DraftExercise[] = routine.routine_exercises.map((rx) => {
            const exName = rx.exercises?.name_es || rx.exercises?.name_en || 'Ejercicio';
            const draftSets: DraftSet[] =
              rx.sets && rx.sets.length > 0
                ? rx.sets.map((s) => ({
                    id: crypto.randomUUID(),
                    set_number: s.set_number,
                    set_type: s.set_type,
                    target_reps: s.target_reps || '8-12',
                  }))
                : [
                    {
                      id: crypto.randomUUID(),
                      set_number: 1,
                      set_type: 'normal',
                      target_reps: '8-12',
                    },
                    {
                      id: crypto.randomUUID(),
                      set_number: 2,
                      set_type: 'normal',
                      target_reps: '8-12',
                    },
                    {
                      id: crypto.randomUUID(),
                      set_number: 3,
                      set_type: 'normal',
                      target_reps: '8-12',
                    },
                  ];

            return {
              id: rx.exercise_id,
              name: exName,
              rest_seconds: rx.rest_seconds ?? 90,
              notes: rx.notes || '',
              sets: draftSets,
            };
          });
          this.exercises.set(mapped);
        }
      }
    }
  }

  canSave(): boolean {
    return this.name().trim().length > 0 && this.exercises().length > 0;
  }

  onExerciseSelected(ex: ExerciseDefinition) {
    const name = ex.name_es || ex.name_en || 'Ejercicio Desconocido';

    // Por defecto 3 series normales con objetivo 8-12 reps
    const defaultSets: DraftSet[] = [
      { id: crypto.randomUUID(), set_number: 1, set_type: 'warmup', target_reps: '12-15' },
      { id: crypto.randomUUID(), set_number: 2, set_type: 'normal', target_reps: '8-12' },
      { id: crypto.randomUUID(), set_number: 3, set_type: 'normal', target_reps: '8-12' },
    ];

    const newDraft: DraftExercise = {
      id: ex.id,
      name,
      rest_seconds: 90,
      notes: '',
      sets: defaultSets,
    };

    this.exercises.update((arr) => [...arr, newDraft]);
    this.isSelectorOpen.set(false);
  }

  removeExercise(id: string) {
    this.exercises.update((arr) => arr.filter((e) => e.id !== id));
  }

  updateRestSeconds(exerciseId: string, seconds: number) {
    this.exercises.update((arr) =>
      arr.map((e) => (e.id === exerciseId ? { ...e, rest_seconds: seconds } : e)),
    );
  }

  addSet(exerciseId: string) {
    this.exercises.update((arr) =>
      arr.map((e) => {
        if (e.id === exerciseId) {
          const last = e.sets[e.sets.length - 1];
          const newSet: DraftSet = {
            id: crypto.randomUUID(),
            set_number: e.sets.length + 1,
            set_type: last ? last.set_type : 'normal',
            target_reps: last?.target_reps || '8-12',
          };
          return { ...e, sets: [...e.sets, newSet] };
        }
        return e;
      }),
    );
  }

  removeSet(exerciseId: string, setId: string) {
    this.exercises.update((arr) =>
      arr.map((e) => {
        if (e.id === exerciseId && e.sets.length > 1) {
          const filtered = e.sets
            .filter((s) => s.id !== setId)
            .map((s, idx) => ({
              ...s,
              set_number: idx + 1,
            }));
          return { ...e, sets: filtered };
        }
        return e;
      }),
    );
  }

  cycleSetType(exerciseId: string, setId: string) {
    const types: RoutineSetType[] = ['normal', 'warmup', 'dropset', 'failure'];
    this.exercises.update((arr) =>
      arr.map((e) => {
        if (e.id === exerciseId) {
          const sets = e.sets.map((s) => {
            if (s.id === setId) {
              const currentIdx = types.indexOf(s.set_type);
              const nextType = types[(currentIdx + 1) % types.length];
              return { ...s, set_type: nextType };
            }
            return s;
          });
          return { ...e, sets };
        }
        return e;
      }),
    );
  }

  getSetTypeLabel(type: RoutineSetType): string {
    switch (type) {
      case 'warmup':
        return 'Calentamiento (W)';
      case 'dropset':
        return 'Dropset (D)';
      case 'failure':
        return 'Al Fallo (F)';
      default:
        return 'Normal (N)';
    }
  }

  updateSetTargetReps(exerciseId: string, setId: string, targetReps: string) {
    this.exercises.update((arr) =>
      arr.map((e) => {
        if (e.id === exerciseId) {
          const sets = e.sets.map((s) => (s.id === setId ? { ...s, target_reps: targetReps } : s));
          return { ...e, sets };
        }
        return e;
      }),
    );
  }

  moveExercise(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    const list = [...this.exercises()];
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const item = list.splice(index, 1)[0];
    list.splice(targetIndex, 0, item);
    this.exercises.set(list);
  }

  handleReorder(ev: CustomEvent<ItemReorderEventDetail>) {
    const list = [...this.exercises()];
    const item = list.splice(ev.detail.from, 1)[0];
    list.splice(ev.detail.to, 0, item);
    this.exercises.set(list);
    ev.detail.complete();
  }

  async saveRoutine() {
    if (!this.canSave()) return;

    const dto: CreateRoutineDto = {
      name: this.name().trim(),
      notes: this.notes().trim(),
      exercises: this.exercises().map((ex, index) => ({
        exercise_id: ex.id,
        order_index: index,
        rest_seconds: ex.rest_seconds,
        notes: ex.notes,
        sets: ex.sets.map((s) => ({
          set_number: s.set_number,
          set_type: s.set_type,
          target_reps: s.target_reps,
        })),
      })),
    };

    let success = false;
    let newId: string | null = null;
    if (this.isEditMode() && this.editId()) {
      success = await this.facade.updateRoutine(this.editId()!, dto);
    } else {
      newId = await this.facade.createRoutine(dto);
      success = !!newId;
    }

    if (success) {
      if (this.isInline()) {
        this.routineCreated.emit(newId || this.editId()!);
      } else {
        this.router.navigate(['/app/workouts']);
      }
    }
  }
}
