import { Component, ChangeDetectionStrategy, inject, signal, viewChild } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonItem,
  IonInput,
  IonBackButton,
  IonModal,
  AlertController,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { FormsModule } from '@angular/forms';
import { checkmarkCircleOutline } from 'ionicons/icons';
import { WorkoutFacade } from '@core/facades/workout.facade';
import { CoachFacade } from '@core/services/ai/coach.facade';
import { ExerciseSelectorComponent } from '../../explorer/exercise-selector/exercise-selector.component';
import { ExerciseDefinition, ExerciseFacade } from '@core/facades/exercise.facade';
import { WorkoutTimerComponent } from './workout-timer.component';
import { RestTimerComponent } from './rest-timer.component';
import { GsapAnimationsService } from '@core/services/ui/gsap-animations.service';
import { ExerciseDetailComponent } from '../../explorer/components/exercise-detail/exercise-detail.component';
import { IconComponent } from '@shared/components/icon/icon.component';
import { ModalComponent } from '@shared/components/modal/modal.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { CoachChatComponent } from '@shared/components/coach-chat/coach-chat.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { nombreTipoSerie } from '@core/utils/set-type.utils';
import {
  WorkoutReport,
  WorkoutExerciseFeedback,
  FeedbackCategory,
} from '@core/models/workout-feedback.model';

