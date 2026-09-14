import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  OnInit,
  AfterViewInit,
  effect,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import {
  IonContent,
  IonIcon,
  IonSpinner,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { barbellOutline, flameOutline, chevronForwardOutline, closeOutline } from 'ionicons/icons';
import { WorkoutFacade } from '@core/facades/workout.facade';
import { RoutineFacade } from '@core/facades/routine.facade';
import { MesocycleFacade } from '@core/facades/mesocycle.facade';
import { AppHeaderComponent } from '@shared/components/app-header/app-header.component';
import { GsapAnimationsService } from '@core/services/ui/gsap-animations.service';
import { IconComponent } from '@shared/components/icon/icon.component';
import { ModalComponent } from '@shared/components/modal/modal.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { RoutineWithExercises } from '@core/models/routine.model';

@Component({
  selector: 'app-workouts',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent,
    IonIcon,
    IonSpinner,
    DatePipe,
    DecimalPipe,
    TitleCasePipe,
    AppHeaderComponent,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IconComponent,
    ModalComponent,
  ],
  template: `
    <ion-content class="workout-home" [fullscreen]="true">
      <app-header title="Entrenar" [showStreak]="true"></app-header>

      <div class="page-container">
        <!-- CTA Principal: Iniciar o Retomar Sesión Libre -->
        <div class="start-card">
          @if (
            workoutFacade.activeSession() &&
            !workoutFacade.activeSession()?.routine_id &&
            !workoutFacade.activeSession()?.mesocycle_session_id
          ) {
            <div class="start-info">
              <h2 class="start-title" style="color: var(--state-success);">
                Entrenamiento Libre Activo
              </h2>
              <p class="start-subtitle">
                Tienes una sesión libre en curso. Continúa donde lo dejaste.
              </p>
            </div>
            <button
              class="start-btn"
              style="background: var(--state-success); box-shadow: 0 4px 16px rgba(16, 185, 129, 0.35);"
              (click)="resumeWorkout()"
            >
              <app-icon name="play" [size]="20" />
              <span>Retomar Sesión Libre</span>
            </button>
          } @else {
            <div class="start-info">
              <h2 class="start-title">Entrenamiento Libre</h2>
              <p class="start-subtitle">
                Comienza una sesión en blanco y registra tus ejercicios sobre la marcha.
              </p>
            </div>
            <button
              class="start-btn"
              (click)="workoutFacade.startAdhocWorkout()"
              [disabled]="workoutFacade.activeSession() !== null"
            >
              <app-icon name="play" [size]="20" />
              <span>Iniciar Sesión Libre</span>
            </button>
          }
        </div>

        <!-- Sección: Plan Estructurado (Mesociclo) -->
        <div class="plan-section bento-wide" style="margin-bottom: 1.5rem;">
          @if (mesoFacade.activeMesocycle()) {
            <div
              class="start-card"
              style="background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(59, 130, 246, 0.2);"
            >
              <div class="start-info" style="position: relative;">
                <div
                  style="display: flex; justify-content: space-between; align-items: flex-start;"
                >
                  <div>
                    <span
                      style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-primary-hover); font-weight: 700; margin-bottom: 0.25rem; display: block;"
                      >Mi Plan Actual</span
                    >
                    <h2 class="start-title">{{ mesoFacade.activeMesocycle()?.name }}</h2>
                  </div>
                  <button
                    (click)="goToPlan()"
                    style="background: rgba(59, 130, 246, 0.15); border: none; color: var(--color-primary-hover); font-size: 0.75rem; font-weight: 700; border-radius: 6px; padding: 6px 10px; cursor: pointer;"
                  >
                    Ver Detalles
                  </button>
                </div>

                @if (
                  workoutFacade.activeSession() &&
                  (workoutFacade.activeSession()?.routine_id ||
                    workoutFacade.activeSession()?.mesocycle_session_id)
                ) {
                  <p class="start-subtitle" style="color: var(--state-success);">
                    Tienes un entrenamiento planificado en curso.
                  </p>
                  <button
                    class="start-btn"
                    style="margin-top: 1rem; background: var(--state-success); box-shadow: 0 4px 16px rgba(16, 185, 129, 0.35);"
                    (click)="resumeWorkout()"
                  >
                    <app-icon name="play" [size]="20" />
                    <span>Retomar Plan</span>
                  </button>
                } @else if (mesoFacade.getNextSession(); as next) {
                  <p class="start-subtitle">
                    Semana {{ next.week.week_number }} • Día {{ next.session.day_number }}
                  </p>
                  <button
                    class="start-btn"
                    style="margin-top: 1rem; background: linear-gradient(135deg, var(--ds-brand) 0%, var(--color-primary-dark) 100%);"
                    (click)="
                      workoutFacade.startWorkoutFromMesocycleSession(
                        next.session,
                        next.session.routine
                      )
                    "
                    [disabled]="workoutFacade.activeSession() !== null"
                  >
                    <app-icon name="play" [size]="20" />
                    <span>Iniciar Sesión Prescrita</span>
                  </button>
                } @else {
                  <p class="start-subtitle">Has completado todas las sesiones de este bloque.</p>
                }
              </div>
            </div>
          } @else {
            <div
              class="empty-plan-card"
              style="display: flex; justify-content: space-between; align-items: center; padding: 1.25rem; background: rgba(59, 130, 246, 0.05); border: 1px dashed rgba(59, 130, 246, 0.3); border-radius: 16px;"
            >
              <div>
                <h2
                  style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 0 0 0.25rem 0;"
                >
                  Bloque de Entrenamiento
                </h2>
                <p style="font-size: 0.85rem; color: rgba(255,255,255,0.6); margin: 0;">
                  No tienes un plan estructurado.
                </p>
              </div>
              <button
                (click)="goToCreatePlan()"
                style="background: rgba(59,130,246,0.15); color: var(--color-primary-hover); border: none; padding: 0.6rem 1rem; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; white-space: nowrap;"
              >
                <app-icon name="plus" [size]="14"></app-icon> Crear Plan
              </button>
            </div>
          }
        </div>

        <!-- Sección: Mis Rutinas -->
        <div class="routines-section">
          <div
            class="section-header"
            style="justify-content: space-between; width: 100%; margin-bottom: 0.5rem;"
          >
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <h3 class="section-title">Mis Rutinas</h3>
            </div>
            <button
              (click)="goToCreateRoutine()"
              style="background: rgba(59, 130, 246, 0.1); border: none; color: var(--ds-brand); font-size: 0.85rem; font-weight: 600; cursor: pointer; padding: 0.4rem 0.8rem; border-radius: 8px; display: flex; align-items: center; gap: 0.2rem;"
            >
              <span>+ Nueva</span>
            </button>
          </div>

          @if (routineFacade.isLoading() && routineFacade.routines().length === 0) {
            <div class="loading-box">
              <ion-spinner color="primary"></ion-spinner>
              <p>Cargando rutinas...</p>
            </div>
          } @else if (routineFacade.routines().length === 0) {
            <div class="empty-feed" style="padding: 1.5rem;">
              <p style="margin: 0; font-size: 0.85rem;">No tienes rutinas creadas.</p>
            </div>
          } @else {
            <div class="routines-grid">
              @for (routine of routineFacade.routines(); track routine.id) {
                <div class="routine-card" (click)="workoutFacade.startWorkoutFromRoutine(routine)">
                  <div class="routine-card-top">
                    <h4 class="routine-name">{{ routine.name }}</h4>
                    <div class="routine-card-actions" (click)="$event.stopPropagation()">
                      <button
                        type="button"
                        class="card-icon-btn edit-btn"
                        (click)="editRoutine(routine.id)"
                        title="Editar rutina"
                      >
                        <app-icon name="pencil" [size]="13"></app-icon>
                      </button>
                      <button
                        type="button"
                        class="card-icon-btn delete-btn"
                        (click)="confirmDeleteRoutine(routine)"
                        title="Eliminar rutina"
                      >
                        <app-icon name="trash-2" [size]="13"></app-icon>
                      </button>
                    </div>
                  </div>
                  <div class="routine-card-bottom">
                    <span class="routine-summary"
                      >{{ routine.routine_exercises.length }}
                      {{
                        routine.routine_exercises.length === 1 ? 'ejercicio' : 'ejercicios'
                      }}</span
                    >
                    <span class="start-badge">Iniciar →</span>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- Mini KPIs de Rendimiento -->
        @if (workoutFacade.history().length > 0) {
          <div class="kpi-grid">
            <div class="kpi-card">
              <app-icon name="dumbbell" [size]="20" />
              <div class="kpi-data">
                <span class="kpi-val">{{ totalWorkouts() }}</span>
                <span class="kpi-lbl">Sesiones</span>
              </div>
            </div>
            <div class="kpi-card">
              <app-icon name="zap" [size]="20" />
              <div class="kpi-data">
                <span class="kpi-val">{{ formattedVolume() }}</span>
                <span class="kpi-lbl">Volumen (kg)</span>
              </div>
            </div>
            <div class="kpi-card">
              <app-icon name="timer" [size]="20" />
              <div class="kpi-data">
                <span class="kpi-val">{{ totalMinutes() }}m</span>
                <span class="kpi-lbl">Tiempo Total</span>
              </div>
            </div>
          </div>
        }

        <!-- Sección de Historial / Feed -->
        <div class="history-section">
          <div class="section-header" style="justify-content: space-between; width: 100%;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <h3 class="section-title">Historial Reciente</h3>
              @if (workoutFacade.history().length > 0) {
                <span class="badge-count">{{ totalWorkouts() }}</span>
              }
            </div>
            @if (workoutFacade.history().length > 3) {
              <button
                (click)="goToHistory()"
                style="background: none; border: none; color: var(--ds-brand); font-size: 0.85rem; font-weight: 600; cursor: pointer; padding: 0.2rem 0.5rem;"
              >
                Ver todo
              </button>
            }
          </div>

          @if (workoutFacade.isLoadingHistory() && totalWorkouts() === 0) {
            <div class="loading-box">
              <ion-spinner color="primary"></ion-spinner>
              <p>Cargando tus entrenamientos...</p>
            </div>
          } @else if (totalWorkouts() === 0) {
            <div class="empty-feed">
              <app-icon name="clipboard-list" [size]="40" class="empty-icon" />
              <h4>Aún no has registrado sesiones</h4>
              <p>
                Presiona "Iniciar Sesión" arriba para registrar tu primer entrenamiento en el gym.
              </p>
            </div>
          } @else {
            <div class="feed-list">
              @for (item of recentHistory(); track item.id) {
                <div
                  class="workout-card history-card"
                  (click)="viewDetails(item.id)"
                  style="cursor: pointer;"
                >
                  <div class="card-top">
                    <div class="card-date-box">
                      <app-icon name="calendar" [size]="14" />
                      <span class="card-date">{{
                        item.start_time | date: 'EEE, d MMM · HH:mm' | titlecase
                      }}</span>
                    </div>
                    <span class="card-duration">
                      <app-icon name="clock" [size]="14" />
                      {{ item.duration_minutes }} min
                    </span>
                  </div>

                  <div class="card-stats">
                    <div class="stat-pill">
                      <span class="stat-val">{{ item.total_volume | number: '1.0-0' }} kg</span>
                      <span class="stat-lbl">Volumen</span>
                    </div>
                    <div class="stat-pill">
                      <span class="stat-val">{{ item.total_sets }}</span>
                      <span class="stat-lbl">{{ item.total_sets === 1 ? 'Serie' : 'Series' }}</span>
                    </div>
                    <div class="stat-pill">
                      <span class="stat-val">{{ item.exercises_summary.length }}</span>
                      <span class="stat-lbl">{{
                        item.exercises_summary.length === 1 ? 'Ejercicio' : 'Ejercicios'
                      }}</span>
                    </div>
                  </div>

                  @if (item.exercises_summary.length > 0) {
                    <div class="card-exercises">
                      @for (ex of item.exercises_summary; track ex) {
                        <span class="exercise-chip">{{ ex }}</span>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>

        <div class="safe-bottom"></div>
      </div>

      <!-- Detail Modal -->
      <ion-modal [isOpen]="isDrawerOpen()" (didDismiss)="closeDetails()">
        <ng-template>
          <ion-header class="ion-no-border">
            <ion-toolbar style="--background: var(--bg-base);">
              <ion-title style="color: var(--text-primary); font-weight: 700; font-size: 1.1rem;">
                Detalle de Sesión
              </ion-title>
              <ion-buttons slot="end">
                <ion-button (click)="closeDetails()" style="color: var(--text-muted);">
                  <ion-icon name="close-outline" slot="icon-only"></ion-icon>
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>

          <ion-content class="ion-padding" style="--background: var(--bg-base);">
            @if (selectedWorkout(); as workout) {
              <div
                style="display: flex; flex-direction: column; gap: 1rem; color: var(--text-primary); max-width: 600px; margin: 0 auto;"
              >
                <div
                  style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); padding-bottom: 1rem;"
                >
                  <div>
                    <div
                      style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;"
                    >
                      Fecha
                    </div>
                    <div style="font-weight: 500;">
                      {{ workout.start_time | date: 'EEEE, d MMMM yyyy' | titlecase }}
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <div
                      style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;"
                    >
                      Duración
                    </div>
                    <div style="font-weight: 500;">{{ workout.duration_minutes }} min</div>
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                  <div
                    style="background: var(--bg-subtle); padding: 1rem; border-radius: 12px; text-align: center;"
                  >
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--color-primary);">
                      {{ workout.total_volume | number: '1.0-0' }}
                    </div>
                    <div
                      style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;"
                    >
                      Volumen (kg)
                    </div>
                  </div>
                  <div
                    style="background: var(--bg-subtle); padding: 1rem; border-radius: 12px; text-align: center;"
                  >
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--color-primary);">
                      {{ workout.total_sets }}
                    </div>
                    <div
                      style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;"
                    >
                      Series Totales
                    </div>
                  </div>
                </div>

                @if (workout.energy_level || workout.session_rpe || workout.notes) {
                  <div
                    style="background: var(--bg-subtle); padding: 1rem; border-radius: 12px; display: flex; flex-direction: column; gap: 0.75rem;"
                  >
                    @if (workout.energy_level || workout.session_rpe) {
                      <div style="display: flex; gap: 1.5rem;">
                        @if (workout.energy_level) {
                          <div>
                            <div
                              style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;"
                            >
                              Energía
                            </div>
                            <div style="font-weight: 500;">{{ workout.energy_level }}/5</div>
                          </div>
                        }
                        @if (workout.session_rpe) {
                          <div>
                            <div
                              style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;"
                            >
                              RPE
                            </div>
                            <div style="font-weight: 500;">{{ workout.session_rpe }}/10</div>
                          </div>
                        }
                      </div>
                    }
                    @if (workout.notes) {
                      <div>
                        <div
                          style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; margin-bottom: 0.25rem;"
                        >
                          Notas
                        </div>
                        <div style="font-weight: 500; font-style: italic;">
                          {{ workout.notes }}
                        </div>
                      </div>
                    }
                  </div>
                }

                <div style="margin-top: 0.5rem;">
                  <h4
                    style="font-size: 1rem; font-weight: 700; margin-bottom: 1rem; color: var(--text-primary);"
                  >
                    Ejercicios Realizados
                  </h4>
                  <div style="display: flex; flex-direction: column; gap: 1rem;">
                    @for (ex of workout.detailed_exercises; track ex.name) {
                      <div
                        style="background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: 12px; overflow: hidden;"
                      >
                        <div
                          style="background: var(--bg-subtle); padding: 0.75rem 1rem; font-weight: 600; border-bottom: 1px solid var(--border-subtle);"
                        >
                          {{ ex.name }}
                        </div>
                        <div style="padding: 0.5rem 1rem;">
                          @for (set of ex.sets; track set.set_number; let i = $index) {
                            <div
                              style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid var(--border-subtle); font-size: 0.9rem;"
                            >
                              <div
                                style="display: flex; align-items: center; gap: 0.5rem; width: 80px;"
                              >
                                <span style="color: var(--text-muted); font-weight: 600;"
                                  >S{{ i + 1 }}</span
                                >
                                @if (set.set_type === 'warmup') {
                                  <span
                                    style="background: rgba(234, 179, 8, 0.15); color: #eab308; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; text-transform: uppercase;"
                                    >W</span
                                  >
                                } @else if (set.set_type === 'dropset') {
                                  <span
                                    style="background: rgba(168, 85, 247, 0.15); color: #a855f7; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; text-transform: uppercase;"
                                    >D</span
                                  >
                                } @else if (set.set_type === 'failure') {
                                  <span
                                    style="background: rgba(239, 68, 68, 0.15); color: var(--state-error); font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; text-transform: uppercase;"
                                    >F</span
                                  >
                                }
                              </div>
                              <div style="font-weight: 500;">{{ set.weight }} kg</div>
                              <div style="font-weight: 500;">{{ set.reps }} reps</div>
                              <div
                                style="font-weight: 500; color: var(--text-muted); font-size: 0.85rem;"
                              >
                                RIR: {{ set.rir ?? '-' }}
                              </div>
                            </div>
                          }
                        </div>
                      </div>
                    }
                    @if (workout.detailed_exercises?.length === 0) {
                      <div
                        style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 1rem;"
                      >
                        No se registraron ejercicios detallados.
                      </div>
                    }
                  </div>
                </div>
              </div>
            }
          </ion-content>
        </ng-template>
      </ion-modal>

      <!-- Modal Confirmación Eliminar Rutina -->
      <app-modal
        [isOpen]="routineToDelete() !== null"
        title="Eliminar Rutina"
        (closed)="routineToDelete.set(null)"
      >
        @if (routineToDelete(); as r) {
          <p
            style="color: var(--text-muted); margin-bottom: 1.5rem; font-size: 0.95rem; line-height: 1.5;"
          >
            ¿Estás seguro de que deseas eliminar la rutina
            <strong style="color: var(--text-primary)">{{ r.name }}</strong
            >? Esta acción no se puede deshacer.
          </p>
        }
        <ng-container appModalFooter>
          <div style="display: flex; gap: 1rem; width: 100%;">
            <button class="modal-btn-cancel" (click)="routineToDelete.set(null)">Cancelar</button>
            <button class="modal-btn-danger" (click)="deleteRoutineConfirmed()">Eliminar</button>
          </div>
        </ng-container>
      </app-modal>
    </ion-content>
  `,
  styles: [
    `
      /* === TOP APP HEADER === */
      .app-top-header {
        position: sticky;
        top: 0;
        z-index: 50;
        background: rgba(10, 10, 12, 0.88);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        padding: 1rem 1.25rem 0.85rem 1.25rem;
      }
      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        max-width: 600px;
        margin: 0 auto;
      }
      .title-group {
        display: flex;
        flex-direction: column;
      }
      .brand-tag {
        font-size: 0.68rem;
        font-weight: 800;
        letter-spacing: 0.14em;
        color: var(--ds-brand);
        text-transform: uppercase;
      }
      .page-main-title {
        font-family: var(--font-display);
        font-size: 1.75rem;
        font-weight: 900;
        letter-spacing: -0.03em;
        color: var(--text-primary);
        margin: 0.15rem 0 0 0;
        line-height: 1.1;
      }
      .streak-pill {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.4rem 0.8rem;
        background: rgba(59, 130, 246, 0.1);
        border: 1px solid rgba(59, 130, 246, 0.2);
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--color-primary-hover);
      }
      .streak-fire {
        font-size: 0.85rem;
      }
      .workout-home {
        --background: var(--ion-background-color, #0a0a0a);
      }
      .page-container {
        padding: 1rem;
        padding-bottom: calc(90px + env(safe-area-inset-bottom, 16px));
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        max-width: 600px;
        margin: 0 auto;
      }

      /* === START CARD HERO === */
      .start-card {
        background: linear-gradient(
          135deg,
          rgba(59, 130, 246, 0.12) 0%,
          rgba(37, 99, 235, 0.04) 100%
        );
        border: 1px solid rgba(59, 130, 246, 0.25);
        border-radius: 20px;
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
      }
      .start-title {
        font-family: var(--font-display);
        font-size: 1.35rem;
        font-weight: 800;
        color: var(--text-primary);
        margin: 0 0 0.4rem 0;
        letter-spacing: -0.01em;
      }
      .start-subtitle {
        color: rgba(255, 255, 255, 0.6);
        font-size: 0.88rem;
        line-height: 1.45;
        margin: 0;
      }
      .start-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.6rem;
        width: 100%;
        padding: 0.95rem;
        background: var(--ds-brand);
        color: var(--color-primary-text);
        font-weight: 700;
        font-size: 1rem;
        border: none;
        border-radius: 14px;
        cursor: pointer;
        box-shadow: 0 4px 16px rgba(59, 130, 246, 0.35);
        transition: all 0.15s ease;
      }
      .start-btn:active {
        transform: scale(0.98);
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
      }

      /* === KPI GRID === */
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.6rem;
      }
      .kpi-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 14px;
        padding: 0.75rem 0.5rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 0.3rem;
      }
      .kpi-data {
        display: flex;
        flex-direction: column;
      }
      .kpi-val {
        font-weight: 800;
        font-size: 1.05rem;
        color: var(--text-primary);
      }
      .kpi-lbl {
        font-size: 0.65rem;
        color: rgba(255, 255, 255, 0.4);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 600;
      }

      /* === ROUTINES SECTION === */
      .routines-section {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .routines-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
      }
      .routine-card {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 14px;
        padding: 0.9rem;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .routine-card:active {
        transform: scale(0.98);
        background: rgba(255, 255, 255, 0.07);
      }
      .routine-card-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 0.5rem;
      }
      .routine-name {
        font-size: 0.95rem;
        font-weight: 700;
        color: var(--text-primary);
        margin: 0;
        line-height: 1.25;
        flex: 1;
      }
      .routine-card-actions {
        display: flex;
        gap: 0.25rem;
      }
      .card-icon-btn {
        background: rgba(255, 255, 255, 0.06);
        border: none;
        color: rgba(255, 255, 255, 0.6);
        width: 26px;
        height: 26px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .card-icon-btn.edit-btn:hover {
        background: rgba(59, 130, 246, 0.2);
        color: var(--color-primary-hover);
      }
      .card-icon-btn.delete-btn:hover {
        background: rgba(239, 68, 68, 0.2);
        color: var(--state-error);
      }
      .routine-card-bottom {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .routine-summary {
        font-size: 0.72rem;
        color: rgba(255, 255, 255, 0.5);
        margin: 0;
      }
      .start-badge {
        font-size: 0.72rem;
        font-weight: 700;
        color: var(--ds-brand);
      }

      .modal-btn-cancel,
      .modal-btn-danger {
        flex: 1;
        padding: 0.85rem;
        border-radius: 12px;
        font-weight: 700;
        font-size: 0.95rem;
        transition: all 0.2s ease;
        cursor: pointer;
      }
      .modal-btn-cancel {
        background: rgba(255, 255, 255, 0.05);
        color: var(--text-primary, #fff);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      .modal-btn-danger {
        background: rgba(239, 68, 68, 0.15);
        color: var(--state-error);
        border: 1px solid rgba(239, 68, 68, 0.3);
      }

      /* === HISTORY SECTION === */
      .history-section {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
      }
      .section-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .section-title {
        font-family: var(--font-display);
        font-size: 1.05rem;
        font-weight: 700;
        color: var(--text-primary);
        margin: 0;
        letter-spacing: -0.01em;
      }
      .badge-count {
        background: rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.6);
        font-size: 0.75rem;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 12px;
      }

      .feed-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .workout-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 16px;
        padding: 1.15rem;
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
        transition: all 0.15s ease;
      }
      .workout-card:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.1);
      }
      .card-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.82rem;
      }
      .card-date-box {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        color: rgba(255, 255, 255, 0.85);
        font-weight: 600;
        text-transform: capitalize;
      }
      .card-date-box app-icon {
        color: var(--ds-brand);
      }
      .card-duration {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        color: rgba(255, 255, 255, 0.4);
        font-weight: 500;
      }

      .card-stats {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem 0.75rem;
      }
      .stat-pill {
        background: rgba(255, 255, 255, 0.04);
        padding: 0.4rem 0.75rem;
        border-radius: 8px;
        display: flex;
        align-items: baseline;
        gap: 0.35rem;
      }
      .stat-val {
        font-weight: 800;
        color: var(--text-primary);
        font-size: 0.95rem;
      }
      .stat-lbl {
        color: rgba(255, 255, 255, 0.4);
        font-size: 0.72rem;
        font-weight: 600;
      }

      .exercise-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
      }
      .ex-tag {
        background: rgba(59, 130, 246, 0.08);
        color: #93c5fd;
        border: 1px solid rgba(59, 130, 246, 0.15);
        border-radius: 6px;
        font-size: 0.72rem;
        padding: 2px 7px;
        font-weight: 500;
      }

      /* === EMPTY & LOADING STATES === */
      .loading-box,
      .empty-feed {
        background: rgba(255, 255, 255, 0.02);
        border: 1px dashed rgba(255, 255, 255, 0.06);
        border-radius: 16px;
        padding: 2.5rem 1.5rem;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.6rem;
      }
      .empty-icon {
        margin-bottom: 0.2rem;
      }
      .empty-feed h4 {
        margin: 0;
        color: var(--text-primary);
        font-weight: 700;
        font-size: 1rem;
      }
      .empty-feed p,
      .loading-box p {
        margin: 0;
        color: rgba(255, 255, 255, 0.45);
        font-size: 0.82rem;
        line-height: 1.4;
        max-width: 300px;
      }

      .safe-bottom {
        height: 2.5rem;
      }
    `,
  ],
})
export class WorkoutsPage implements OnInit, AfterViewInit {
  workoutFacade = inject(WorkoutFacade);
  routineFacade = inject(RoutineFacade);
  mesoFacade = inject(MesocycleFacade);
  gsap = inject(GsapAnimationsService);
  router = inject(Router);

