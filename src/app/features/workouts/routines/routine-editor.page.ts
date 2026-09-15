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
    ExerciseSelectorComponent,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar style="--background: var(--bg-base);">
        <ion-buttons slot="start">
          @if (isInline()) {
            <ion-button color="medium" (click)="cancelInline.emit()">
              <ion-icon name="close-outline"></ion-icon>
            </ion-button>
          } @else {
            <ion-back-button defaultHref="/app/workouts" color="medium"></ion-back-button>
          }
        </ion-buttons>
        <ion-title style="color: var(--text-primary); font-weight: 800;">{{
          isEditMode() ? 'Editar Rutina' : 'Nueva Rutina'
        }}</ion-title>
        <ion-buttons slot="end">
          <ion-button
            (click)="saveRoutine()"
            [disabled]="!canSave() || facade.isLoading()"
            color="primary"
            style="font-weight: 700;"
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

    <ion-content class="ion-padding" style="--background: var(--bg-base);">
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

          <div class="input-group" style="margin-top: 0.85rem;">
            <label class="field-label">Notas o descripción general (opcional)</label>
            <textarea
              class="custom-input textarea-input"
              placeholder="Ej. Descansar 2 minutos en compuestos y foco en fase excéntrica..."
              [value]="notes()"
              (input)="notes.set($any($event.target).value)"
              rows="2"
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
            <button class="add-exercise-btn" (click)="isSelectorOpen.set(true)">
              <app-icon name="plus" [size]="14" />
              <span>Añadir</span>
            </button>
          </div>

          @if (exercises().length === 0) {
            <div class="empty-state">
              <app-icon
                name="dumbbell"
                [size]="40"
                style="color: var(--text-muted); opacity: 0.6;"
              ></app-icon>
              <h4>Sin ejercicios en la rutina</h4>
              <p>Presiona "Añadir" para incluir ejercicios a esta plantilla.</p>
            </div>
          } @else {
            <ion-reorder-group
              [disabled]="false"
              (ionItemReorder)="handleReorder($any($event))"
              class="exercises-list"
            >
              @for (ex of exercises(); track ex.id; let exIndex = $index) {
                <div class="exercise-card">
                  <!-- Header del ejercicio -->
                  <div class="ex-card-header">
                    <div class="ex-title-box">
                      <ion-reorder class="drag-handle" title="Arrastrar para reordenar">
                        <app-icon name="menu" [size]="15" class="drag-icon"></app-icon>
                      </ion-reorder>
                      <span class="ex-index">{{ exIndex + 1 }}</span>
                      <h4 class="ex-name">{{ ex.name }}</h4>
                    </div>

                    <div class="ex-header-actions">
                      <button
                        type="button"
                        class="reorder-arrow-btn"
                        [disabled]="exIndex === 0"
                        (click)="moveExercise(exIndex, -1)"
                        title="Mover arriba"
                      >
                        <app-icon name="chevron-up" [size]="14"></app-icon>
                      </button>
                      <button
                        type="button"
                        class="reorder-arrow-btn"
                        [disabled]="exIndex === exercises().length - 1"
                        (click)="moveExercise(exIndex, 1)"
                        title="Mover abajo"
                      >
                        <app-icon name="chevron-down" [size]="14"></app-icon>
                      </button>
                      <button
                        class="remove-ex-btn"
                        (click)="removeExercise(ex.id)"
                        title="Eliminar ejercicio"
                      >
                        <app-icon name="x" [size]="20" />
                      </button>
                    </div>
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
                                class="delete-set-btn"
                                (click)="removeSet(ex.id, set.id)"
                                title="Eliminar serie"
                              >
                                <app-icon name="trash-2" />
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
      .editor-container {
        max-width: 620px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        padding-bottom: 3rem;
      }

      /* === META CARD === */
      .meta-card {
        background: var(--bg-subtle, rgba(255, 255, 255, 0.03));
        border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
        border-radius: 16px;
        padding: 1.15rem;
      }
      .input-group {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }
      .field-label {
        font-size: 0.78rem;
        font-weight: 700;
        color: var(--text-muted, #a1a1aa);
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .custom-input {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        padding: 0.75rem 0.9rem;
        color: var(--text-primary);
        font-size: 0.95rem;
        font-family: inherit;
        outline: none;
        transition: border-color 0.15s ease;
      }
      .custom-input:focus {
        border-color: var(--ds-brand);
      }
      .title-input {
        font-size: 1.05rem;
        font-weight: 700;
      }
      .textarea-input {
        resize: none;
        font-size: 0.88rem;
        line-height: 1.4;
      }

      /* === EXERCISES SECTION === */
      .exercises-section {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .section-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .section-heading {
        margin: 0;
        font-size: 1.15rem;
        font-weight: 800;
        color: var(--text-primary);
        letter-spacing: -0.01em;
      }
      .section-subheading {
        margin: 0.15rem 0 0 0;
        font-size: 0.78rem;
        color: var(--text-muted, #a1a1aa);
      }
      .add-exercise-btn {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        background: var(--ds-brand);
        color: var(--text-primary);
        border: none;
        padding: 0.5rem 0.9rem;
        border-radius: 10px;
        font-size: 0.85rem;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        transition: all 0.15s ease;
      }
      .add-exercise-btn:active {
        transform: scale(0.96);
      }

      /* === EMPTY STATE === */
      .empty-state {
        background: rgba(255, 255, 255, 0.02);
        border: 1px dashed rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        padding: 2.5rem 1.5rem;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
      }
      .empty-state h4 {
        margin: 0;
        color: var(--text-primary);
        font-size: 1rem;
        font-weight: 700;
      }
      .empty-state p {
        margin: 0;
        color: var(--text-muted, #a1a1aa);
        font-size: 0.85rem;
      }

      /* === EXERCISE CARD === */
      .exercises-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .exercise-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        padding: 1.15rem;
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
      }
      .ex-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .ex-title-box {
        display: flex;
        align-items: center;
        gap: 0.6rem;
      }
      .ex-index {
        width: 24px;
        height: 24px;
        background: rgba(59, 130, 246, 0.15);
        color: var(--color-primary-hover);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.75rem;
        font-weight: 800;
      }
      .ex-name {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 700;
        color: var(--text-primary);
      }
      .remove-ex-btn {
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.4);
        font-size: 1.25rem;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: color 0.15s ease;
      }
      .remove-ex-btn:hover {
        color: var(--state-error);
      }
      .ex-header-actions {
        display: flex;
        align-items: center;
        gap: 0.35rem;
      }
      .reorder-arrow-btn {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: var(--text-secondary, #d4d4d8);
        border-radius: 8px;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .reorder-arrow-btn:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.12);
        color: var(--text-primary);
        border-color: rgba(255, 255, 255, 0.2);
      }
      .reorder-arrow-btn:disabled {
        opacity: 0.2;
        cursor: not-allowed;
      }
      .drag-handle {
        display: flex;
        align-items: center;
        cursor: grab;
        padding: 2px 4px;
      }
      .drag-icon {
        color: var(--text-muted, #a1a1aa);
        opacity: 0.6;
        transition: opacity 0.15s ease;
      }
      .drag-handle:hover .drag-icon {
        opacity: 1;
        color: var(--text-primary);
      }

      /* === REST OPTIONS === */
      .ex-options-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        background: rgba(0, 0, 0, 0.2);
        padding: 0.5rem 0.75rem;
        border-radius: 10px;
      }
      .rest-selector-group {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .option-label {
        font-size: 0.72rem;
        font-weight: 700;
        color: var(--text-muted, #a1a1aa);
        display: flex;
        align-items: center;
        gap: 0.25rem;
        text-transform: uppercase;
      }
      .rest-pills {
        display: flex;
        gap: 0.35rem;
      }
      .rest-pill {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: var(--text-muted, #a1a1aa);
        padding: 2px 8px;
        border-radius: 6px;
        font-size: 0.72rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .rest-pill.active {
        background: rgba(59, 130, 246, 0.2);
        border-color: var(--ds-brand);
        color: var(--color-primary-hover);
      }

      /* === SETS TABLE === */
      .sets-table {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }
      .sets-header {
        display: grid;
        grid-template-columns: 36px 95px 1fr 36px;
        gap: 0.5rem;
        align-items: center;
        font-size: 0.65rem;
        font-weight: 800;
        color: rgba(255, 255, 255, 0.35);
        letter-spacing: 0.06em;
        padding: 0 4px;
      }
      .sets-rows {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }
      .set-row {
        display: grid;
        grid-template-columns: 36px 95px 1fr 36px;
        gap: 0.5rem;
        align-items: center;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 10px;
        padding: 0.4rem 0.5rem;
      }
      .set-num-label {
        text-align: center;
        font-size: 0.85rem;
        font-weight: 800;
        color: var(--text-muted, #a1a1aa);
      }

      /* Set Type Badge Button */
      .set-type-badge {
        width: 100%;
        padding: 0.35rem 0.5rem;
        border-radius: 8px;
        font-size: 0.75rem;
        font-weight: 800;
        border: 1px solid transparent;
        cursor: pointer;
        text-align: center;
        transition: all 0.15s ease;
      }
      .set-type-badge.normal {
        background: rgba(16, 185, 129, 0.12);
        border-color: rgba(16, 185, 129, 0.3);
        color: var(--state-success);
      }
      .set-type-badge.warmup {
        background: rgba(234, 179, 8, 0.12);
        border-color: rgba(234, 179, 8, 0.3);
        color: #eab308;
      }
      .set-type-badge.dropset {
        background: rgba(168, 85, 247, 0.12);
        border-color: rgba(168, 85, 247, 0.3);
        color: #a855f7;
      }
      .set-type-badge.failure {
        background: rgba(239, 68, 68, 0.12);
        border-color: rgba(239, 68, 68, 0.3);
        color: var(--state-error);
      }

      .reps-input {
        width: 100%;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 0.35rem 0.6rem;
        color: var(--text-primary);
        font-size: 0.85rem;
        font-weight: 600;
        outline: none;
        text-align: center;
      }
      .reps-input:focus {
        border-color: var(--ds-brand);
      }

      .delete-set-btn {
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.3);
        font-size: 1rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2px;
      }
      .delete-set-btn:hover {
        color: var(--state-error);
      }

      .add-set-btn {
        margin-top: 0.35rem;
        background: transparent;
        border: 1px dashed rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 0.45rem;
        color: rgba(255, 255, 255, 0.5);
        font-size: 0.8rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .add-set-btn:active {
        background: rgba(255, 255, 255, 0.03);
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