@Component({
  selector: 'app-active-workout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader,
    IonToolbar,
    IonContent,
    IonItem,
    IonInput,
    IonBackButton,
    IonModal,
    ExerciseSelectorComponent,
    WorkoutTimerComponent,
    RestTimerComponent,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IconComponent,
    ModalComponent,
    DrawerComponent,
    CoachChatComponent,
    EmptyStateComponent,
    FormsModule,
    ExerciseDetailComponent,
  ],
  template: `
    <!-- Tier 3 en encabezado y contenido, no en el host: los modales
         (0011) no son la superficie de registro. -->
    <ion-header class="ion-no-border tier-dato">
      <ion-toolbar class="active-toolbar">
        <div class="active-header">
          <ion-back-button
            defaultHref="/app/workouts"
            text=""
            color="medium"
            class="back-btn"
          ></ion-back-button>
          <h1 class="header-title">Sesión</h1>
          <div class="header-actions">
            <button
              type="button"
              class="coach-header-btn"
              (click)="coachFacade.toggleDrawer()"
              title="Consultar a tu Coach IA"
            >
              <app-icon name="sparkles" [size]="16" [ariaHidden]="true"></app-icon>
              Coach
            </button>
            <button
              type="button"
              class="discard-header-btn"
              data-llm-action="descartar-entrenamiento"
              (click)="discardModalOpen.set(true)"
              title="Descartar entrenamiento"
            >
              <app-icon name="trash-2" [size]="20" [ariaHidden]="true"></app-icon>
            </button>
            <!-- Sin ícono: con controles de 56px, es lo que deja entrar
                 "Sesión" sin cortarse en 375px. -->
            <button
              type="button"
              class="finish-btn"
              data-llm-action="terminar-entrenamiento"
              (click)="confirmFinishWorkout()"
            >
              Terminar
            </button>
          </div>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content class="workout-content tier-dato">
      @if (facade.activeSession(); as session) {
        <!-- Timer Global -->
        <div class="timer-container">
          <app-workout-timer [startTime]="session.start_time"></app-workout-timer>
        </div>

        <!-- Rest Timer (aparece al completar serie) -->
        <app-rest-timer #restTimer></app-rest-timer>

        <!-- Exercises -->
        <div class="exercises-container">
          @for (ex of session.exercises; track ex.exercise_id; let exIndex = $index) {
            <div class="exercise-card">
              <!-- Exercise Header -->
              <!-- Sin la mancuerna: era el mismo ícono en cada ejercicio. -->
              <div class="exercise-header">
                <div class="exercise-heading">
                  <h3 class="exercise-title">{{ ex.exercise_name }}</h3>
                  @if (ex.rest_seconds) {
                    <span class="ex-rest">
                      <app-icon name="timer" [size]="14" [ariaHidden]="true"></app-icon>
                      Descanso: {{ ex.rest_seconds }}s
                    </span>
                  }
                </div>

                <button
                  type="button"
                  class="feedback-ex-btn"
                  [attr.aria-label]="'Información de ' + ex.exercise_name"
                  (click)="openExerciseInfo(ex.exercise_id)"
                >
                  <app-icon name="info" [size]="20" [ariaHidden]="true" />
                </button>
                <button
                  type="button"
                  class="feedback-ex-btn"
                  [attr.aria-label]="'Feedback de ' + ex.exercise_name"
                  (click)="openExerciseFeedback(ex.exercise_id, ex.exercise_name, ex.feedback)"
                  [class.has-feedback]="ex.feedback"
                >
                  <app-icon name="message-circle" [size]="20" [ariaHidden]="true" />
                </button>
                <button
                  type="button"
                  class="delete-ex-btn"
                  [attr.aria-label]="'Quitar ' + ex.exercise_name"
                  data-llm-action="quitar-ejercicio"
                  (click)="confirmRemoveExercise(ex.exercise_id, ex.exercise_name)"
                >
                  <app-icon name="x" [size]="20" [ariaHidden]="true" />
                </button>
              </div>

              <div class="divider"></div>

              <!-- Set Headers -->
              <div class="set-header">
                <span class="col-set">SERIE</span>
                <span class="col-input">KG</span>
                <span class="col-input">REPS</span>
                <span class="col-input">RIR</span>
                <span class="col-check">
                  <app-icon name="check" [size]="14" />
                </span>
              </div>

              <!-- Set Rows -->
              <div class="sets-list">
                @for (set of ex.sets; track set.id; let setIndex = $index) {
                  <ion-item-sliding>
                    <ion-item class="set-item" lines="none">
                      <div class="set-row" [class.is-completed]="set.completed">
                        <button
                          type="button"
                          class="set-badge {{ set.set_type || 'normal' }}"
                          [class.completed]="set.completed"
                          [attr.aria-label]="
                            'Serie ' + (setIndex + 1) + ': ' + nombreTipoSerie(set.set_type)
                          "
                          (click)="
                            openSetTypeOptions(ex.exercise_id, set.id, set.set_type || 'normal')
                          "
                        >
                          {{ getSetTypeLabel(set) }}
                        </button>
                        <div
                          class="input-wrapper"
                          [class.is-previous]="set.is_from_previous && !set.completed"
                        >
                          <ion-input
                            type="number"
                            placeholder="—"
                            [value]="set.weight || null"
                            (ionChange)="updateSet(ex.exercise_id, set.id, 'weight', $event)"
                            [readonly]="set.completed"
                            inputmode="decimal"
                            min="0"
                            [attr.aria-label]="'Peso en kilogramos, serie ' + (setIndex + 1)"
                          >
                          </ion-input>
                        </div>
                        <div
                          class="input-wrapper reps-wrapper"
                          [class.is-previous]="set.is_from_previous && !set.completed"
                          [class.has-target]="set.target_reps && !set.completed"
                        >
                          <ion-input
                            type="number"
                            [placeholder]="set.target_reps || '—'"
                            [value]="set.reps || null"
                            (ionChange)="updateSet(ex.exercise_id, set.id, 'reps', $event)"
                            [readonly]="set.completed"
                            inputmode="numeric"
                            min="0"
                            [attr.aria-label]="'Repeticiones, serie ' + (setIndex + 1)"
                          >
                          </ion-input>
                          @if (set.target_reps && !set.completed) {
                            <span class="inline-target">Obj: {{ set.target_reps }}</span>
                          }
                        </div>
                        <div
                          class="input-wrapper rir-input"
                          [class.is-previous]="set.is_from_previous && !set.completed"
                        >
                          <ion-input
                            type="number"
                            placeholder="—"
                            [value]="set.rir ?? null"
                            (ionChange)="updateSet(ex.exercise_id, set.id, 'rir', $event)"
                            [readonly]="set.completed"
                            inputmode="numeric"
                            min="0"
                            [attr.aria-label]="
                              'RIR, repeticiones en reserva, serie ' + (setIndex + 1)
                            "
                          >
                          </ion-input>
                        </div>
                        <button
                          type="button"
                          class="check-btn"
                          [class.checked]="set.completed"
                          [attr.aria-label]="'Serie ' + (setIndex + 1) + ' completada'"
                          [attr.aria-pressed]="set.completed"
                          (click)="onToggleSet(ex.exercise_id, set.id, set.completed, $event)"
                        >
                          <app-icon name="check" [size]="22" [ariaHidden]="true" />
                        </button>
                      </div>
                    </ion-item>
                    <ion-item-options side="end">
                      <ion-item-option
                        color="danger"
                        (click)="facade.removeSet(ex.exercise_id, set.id)"
                        style="display: flex; justify-content: center; align-items: center;"
                      >
                        <app-icon name="trash-2" [size]="20"></app-icon>
                      </ion-item-option>
                    </ion-item-options>
                  </ion-item-sliding>
                }
              </div>

              <!-- Add Set -->
              <button type="button" class="add-set-btn" (click)="facade.addSet(ex.exercise_id)">
                + Añadir Serie
              </button>
            </div>
          }
        </div>

        <!-- Add Exercise CTA -->
        <button type="button" class="add-exercise-btn" (click)="isSelectorOpen.set(true)">
          <app-icon name="plus" [size]="20" [ariaHidden]="true" />
          Añadir Ejercicio
        </button>

        <!-- Bottom spacer for safe area -->
        <div class="bottom-spacer"></div>
      } @else {
        <!-- El estado vacío unificado de la app; tenía uno propio. -->
        <app-empty-state
          icon="dumbbell"
          message="No hay entrenamiento activo"
          subtitle="Inicia uno desde la pestaña Entrenar."
        />
      }
    </ion-content>

    <!-- Exercise Selector Modal -->
    <ion-modal [isOpen]="isSelectorOpen()" (didDismiss)="isSelectorOpen.set(false)">
      <ng-template>
        <app-exercise-selector
          (exerciseSelected)="onExerciseSelected($event)"
          (close)="isSelectorOpen.set(false)"
        >
        </app-exercise-selector>
      </ng-template>
    </ion-modal>

    <!-- Los seis modales se usan entrenando: Tier 3 (spec 0011). -->
    <!-- Discard Modal -->
    <app-modal
      class="tier-dato"
      [isOpen]="discardModalOpen()"
      title="Descartar Entrenamiento"
      (closed)="discardModalOpen.set(false)"
    >
      <p style="color: var(--text-muted); margin-bottom: 1.5rem; font-size: 0.95rem;">
        ¿Estás seguro de que deseas cancelar y descartar esta sesión?
      </p>
      <ng-container appModalFooter>
        <div style="display: flex; gap: 1rem; width: 100%">
          <button class="modal-btn-cancel" (click)="discardModalOpen.set(false)">Volver</button>
          <button
            class="modal-btn-danger"
            (click)="facade.discardWorkout(); discardModalOpen.set(false)"
          >
            Descartar
          </button>
        </div>
      </ng-container>
    </app-modal>

    <!-- Delete Exercise Modal -->
    <app-modal
      class="tier-dato"
      [isOpen]="deleteExerciseData() !== null"
      title="Eliminar Ejercicio"
      (closed)="deleteExerciseData.set(null)"
    >
      @if (deleteExerciseData(); as ex) {
        <p style="color: var(--text-muted); margin-bottom: 1.5rem; font-size: 0.95rem;">
          ¿Quitar <strong style="color: var(--text-primary)">{{ ex.name }}</strong> de tu rutina
          actual?
        </p>
      }
      <ng-container appModalFooter>
        <div style="display: flex; gap: 1rem; width: 100%">
          <button class="modal-btn-cancel" (click)="deleteExerciseData.set(null)">Cancelar</button>
          <button
            class="modal-btn-danger"
            (click)="facade.removeExercise(deleteExerciseData()?.id!); deleteExerciseData.set(null)"
          >
            Eliminar
          </button>
        </div>
      </ng-container>
    </app-modal>

    <!-- Finish Workout Modal -->
    <app-modal
      class="tier-dato"
      [isOpen]="finishModalOpen()"
      title="Terminar Entrenamiento"
      (closed)="finishModalOpen.set(false)"
    >
      @if (uncompletedSetsCount() > 0) {
        <div class="finish-warning">
          <h4 class="finish-warning-title">
            <app-icon name="alert-triangle" [size]="18" [ariaHidden]="true"></app-icon> Series
            incompletas
          </h4>
          <p class="finish-warning-text">
            Tienes <strong>{{ uncompletedSetsCount() }}</strong> serie(s) sin marcar. Si terminas
            ahora, esas series no se guardarán en tu progreso.
          </p>
        </div>
      } @else {
        <p style="color: var(--text-muted); margin-bottom: 1.5rem; font-size: 0.95rem;">
          ¿Estás seguro de que deseas finalizar tu entrenamiento y guardar el progreso?
        </p>
      }
      <ng-container appModalFooter>
        <div style="display: flex; gap: 1rem; width: 100%">
          <button class="modal-btn-cancel" (click)="finishModalOpen.set(false)">Volver</button>
          <button class="modal-btn-primary" (click)="proceedToReport()">Continuar</button>
        </div>
      </ng-container>
    </app-modal>

    <!-- Set Type Modal -->
    <app-modal
      class="tier-dato"
      [isOpen]="activeSetForType() !== null"
      title="Tipo de Serie"
      (closed)="activeSetForType.set(null)"
    >
      <div class="set-type-list">
        <button
          class="set-type-option normal"
          [class.selected]="activeSetForType()?.current === 'normal'"
          (click)="selectSetType('normal')"
        >
          <div class="option-icon">N</div>
          <span>Normal</span>
        </button>
        <button
          class="set-type-option warmup"
          [class.selected]="activeSetForType()?.current === 'warmup'"
          (click)="selectSetType('warmup')"
        >
          <div class="option-icon">C</div>
          <span>Calentamiento</span>
        </button>
        <button
          class="set-type-option dropset"
          [class.selected]="activeSetForType()?.current === 'dropset'"
          (click)="selectSetType('dropset')"
        >
          <div class="option-icon">D</div>
          <span>Dropset (Descendente)</span>
        </button>
        <button
          class="set-type-option failure"
          [class.selected]="activeSetForType()?.current === 'failure'"
          (click)="selectSetType('failure')"
        >
          <div class="option-icon">F</div>
          <span>Al Fallo</span>
        </button>
      </div>
    </app-modal>

    <!-- Exercise Info Modal -->
    <app-modal
      class="tier-dato"
      [isOpen]="infoModalOpen()"
      [title]="selectedExerciseInfo()?.name_es || selectedExerciseInfo()?.name_en || 'Información'"
      (closed)="infoModalOpen.set(false)"
    >
      @if (selectedExerciseInfo(); as info) {
        <app-exercise-detail [exercise]="info" />
      }
    </app-modal>

    <!-- Exercise Feedback Modal -->
    <app-modal
      class="tier-dato"
      [isOpen]="exerciseFeedbackData() !== null"
      [title]="'Feedback: ' + exerciseFeedbackData()?.name"
      (closed)="exerciseFeedbackData.set(null)"
    >
      @if (exerciseFeedbackData(); as data) {
        <div class="feedback-form">
          <label class="form-label">Categoría</label>
          <div class="category-grid">
            <button
              class="category-btn"
              [class.selected]="data.feedback.categories.includes('technique')"
              (click)="toggleCategory(data, 'technique')"
            >
              Técnica
            </button>
            <button
              class="category-btn"
              [class.selected]="data.feedback.categories.includes('pain')"
              (click)="toggleCategory(data, 'pain')"
            >
              Molestia Física
            </button>
            <button
              class="category-btn"
              [class.selected]="data.feedback.categories.includes('equipment')"
              (click)="toggleCategory(data, 'equipment')"
            >
              Equipo
            </button>
            <button
              class="category-btn"
              [class.selected]="data.feedback.categories.includes('intensity')"
              (click)="toggleCategory(data, 'intensity')"
            >
              Intensidad
            </button>
          </div>

          <label class="form-label mt-4">Calificación (1-5)</label>
          <div class="rating-row">
            @for (i of [1, 2, 3, 4, 5]; track i) {
              <button
                class="rating-btn"
                [class.selected]="data.feedback.rating === i"
                (click)="data.feedback.rating = i"
              >
                {{ i }}
              </button>
            }
          </div>

          <label class="form-label mt-4">Notas</label>
          <div class="input-wrapper-feedback">
            <ion-input
              [(ngModel)]="data.feedback.notes"
              placeholder="Escribe detalles aquí..."
            ></ion-input>
          </div>
        </div>
      }
      <ng-container appModalFooter>
        <div style="display: flex; gap: 1rem; width: 100%">
          <button class="modal-btn-cancel" (click)="exerciseFeedbackData.set(null)">
            Cancelar
          </button>
          <button class="modal-btn-primary" (click)="saveExerciseFeedback()">Guardar</button>
        </div>
      </ng-container>
    </app-modal>

    <!-- Session Report Modal -->
    <app-modal
      class="tier-dato"
      [isOpen]="sessionReportOpen()"
      title="Resumen de Sesión"
      (closed)="sessionReportOpen.set(false)"
    >
      <div class="feedback-form">
        <label class="form-label">Energía hoy (1-5)</label>
        <div class="rating-row">
          @for (i of [1, 2, 3, 4, 5]; track i) {
            <button
              class="rating-btn"
              [class.selected]="sessionReportData().energy_level === i"
              (click)="sessionReportData().energy_level = i"
            >
              @if (i === 1) {
                <app-icon name="moon" [size]="16" />
              } @else if (i === 5) {
                <app-icon name="zap" [size]="16" />
              } @else {
                {{ i }}
              }
            </button>
          }
        </div>

        <label class="form-label mt-4">RPE Global (Dificultad 1-10)</label>
        <div class="rating-row">
          @for (i of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; track i) {
            <button
              class="rating-btn small"
              [class.selected]="sessionReportData().session_rpe === i"
              (click)="sessionReportData().session_rpe = i"
            >
              {{ i }}
            </button>
          }
        </div>

        <label class="form-label mt-4">Notas de la sesión</label>
        <div class="input-wrapper-feedback">
          <ion-input
            [(ngModel)]="sessionReportData().notes"
            placeholder="Ej: Dormí mal..."
          ></ion-input>
        </div>
      </div>
      <ng-container appModalFooter>
        <div style="display: flex; gap: 1rem; width: 100%">
          <button class="modal-btn-cancel" (click)="sessionReportOpen.set(false)">Saltar</button>
          <button class="modal-btn-primary" (click)="executeFinishWorkout()">
            Terminar y Guardar
          </button>
        </div>
      </ng-container>
    </app-modal>

    <!-- Coach IA Drawer en Sesión Activa -->
    <app-drawer
      [isOpen]="coachFacade.isDrawerOpen()"
      title="Coach Virtual IA"
      icon="sparkles"
      [noPadding]="true"
      (closed)="coachFacade.closeDrawer()"
    >
      <!-- Mismo envoltorio que el FAB del shell (tabs-layout): sin padding del
           drawer y sin altura calculada a mano, la geometría la manda el panel. -->
      <div class="h-full flex flex-col relative">
        <app-coach-chat
          [messages]="coachFacade.messages()"
          [isLoading]="coachFacade.isLoading()"
          [toolStatus]="coachFacade.toolStatus()"
          [memories]="coachFacade.memories()"
          [isMemoryOpen]="coachFacade.isMemoryOpen()"
          (onSend)="coachFacade.sendMessage($event.text, $event.imageBase64)"
          (onClear)="coachFacade.clearChat()"
          (onToggleMemory)="coachFacade.toggleMemory()"
          (onDeleteMemory)="coachFacade.deleteMemory($event)"
        />
      </div>
    </app-drawer>
  `,
  styles: [
    `
      /* Sin regla de fondo propia: la global de ion-content ya pinta la
         tinta (fix-028). */

      /* === MODALES (spec 0011) ===
         Llevan .tier-dato: --tier-target vale 56px. El margen de
         .mt-4 lo pone la utilidad de Tailwind (aplica desde fix-036). */
      .form-label {
        display: block;
        margin-bottom: var(--space-2);
        font-size: var(--text-sm);
        font-weight: var(--font-bold);
        color: var(--text-muted);
      }

      .category-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-2);
      }

      /* Energía en una fila y RPE en dos, de cinco: 57px por celda en
         375px. Medían 54×37 y 26×31. */
      .rating-row {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: var(--space-1);
      }

      /* Las categorías medían 34px. */
      .category-btn,
      .rating-btn {
        min-height: var(--tier-target);
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg-elevated);
        border: var(--border-tier3) solid var(--border-default);
        border-radius: 12px;
        color: var(--text-primary);
        font-weight: var(--font-semibold);
      }
      .rating-btn {
        font-family: var(--font-data);
        font-size: var(--text-lg);
        font-variant-numeric: tabular-nums;
      }
      /* Elegido: ember, no el azul anterior. */
      .category-btn.selected,
      .rating-btn.selected,
      .set-type-option.selected {
        background: var(--color-primary-muted);
        border-color: var(--ds-brand);
      }

      .input-wrapper-feedback {
        min-height: var(--tier-target);
        display: flex;
        align-items: center;
        padding: 0 var(--space-3);
        background: var(--bg-elevated);
        border: var(--border-tier3) solid var(--border-default);
        border-radius: 12px;
      }
      .input-wrapper-feedback:focus-within {
        border-color: var(--ds-brand);
      }
      .input-wrapper-feedback ion-input {
        --padding-start: 0;
        --padding-end: 0;
        min-height: var(--tier-target);
        text-align: left;
        font-weight: 400;
      }

      /* ============================================================
         SUPERFICIE DE REGISTRO — Tier 3 (spec 0010)
         Objetivos de 56px, cifras en --font-data, sin sombras ni
         superficie decorativa. Ember solo en el cronómetro, "Terminar"
         y "Añadir Ejercicio" (regla 3-2-1).
         ============================================================ */

      /* === ENCABEZADO ===
         Era una tarjeta flotante de vidrio con desenfoque y sombra, y
         botones de 30px. Barra sólida en tinta. */
      .active-toolbar {
        --background: var(--bg-base);
        --border-style: solid;
        --border-width: 0 0 var(--border-tier3);
        --border-color: var(--border-subtle);
        --min-height: calc(var(--target-min-critical) + var(--space-2));
        --padding-start: var(--space-1);
        --padding-end: var(--space-2);
      }

      .active-header {
        display: flex;
        align-items: center;
        gap: var(--space-1);
        width: 100%;
      }

      /* Ionic fija 48px en su :host y no lee --min-width. */
      .back-btn {
        --color: var(--text-secondary);
        width: var(--target-min-critical);
        height: var(--target-min-critical);
        min-width: var(--target-min-critical);
        min-height: var(--target-min-critical);
        margin: 0;
        flex-shrink: 0;
      }

      /* Iba en Anton a 16px. */
      .header-title {
        font-family: var(--font-data);
        font-size: var(--text-lg);
        font-weight: var(--font-semibold);
        color: var(--text-primary);
        margin: 0;
        flex: 1;
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: var(--space-1);
        flex-shrink: 0;
      }

      .coach-header-btn,
      .finish-btn {
        min-height: var(--target-min-critical);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-1);
        padding: 0 var(--space-3);
        border-radius: 12px;
        font-weight: var(--font-bold);
        font-size: var(--text-sm);
        cursor: pointer;
        transition: transform 0.15s ease;
      }
      /* Iba en un degradado violeta que Eclipse no tiene. */
      .coach-header-btn {
        background: var(--bg-surface);
        border: var(--border-tier3) solid var(--border-default);
        color: var(--text-secondary);
      }
      /* Acción principal de la vista: ember. Iba en el verde de éxito,
         que es un estado, no una acción. */
      .finish-btn {
        background: var(--ds-brand);
        border: var(--border-tier3) solid var(--ds-brand);
        color: var(--color-primary-text);
      }
      .finish-btn:active {
        background: var(--color-primary-hover);
      }

      .discard-header-btn {
        width: var(--target-min-critical);
        height: var(--target-min-critical);
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--state-error-bg);
        border: var(--border-tier3) solid var(--state-error-border);
        border-radius: 12px;
        color: var(--state-error);
        cursor: pointer;
        transition: transform 0.15s ease;
      }

      .coach-header-btn:active,
      .finish-btn:active,
      .discard-header-btn:active {
        transform: scale(0.95);
      }

      /* === CRONÓMETRO === */
      .timer-container {
        text-align: center;
        padding: var(--space-4) 0 var(--space-2);
      }

      /* === EJERCICIOS ===
         Sección con línea, no tarjeta: Tier 3 no tiene superficie
         decorativa, y el ancho del borde y el relleno lo necesitan
         cinco columnas de 56px. */
      .exercises-container {
        display: flex;
        flex-direction: column;
        padding: var(--space-2) var(--space-4) 0;
      }

      .exercise-card {
        padding: var(--space-4) 0;
        border-top: var(--border-tier3) solid var(--border-default);
      }
      .exercise-card:first-child {
        border-top: none;
      }

      .exercise-header {
        display: flex;
        align-items: center;
        gap: var(--space-1);
      }

      .exercise-heading {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .exercise-title {
        font-family: var(--font-body);
        font-size: var(--text-lg);
        font-weight: var(--font-bold);
        color: var(--text-primary);
        margin: 0;
        letter-spacing: -0.01em;
      }

      /* Medía 11.5px y en ember. */
      .ex-rest {
        display: inline-flex;
        align-items: center;
        gap: var(--space-1);
        font-size: var(--text-xs);
        font-weight: var(--font-semibold);
        color: var(--text-secondary);
      }

      /* Medían 26px. */
      .feedback-ex-btn,
      .delete-ex-btn {
        width: var(--target-min-critical);
        height: var(--target-min-critical);
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        border-radius: var(--radius-full);
        color: var(--text-muted);
        cursor: pointer;
      }
      /* Con nota: más contraste, no ember. Puede haber una por
         ejercicio y el ember ya tiene sus tres lugares. */
      .feedback-ex-btn.has-feedback {
        color: var(--text-primary);
        background: var(--bg-elevated);
      }
      .feedback-ex-btn:active,
      .delete-ex-btn:active {
        background: var(--bg-elevated);
      }
      .delete-ex-btn:active {
        color: var(--state-error);
      }

      .divider {
        height: var(--border-tier3);
        background: var(--border-subtle);
        margin: var(--space-3) 0;
      }

      /* === TABLA DE SERIES === */
      .set-header,
      .set-row {
        display: grid;
        grid-template-columns:
          var(--target-min-critical) 1fr 1fr 0.8fr
          var(--target-min-critical);
        gap: var(--space-1);
      }

      /* Medía 10.4px. */
      .set-header {
        align-items: center;
        text-align: center;
        font-size: var(--text-xs);
        font-weight: var(--font-bold);
        color: var(--text-muted);
        letter-spacing: 0.06em;
        margin-bottom: var(--space-2);
      }

      .sets-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }

      ion-item.set-item {
        --padding-start: 0;
        --padding-end: 0;
        --inner-padding-end: 0;
        --background: transparent;
        width: 100%;
      }

      ion-item-options {
        border-radius: 12px;
        overflow: hidden;
      }
      ion-item-option {
        --border-radius: 12px;
        min-width: var(--target-min-critical);
        margin-left: var(--space-2);
      }

      /* Ancho explícito: dentro de ion-item la fila medía lo que su
         contenido, y los campos ya no aportan ancho (van superpuestos). */
      .set-row {
        width: 100%;
        align-items: center;
        border-radius: 12px;
        transition: background 0.25s ease;
      }

      .set-row.is-completed {
        background: var(--state-success-bg);
      }

      /* Medía 28px. */
      .set-badge {
        width: 100%;
        height: var(--target-min-critical);
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        border: var(--border-tier3) solid var(--border-default);
        background: transparent;
        color: var(--text-secondary);
        font-family: var(--font-data);
        font-weight: var(--font-semibold);
        font-size: var(--text-base);
        font-variant-numeric: tabular-nums;
        cursor: pointer;
      }
      .set-badge:active {
        transform: scale(0.9);
      }
      /* Neutros, como en el historial (0008): iban en amarillo y
         morado, que Eclipse no tiene, y "al fallo" en rojo de error.
         La letra dice el tipo y el aria-label lo nombra. */
      .set-badge.warmup,
      .set-badge.dropset,
      .set-badge.failure {
        border-color: var(--border-strong);
        color: var(--text-primary);
      }
      .set-row.is-completed .set-badge {
        border-color: transparent;
      }

      /* === CAMPOS === */
      /* Medían 44px. */
      .input-wrapper {
        height: var(--target-min-critical);
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: var(--bg-surface);
        border: var(--border-tier3) solid var(--border-subtle);
        border-radius: 12px;
        transition: border-color 0.2s ease;
      }
      /* Tier 3 no admite sombras, tampoco la del foco: lo marca el
         borde ember. Iba en azul. */
      .input-wrapper:focus-within {
        background: var(--bg-elevated);
        border-color: var(--ds-brand);
      }

      .set-row.is-completed .input-wrapper {
        background: transparent;
        border-color: transparent;
      }

      /* Valor de la sesión anterior: se ve, pero todavía no es tuyo. */
      .input-wrapper.is-previous {
        background: transparent;
        border: var(--border-tier3) dashed var(--border-default);
      }
      .input-wrapper.is-previous ion-input {
        color: var(--text-muted) !important;
      }
      .input-wrapper.is-previous:focus-within {
        border: var(--border-tier3) solid var(--ds-brand);
      }
      .input-wrapper.is-previous:focus-within ion-input {
        color: var(--text-primary) !important;
      }

      /* Medía 8.8px y en ember. Va superpuesto al pie del campo para que
         ion-input ocupe los 56px completos: es su área táctil. */
      .inline-target {
        position: absolute;
        left: 0;
        right: 0;
        bottom: var(--space-1);
        text-align: center;
        font-size: var(--text-xs);
        font-weight: var(--font-semibold);
        color: var(--text-muted);
        line-height: 1;
        pointer-events: none;
      }

      ion-input {
        --padding-start: 0;
        --padding-end: 0;
        --padding-top: 0;
        --padding-bottom: 0;
        text-align: center;
        font-weight: 600;
        font-size: 1.05rem;
        color: var(--text-primary);
        width: 100%;
        --placeholder-color: var(--text-muted);
        --placeholder-font-weight: 400;
      }
      /* Las cifras de la tabla, en la tipografía de datos. El campo llena
         la celda: Ionic lo deja en 44px y ese es el área que se toca. */
      .input-wrapper ion-input {
        position: absolute;
        inset: calc(-1 * var(--border-tier3));
        width: auto;
        min-height: 0;
        display: flex;
        align-items: center;
        font-family: var(--font-data);
        font-size: var(--text-lg);
        font-variant-numeric: tabular-nums;
      }
      .input-wrapper.has-target ion-input {
        --padding-bottom: var(--space-4);
      }

      .set-row.is-completed ion-input {
        color: var(--text-secondary);
      }

      /* === CHECK ===
         El control más usado de la app: medía 38px. */
      .check-btn {
        width: var(--target-min-critical);
        height: var(--target-min-critical);
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: 1.5px solid var(--border-strong);
        border-radius: 12px;
        color: var(--text-muted);
        cursor: pointer;
        transition:
          background 0.2s ease,
          border-color 0.2s ease;
        margin: 0 auto;
      }
      /* Completada es un estado: verde de éxito, con tinta encima. */
      .check-btn.checked {
        background: var(--state-success);
        border-color: var(--state-success);
        color: var(--color-primary-text);
      }
      .check-btn:active {
        transform: scale(0.9);
      }

      /* === AÑADIR === */
      /* Medía 35px. */
      .add-set-btn {
        width: 100%;
        min-height: var(--target-min-critical);
        margin-top: var(--space-3);
        background: transparent;
        border: var(--border-tier3) dashed var(--border-default);
        border-radius: 12px;
        color: var(--text-secondary);
        font-weight: var(--font-semibold);
        font-size: var(--text-sm);
        cursor: pointer;
      }
      .add-set-btn:active {
        background: var(--bg-surface);
        color: var(--text-primary);
      }

      /* Iba en azul. */
      .add-exercise-btn {
        width: calc(100% - 2 * var(--space-4));
        min-height: var(--target-min-critical);
        margin: var(--space-2) var(--space-4) 0;
        background: transparent;
        border: var(--border-tier3) solid var(--ds-brand);
        border-radius: 12px;
        color: var(--ds-brand);
        font-weight: var(--font-bold);
        font-size: var(--text-base);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-2);
        cursor: pointer;
        transition: transform 0.15s ease;
      }
      .add-exercise-btn:active {
        transform: scale(0.98);
        background: var(--color-primary-muted);
      }

      .bottom-spacer {
        height: calc(2rem + env(safe-area-inset-bottom, 0px));
      }

      /* Pie de los modales: .modal-btn-* vive en tailwind.css, porque
         Entrenar lo usa igual. "Continuar", "Guardar" y "Terminar y
         Guardar" pasan a .modal-btn-primary (ember): iban en el verde
         de éxito, que es un estado y no una acción. */

      /* Series sin marcar al terminar: aviso, en dorado de la paleta.
         Iba en un amarillo escrito a mano, en línea. */
      .finish-warning {
        margin-bottom: var(--space-5);
        padding: var(--space-4);
        background: var(--state-warning-bg);
        border: var(--border-tier3) solid var(--state-warning-border);
        border-radius: 12px;
      }
      .finish-warning-title {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        margin: 0 0 var(--space-2);
        font-size: var(--text-base);
        color: var(--state-warning);
      }
      .finish-warning-text {
        margin: 0;
        font-size: var(--text-sm);
        color: var(--text-secondary);
      }

      /* === TIPO DE SERIE ===
         Neutro, como la letra en la tabla: iba en amarillo, morado,
         rojo de error y verde de éxito según el tipo. */
      .set-type-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }
      .set-type-option {
        min-height: var(--tier-target);
        display: flex;
        align-items: center;
        gap: var(--space-4);
        padding: var(--space-2) var(--space-4);
        border-radius: 12px;
        background: var(--bg-elevated);
        border: var(--border-tier3) solid var(--border-default);
        color: var(--text-primary);
        font-weight: var(--font-semibold);
        font-size: var(--text-base);
        cursor: pointer;
      }
      .set-type-option:active {
        transform: scale(0.97);
      }
      .option-icon {
        width: 36px;
        height: 36px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        border: var(--border-tier3) solid var(--border-strong);
        font-family: var(--font-data);
        font-weight: var(--font-semibold);
      }
    `,
  ],
})
export class ActiveWorkoutPage {
  facade = inject(WorkoutFacade);
  coachFacade = inject(CoachFacade);
  gsap = inject(GsapAnimationsService);
  restTimer = viewChild<RestTimerComponent>('restTimer');
  alertCtrl = inject(AlertController);
  exerciseFacade = inject(ExerciseFacade);