  // Estado del modal de detalles
  selectedWorkoutId = signal<string | null>(null);
  isDrawerOpen = computed(() => this.selectedWorkoutId() !== null);
  selectedWorkout = computed(() => {
    const id = this.selectedWorkoutId();
    if (!id) return null;
    return this.workoutFacade.history().find((w) => w.id === id) || null;
  });

  resumeWorkout() {
    this.router.navigate(['/app/workouts/active']);
  }

  goToHistory() {
    this.router.navigate(['/app/workouts/history']);
  }

  goToPlan() {
    this.router.navigate(['/app/workouts/plan']);
  }

  goToCreatePlan() {
    this.router.navigate(['/app/workouts/plan/create']);
  }

  goToCreateRoutine() {
    this.router.navigate(['/app/workouts/routines/create']);
  }

  routineToDelete = signal<RoutineWithExercises | null>(null);

  editRoutine(routineId: string) {
    this.router.navigate(['/app/workouts/routines/edit', routineId]);
  }

  confirmDeleteRoutine(routine: RoutineWithExercises) {
    this.routineToDelete.set(routine);
  }

  async deleteRoutineConfirmed() {
    const routine = this.routineToDelete();
    if (routine) {
      await this.routineFacade.deleteRoutine(routine.id);
      this.routineToDelete.set(null);
    }
  }

