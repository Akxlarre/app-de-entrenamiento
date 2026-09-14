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
import { ExerciseDefinition } from '@core/facades/exercise.facade';
import { WorkoutTimerComponent } from './workout-timer.component';
import { RestTimerComponent } from './rest-timer.component';
import { GsapAnimationsService } from '@core/services/ui/gsap-animations.service';
import { IconComponent } from '@shared/components/icon/icon.component';
import { ModalComponent } from '@shared/components/modal/modal.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { CoachChatComponent } from '@shared/components/coach-chat/coach-chat.component';
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
    FormsModule,
  ],
  template: `
    <!-- Floating Header -->
    <ion-header
      class="ion-no-border"
      style="position: absolute; background: transparent; z-index: 50;"
    >
      <ion-toolbar style="--background: transparent;">
        <div class="active-header-card">
          <ion-back-button
            defaultHref="/app/workouts"
            text=""
            color="medium"
            class="back-btn"
          ></ion-back-button>
          <h1 class="header-title">Sesión</h1>
          <div style="display: flex; gap: 2px; align-items: center; flex-shrink: 0;">
            <button
              class="coach-header-btn"
              (click)="coachFacade.toggleDrawer()"
              title="Consultar a tu Coach IA"
            >
              <app-icon name="sparkles" [size]="16"></app-icon>
              Coach
            </button>
            <button
              class="discard-header-btn"
              (click)="discardModalOpen.set(true)"
              title="Descartar entrenamiento"
            >
              <app-icon name="trash-2" [size]="16"></app-icon>
            </button>
            <button class="finish-btn" (click)="confirmFinishWorkout()">
              <app-icon name="check-circle" [size]="16"></app-icon>
              Terminar
            </button>
          </div>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content class="workout-content">
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
              <div class="exercise-header">
                <div style="display:flex; align-items:center; gap: 0.5rem">
                  <span class="exercise-emoji">
                    <app-icon name="dumbbell" [size]="20"></app-icon>
                  </span>
                  <div>
                    <h3 class="exercise-title">{{ ex.exercise_name }}</h3>
                    @if (ex.rest_seconds) {
                      <span
                        style="font-size: 0.72rem; color: var(--color-primary-hover); font-weight: 700; display: inline-flex; align-items: center; gap: 2px;"
                      >
                        <app-icon name="timer" [size]="12"></app-icon> Descanso:
                        {{ ex.rest_seconds }}s
                      </span>
                    }
                  </div>
                </div>

                <button
                  class="feedback-ex-btn"
                  (click)="openExerciseFeedback(ex.exercise_id, ex.exercise_name, ex.feedback)"
                  [class.has-feedback]="ex.feedback"
                >
                  <app-icon name="message-circle" [size]="20" />
                </button>
                <button
                  class="delete-ex-btn"
                  (click)="confirmRemoveExercise(ex.exercise_id, ex.exercise_name)"
                >
                  <app-icon name="x" [size]="20" />
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
                          class="set-badge {{ set.set_type || 'normal' }}"
                          [class.completed]="set.completed"
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
                          class="check-btn"
                          [class.checked]="set.completed"
                          (click)="onToggleSet(ex.exercise_id, set.id, set.completed, $event)"
                        >
                          <app-icon name="check" [size]="18" />
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
              <button class="add-set-btn" (click)="facade.addSet(ex.exercise_id)">
                + Añadir Serie
              </button>
            </div>
          }
        </div>

        <!-- Add Exercise CTA -->
        <button class="add-exercise-btn" (click)="isSelectorOpen.set(true)">
          <app-icon name="plus" [size]="20" />
          Añadir Ejercicio
        </button>

        <!-- Bottom spacer for safe area -->
        <div class="bottom-spacer"></div>
      } @else {
        <div class="empty-workout">
          <span class="empty-emoji">
            <app-icon name="dumbbell" [size]="48" style="color: var(--text-muted)"></app-icon>
          </span>
          <h2>No hay entrenamiento activo</h2>
          <p>Inicia uno desde la pestaña Entrenar.</p>
        </div>
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

    <!-- Discard Modal -->
    <app-modal
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
      [isOpen]="finishModalOpen()"
      title="Terminar Entrenamiento"
      (closed)="finishModalOpen.set(false)"
    >
      @if (uncompletedSetsCount() > 0) {
        <div
          style="background: rgba(234, 179, 8, 0.1); border: 1px solid rgba(234, 179, 8, 0.2); border-radius: 12px; padding: 1rem; margin-bottom: 1.5rem;"
        >
          <h4
            style="color: #eab308; margin: 0 0 0.5rem 0; display: flex; align-items: center; gap: 0.5rem; font-size: 1rem;"
          >
            <app-icon name="alert-triangle" [size]="18"></app-icon> Series incompletas
          </h4>
          <p style="color: var(--text-muted); margin: 0; font-size: 0.9rem;">
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
          <button class="modal-btn-success" (click)="proceedToReport()">Continuar</button>
        </div>
      </ng-container>
    </app-modal>

    <!-- Set Type Modal -->
    <app-modal
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

    <!-- Exercise Feedback Modal -->
    <app-modal
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
              [class.selected]="data.feedback.category === 'technique'"
              (click)="data.feedback.category = 'technique'"
            >
              Técnica
            </button>
            <button
              class="category-btn"
              [class.selected]="data.feedback.category === 'pain'"
              (click)="data.feedback.category = 'pain'"
            >
              Molestia Física
            </button>
            <button
              class="category-btn"
              [class.selected]="data.feedback.category === 'equipment'"
              (click)="data.feedback.category = 'equipment'"
            >
              Equipo
            </button>
            <button
              class="category-btn"
              [class.selected]="data.feedback.category === 'intensity'"
              (click)="data.feedback.category = 'intensity'"
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
          <button class="modal-btn-success" (click)="saveExerciseFeedback()">Guardar</button>
        </div>
      </ng-container>
    </app-modal>

    <!-- Session Report Modal -->
    <app-modal
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
        <div class="rating-row" style="flex-wrap: wrap; gap: 4px;">
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
          <button class="modal-btn-success" (click)="executeFinishWorkout()">
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
      (closed)="coachFacade.closeDrawer()"
    >
      <div class="h-[calc(100vh-110px)] flex flex-col">
        <app-coach-chat
          [messages]="coachFacade.messages()"
          [isLoading]="coachFacade.isLoading()"
          (onSend)="coachFacade.sendMessage($event)"
          (onClear)="coachFacade.clearChat()"
        />
      </div>
    </app-drawer>
  `,
  styles: [
    `
      /* === TOOLBAR === */
      .workout-content {
        --background: var(--ion-background-color, #0a0a0a);
      }

      .feedback-ex-btn {
        background: transparent;
        color: rgba(255, 255, 255, 0.3);
        font-size: 1.2rem;
        padding: 0.2rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .feedback-ex-btn.has-feedback {
        color: var(--ds-brand);
        background: rgba(59, 130, 246, 0.1);
      }
      .feedback-ex-btn:active {
        background: rgba(59, 130, 246, 0.2);
      }

      .form-label {
        font-size: 0.85rem;
        color: var(--text-muted);
        font-weight: 700;
        margin-bottom: 0.5rem;
        display: block;
      }
      .mt-4 {
        margin-top: 1rem;
      }

      .category-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .category-btn,
      .rating-btn {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 0.5rem;
        color: var(--text-primary);
        font-weight: 600;
        transition: all 0.2s;
      }

      .category-btn.selected,
      .rating-btn.selected {
        background: rgba(59, 130, 246, 0.15);
        border-color: var(--ds-brand);
        color: var(--color-primary-hover);
      }

      .rating-row {
        display: flex;
        gap: 8px;
        justify-content: space-between;
      }
      .rating-btn {
        flex: 1;
        text-align: center;
      }
      .rating-btn.small {
        padding: 0.4rem 0.2rem;
      }

      .input-wrapper-feedback {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 0 0.5rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      .input-wrapper-feedback ion-input {
        --padding-start: 0;
        --padding-end: 0;
        text-align: left;
        font-weight: 400;
      }

      /* === FLOATING HEADER === */
      .active-header-card {
        margin: max(4px, env(safe-area-inset-top, 4px)) 12px 4px 12px;
        background: rgba(10, 10, 12, 0.85);
        backdrop-filter: blur(24px) saturate(180%);
        -webkit-backdrop-filter: blur(24px) saturate(180%);
        border-radius: 24px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 12px;
      }

      .back-btn {
        --color: var(--text-muted, #a1a1aa);
        margin: 0;
      }

      .header-title {
        font-size: 1rem;
        font-weight: 700;
        color: var(--text-primary);
        margin: 0;
        flex: 1;
        text-align: left;
        padding-left: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .discard-header-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 6px 8px;
        background: rgba(239, 68, 68, 0.12);
        border: 1px solid rgba(239, 68, 68, 0.25);
        border-radius: 10px;
        color: var(--state-error);
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .discard-header-btn:active {
        transform: scale(0.95);
      }

      .finish-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 10px;
        background: rgba(16, 185, 129, 0.15);
        border: 1px solid rgba(16, 185, 129, 0.25);
        border-radius: 10px;
        color: var(--state-success);
        font-weight: 700;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .finish-btn:active {
        transform: scale(0.95);
      }
      .finish-btn ion-icon {
        font-size: 1.1rem;
      }

      /* === TIMER === */
      .timer-container {
        text-align: center;
        padding: calc(80px + env(safe-area-inset-top, 0px)) 0 0.5rem 0;
      }

      /* === EXERCISES === */
      .exercises-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 0.5rem 1rem 0 1rem;
      }

      .exercise-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 16px;
        padding: 1.25rem;
      }

      .exercise-header {
        display: flex;
        align-items: center;
        gap: 0.6rem;
      }

      .exercise-emoji {
        font-size: 1.4rem;
      }

      .exercise-title {
        font-size: 1.15rem;
        font-weight: 700;
        color: var(--text-primary, #fff);
        margin: 0;
        letter-spacing: -0.01em;
      }

      .divider {
        height: 1px;
        background: rgba(255, 255, 255, 0.06);
        margin: 0.85rem 0;
      }

      /* === SET TABLE === */
      .set-header {
        display: grid;
        grid-template-columns: 36px 1fr 1fr 0.8fr 44px;
        text-align: center;
        font-size: 0.65rem;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.35);
        letter-spacing: 0.08em;
        margin-bottom: 0.5rem;
        padding: 0 2px;
      }

      .sets-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      ion-item.set-item {
        --padding-start: 0;
        --padding-end: 0;
        --inner-padding-end: 0;
        --background: transparent;
        width: 100%;
      }

      ion-item-options {
        border-radius: 10px;
        margin: 3px 0;
        overflow: hidden;
      }
      ion-item-option {
        --border-radius: 10px;
        margin-left: 6px;
      }

      .set-row {
        display: grid;
        grid-template-columns: 36px 1fr 1fr 0.8fr 44px;
        align-items: center;
        gap: 6px;
        padding: 3px;
        border-radius: 10px;
        transition: background 0.25s ease;
      }

      .set-row.is-completed {
        background: rgba(16, 185, 129, 0.08);
      }

      .set-badge {
        font-weight: 700;
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.3);
        text-align: center;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.04);
        margin: 0 auto;
        cursor: pointer;
        border: 1px solid transparent;
        transition: all 0.2s ease;
      }
      .set-badge:active {
        transform: scale(0.9);
      }

      .set-badge.normal.completed {
        background: rgba(16, 185, 129, 0.15);
        color: var(--state-success);
      }

      /* Warmup */
      .set-badge.warmup {
        background: rgba(234, 179, 8, 0.15);
        color: #eab308;
        border-color: rgba(234, 179, 8, 0.3);
      }
      .set-badge.warmup.completed {
        background: #eab308;
        color: #000;
      }

      /* Dropset */
      .set-badge.dropset {
        background: rgba(168, 85, 247, 0.15);
        color: #a855f7;
        border-color: rgba(168, 85, 247, 0.3);
      }
      .set-badge.dropset.completed {
        background: #a855f7;
        color: var(--text-primary);
      }

      /* Failure */
      .set-badge.failure {
        background: rgba(239, 68, 68, 0.15);
        color: var(--state-error);
        border-color: rgba(239, 68, 68, 0.3);
      }
      .set-badge.failure.completed {
        background: var(--state-error);
        color: var(--text-primary);
      }

      .delete-ex-btn {
        background: transparent;
        color: rgba(255, 255, 255, 0.3);
        font-size: 1.2rem;
        padding: 0.2rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .delete-ex-btn:active {
        background: rgba(255, 0, 0, 0.1);
        color: var(--state-error);
      }

      /* === INPUTS === */
      .input-wrapper {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        transition: all 0.2s ease;
        height: 42px; /* Espacio para dos líneas */
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }

      .input-wrapper:focus-within {
        background: rgba(59, 130, 246, 0.08);
        box-shadow: 0 0 0 1.5px rgba(59, 130, 246, 0.4);
      }

      .set-row.is-completed .input-wrapper {
        background: transparent;
      }

      .input-wrapper.is-previous {
        background: rgba(255, 255, 255, 0.025);
        border: 1px dashed rgba(255, 255, 255, 0.12);
      }

      .input-wrapper.is-previous ion-input {
        color: rgba(255, 255, 255, 0.35) !important;
        font-weight: 500;
      }

      .reps-wrapper {
        position: relative;
      }

      .inline-target {
        font-size: 0.55rem;
        color: var(--color-primary-hover);
        font-weight: 700;
        line-height: 1;
        margin-top: -2px;
        margin-bottom: 4px;
        pointer-events: none;
        letter-spacing: 0.02em;
      }

      .input-wrapper.is-previous:focus-within {
        background: rgba(59, 130, 246, 0.08);
        border: 1px solid rgba(59, 130, 246, 0.4);
      }

      .input-wrapper.is-previous:focus-within ion-input {
        color: var(--text-primary, #fff) !important;
        font-weight: 600;
      }

      ion-input {
        --padding-start: 0;
        --padding-end: 0;
        --padding-top: 0;
        --padding-bottom: 0;
        text-align: center;
        font-weight: 600;
        font-size: 1.05rem;
        color: var(--text-primary, #fff);
        width: 100%;
        --placeholder-color: rgba(255, 255, 255, 0.2);
        --placeholder-font-weight: 400;
      }

      .set-row.is-completed ion-input {
        color: rgba(16, 185, 129, 0.7);
      }

      /* === CHECK BUTTON === */
      .check-btn {
        width: 38px;
        height: 38px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.04);
        border: 1.5px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        color: rgba(255, 255, 255, 0.25);
        font-size: 1.15rem;
        cursor: pointer;
        transition: all 0.2s ease;
        margin: 0 auto;
      }

      .check-btn.checked {
        background: var(--state-success);
        border-color: var(--state-success);
        color: white;
        box-shadow: 0 2px 12px rgba(16, 185, 129, 0.35);
      }

      .check-btn:active {
        transform: scale(0.9);
      }

      /* === ACTION BUTTONS === */
      .add-set-btn {
        width: 100%;
        margin-top: 0.75rem;
        padding: 0.6rem;
        background: transparent;
        border: 1px dashed rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        color: rgba(255, 255, 255, 0.35);
        font-weight: 600;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .add-set-btn:active {
        background: rgba(255, 255, 255, 0.03);
        color: rgba(255, 255, 255, 0.5);
      }

      .add-exercise-btn {
        width: calc(100% - 2rem);
        margin: 1rem 1rem 0 1rem;
        padding: 0.9rem;
        background: rgba(59, 130, 246, 0.08);
        border: 1px solid rgba(59, 130, 246, 0.15);
        border-radius: 14px;
        color: var(--color-primary-hover);
        font-weight: 700;
        font-size: 0.95rem;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .add-exercise-btn:active {
        transform: scale(0.98);
      }

      .bottom-spacer {
        height: calc(2rem + env(safe-area-inset-bottom, 0px));
      }

      /* === EMPTY STATE === */
      .empty-workout {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 70%;
        text-align: center;
        padding: 2rem;
      }
      .empty-emoji {
        font-size: 3.5rem;
        margin-bottom: 1rem;
      }
      .empty-workout h2 {
        color: var(--text-primary, #fff);
        font-weight: 700;
        font-size: 1.3rem;
        margin: 0 0 0.5rem 0;
      }
      .empty-workout p {
        color: rgba(255, 255, 255, 0.4);
        margin: 0;
      }
      .coach-header-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 10px;
        background: linear-gradient(
          135deg,
          rgba(99, 102, 241, 0.2) 0%,
          rgba(168, 85, 247, 0.2) 100%
        );
        border: 1px solid rgba(168, 85, 247, 0.4);
        border-radius: 10px;
        color: #c084fc;
        font-weight: 700;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .coach-header-btn:active {
        transform: scale(0.95);
      }

      .modal-btn-cancel,
      .modal-btn-danger,
      .modal-btn-success {
        flex: 1;
        padding: 0.85rem;
        border-radius: 12px;
        font-weight: 700;
        font-size: 0.95rem;
        transition: all 0.2s ease;
      }
      .modal-btn-cancel {
        background: rgba(255, 255, 255, 0.05);
        color: var(--text-primary);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      .modal-btn-cancel:active {
        background: rgba(255, 255, 255, 0.1);
        transform: scale(0.96);
      }

      .modal-btn-danger {
        background: rgba(239, 68, 68, 0.15);
        color: var(--state-error);
        border: 1px solid rgba(239, 68, 68, 0.3);
      }
      .modal-btn-danger:active {
        background: rgba(239, 68, 68, 0.25);
        transform: scale(0.96);
      }

      .modal-btn-success {
        background: rgba(16, 185, 129, 0.15);
        color: var(--state-success);
        border: 1px solid rgba(16, 185, 129, 0.3);
      }
      .modal-btn-success:active {
        background: rgba(16, 185, 129, 0.25);
        transform: scale(0.96);
      }

      /* === SET TYPE OPTIONS === */
      .set-type-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding-bottom: 1rem;
      }

      .set-type-option {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.85rem 1rem;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: var(--text-primary);
        font-weight: 600;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .set-type-option:active {
        transform: scale(0.97);
      }

      .set-type-option .option-icon {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 0.9rem;
      }

      /* Normal */
      .set-type-option.normal.selected {
        border-color: rgba(16, 185, 129, 0.4);
        background: rgba(16, 185, 129, 0.05);
      }
      .set-type-option.normal .option-icon {
        background: rgba(255, 255, 255, 0.1);
        color: var(--text-primary);
      }
      .set-type-option.normal.selected .option-icon {
        background: var(--state-success);
        color: var(--text-primary);
      }

      /* Warmup */
      .set-type-option.warmup.selected {
        border-color: rgba(234, 179, 8, 0.4);
        background: rgba(234, 179, 8, 0.05);
      }
      .set-type-option.warmup .option-icon {
        background: rgba(234, 179, 8, 0.15);
        color: #eab308;
      }
      .set-type-option.warmup.selected .option-icon {
        background: #eab308;
        color: #000;
      }

      /* Dropset */
      .set-type-option.dropset.selected {
        border-color: rgba(168, 85, 247, 0.4);
        background: rgba(168, 85, 247, 0.05);
      }
      .set-type-option.dropset .option-icon {
        background: rgba(168, 85, 247, 0.15);
        color: #a855f7;
      }
      .set-type-option.dropset.selected .option-icon {
        background: #a855f7;
        color: var(--text-primary);
      }

      /* Failure */
      .set-type-option.failure.selected {
        border-color: rgba(239, 68, 68, 0.4);
        background: rgba(239, 68, 68, 0.05);
      }
      .set-type-option.failure .option-icon {
        background: rgba(239, 68, 68, 0.15);
        color: var(--state-error);
      }
      .set-type-option.failure.selected .option-icon {
        background: var(--state-error);
        color: var(--text-primary);
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
          category: 'technique' as FeedbackCategory,
          rating: 3,
          tags: [],
          notes: '',
        };
    this.exerciseFeedbackData.set({ id: exId, name: exName, feedback });
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