  infoModalOpen = signal(false);
  selectedExerciseInfo = signal<ExerciseDefinition | null>(null);

  async openExerciseInfo(exerciseId: string) {
    const info = await this.exerciseFacade.getExerciseById(exerciseId);
    if (info) {
      this.selectedExerciseInfo.set(info);
      this.infoModalOpen.set(true);
    }
  }

  /** Nombre completo del tipo de serie, para el aria-label de su letra. */
  readonly nombreTipoSerie = nombreTipoSerie;

  constructor() {
    addIcons({
      checkmarkCircleOutline,
    });
  }

  updateSet(exId: string, setId: string, field: 'weight' | 'reps' | 'rir', event: any) {
    const raw = event.detail.value;
    if (raw === '' || raw === null || raw === undefined) {
      this.facade.updateSet(exId, setId, { [field]: 0, is_from_previous: false });
      return;
    }

    if (field === 'weight') {
      const val = parseFloat(raw);
      if (!isNaN(val)) {
        const clamped = Math.max(0, Math.min(999.9, Math.round(val * 10) / 10));
        this.facade.updateSet(exId, setId, { weight: clamped, is_from_previous: false });
      }
    } else if (field === 'reps') {
      const val = parseInt(raw, 10);
      if (!isNaN(val)) {
        const clamped = Math.max(0, Math.min(999, val));
        this.facade.updateSet(exId, setId, { reps: clamped, is_from_previous: false });
      }
    } else if (field === 'rir') {
      const val = parseInt(raw, 10);
      if (!isNaN(val)) {
        const clamped = Math.max(0, Math.min(10, val));
        this.facade.updateSet(exId, setId, { rir: clamped, is_from_previous: false });
      }
    }
  }