  totalWorkouts = computed(() => this.workoutFacade.history().length);
  recentHistory = computed(() => this.workoutFacade.history().slice(0, 3));

  formattedVolume = computed(() => {
    const total = this.workoutFacade.history().reduce((acc, curr) => acc + curr.total_volume, 0);
    if (total >= 1000) {
      return (total / 1000).toFixed(1) + 'k';
    }
    return total.toString();
  });

  totalMinutes = computed(() => {
    return this.workoutFacade.history().reduce((acc, curr) => acc + curr.duration_minutes, 0);
  });

  constructor() {
    addIcons({
      barbellOutline,
      flameOutline,
      chevronForwardOutline,
      closeOutline,
    });

    effect(() => {
      if (this.workoutFacade.history().length > 0) {
        setTimeout(() => {
          const cards = document.querySelectorAll('.history-card');
          this.gsap.staggerListItems(cards as any);
        }, 50);
      }
    });
  }

  ngOnInit() {
    if (this.workoutFacade.history().length === 0) {
      this.workoutFacade.loadHistory();
    }
    this.routineFacade.loadRoutines();
    this.mesoFacade.loadActiveMesocycle();
  }

  viewDetails(id: string) {
    this.selectedWorkoutId.set(id);
  }

  closeDetails() {
    this.selectedWorkoutId.set(null);
  }

  ngAfterViewInit() {}
}