  onToggleSet(exId: string, setId: string, currentState: boolean, event: Event) {
    this.facade.updateSet(exId, setId, { completed: !currentState, is_from_previous: false });
    if (!currentState) {
      const session = this.facade.activeSession();
      const ex = session?.exercises.find((e) => e.exercise_id === exId);
      this.restTimer()?.start(ex?.rest_seconds);
      this.gsap.animateSuccessFeedback(event.currentTarget as HTMLElement);
    }
  }

  activeSetForType = signal<{ exId: string; setId: string; current: string } | null>(null);

  openSetTypeOptions(exId: string, setId: string, currentType: string) {
    this.activeSetForType.set({ exId, setId, current: currentType });
  }

  selectSetType(type: 'normal' | 'warmup' | 'dropset' | 'failure') {
    const active = this.activeSetForType();
    if (active) {
      this.facade.updateSet(active.exId, active.setId, { set_type: type });
      this.activeSetForType.set(null);
    }
  }

  getSetTypeLabel(set: any): string {
    if (set.set_type === 'warmup') return 'C';
    if (set.set_type === 'dropset') return 'D';
    if (set.set_type === 'failure') return 'F';
    return set.set_number.toString();
  }

  // Feedback Logic
  exerciseFeedbackData = signal<{
    id: string;
    name: string;
    feedback: WorkoutExerciseFeedback;
  } | null>(null);
  sessionReportOpen = signal<boolean>(false);
  sessionReportData = signal<WorkoutReport>({ workout_id: '' });

  openExerciseFeedback(exId: string, exName: string, existingFeedback?: WorkoutExerciseFeedback) {
    const feedback = existingFeedback
      ? { ...existingFeedback }
      : {
          exercise_id: exId,
          categories: ['technique'] as FeedbackCategory[],
          rating: 3,
          tags: [],
          notes: '',
        };
    this.exerciseFeedbackData.set({ id: exId, name: exName, feedback });
  }

  toggleCategory(data: { feedback: WorkoutExerciseFeedback }, cat: FeedbackCategory) {
    const idx = data.feedback.categories.indexOf(cat);
    if (idx > -1) {
      // Don't let them unselect the last category
      if (data.feedback.categories.length > 1) {
        data.feedback.categories.splice(idx, 1);
      }
    } else {
      data.feedback.categories.push(cat);
    }
  }

  saveExerciseFeedback() {
    const data = this.exerciseFeedbackData();
    if (data) {
      this.facade.setExerciseFeedback(data.id, data.feedback);
    }
    this.exerciseFeedbackData.set(null);
  }

  isSelectorOpen = signal<boolean>(false);
  discardModalOpen = signal<boolean>(false);
  finishModalOpen = signal<boolean>(false);
  uncompletedSetsCount = signal<number>(0);
  deleteExerciseData = signal<{ id: string; name: string } | null>(null);

  async onExerciseSelected(exercise: ExerciseDefinition) {
    this.isSelectorOpen.set(false);
    await this.facade.addExercise(exercise.id, exercise.name_es || exercise.name_en);
  }

  async confirmFinishWorkout() {
    const session = this.facade.activeSession();
    if (!session) return;

    let completedSets = 0;
    let uncompletedSets = 0;

    for (const ex of session.exercises) {
      for (const set of ex.sets) {
        if (set.completed) {
          completedSets++;
        } else {
          uncompletedSets++;
        }
      }
    }

    if (completedSets === 0) {
      this.discardModalOpen.set(true);
    } else {
      this.uncompletedSetsCount.set(uncompletedSets);
      if (uncompletedSets > 0) {
        this.finishModalOpen.set(true);
      } else {
        this.sessionReportOpen.set(true);
      }
    }
  }

  async proceedToReport() {
    this.finishModalOpen.set(false);
    this.sessionReportOpen.set(true);
  }

  async executeFinishWorkout() {
    this.sessionReportOpen.set(false);
    this.finishModalOpen.set(false);

    const report = this.sessionReportData();
    if (report.energy_level || report.session_rpe || report.notes) {
      this.facade.setSessionReport(report);
    }

    const res = await this.facade.finishWorkout();
    if (res && !res.success && res.error) {
      const alert = await this.alertCtrl.create({
        header: 'Error al guardar',
        message: 'No se pudo registrar la sesión en la base de datos: ' + res.error,
        buttons: ['Entendido'],
      });
      await alert.present();
    }
  }

  confirmRemoveExercise(exerciseId: string, exerciseName: string) {
    this.deleteExerciseData.set({ id: exerciseId, name: exerciseName });
  }
}
