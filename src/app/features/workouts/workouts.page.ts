import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  OnInit,
  AfterViewInit,
  ElementRef,
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
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { SkeletonBlockComponent } from '@shared/components/skeleton-block/skeleton-block.component';
import { SessionDetailComponent } from './components/session-detail/session-detail.component';
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
    EmptyStateComponent, SkeletonBlockComponent,
    SkeletonBlockComponent,
    SessionDetailComponent,
  ],
  template: `
    <ion-content class="workout-home tier-ceremonia" [fullscreen]="true">
      <app-header title="Entrenar"></app-header>

      <div class="page-container">
        <!-- CTA Principal: Iniciar o Retomar Sesión Libre -->
        <div class="start-card" data-anim="ceremonia" [class.is-running]="hasFreeSessionRunning()">
          @if (hasFreeSessionRunning()) {
            <div class="start-info">
              <span class="start-eyebrow indicator-live">En curso</span>
              <h2 class="start-title">Entrenamiento Libre</h2>
              <p class="start-subtitle">
                Tienes una sesión libre en curso. Continúa donde lo dejaste.
              </p>
            </div>
            <button class="start-btn" (click)="resumeWorkout()">
              <app-icon name="play" [size]="20" [ariaHidden]="true" />
              <span>Retomar Sesión Libre</span>
            </button>
          } @else {
            <div class="start-info">
              <h2 class="start-title">Entrenamiento Libre</h2>
              <p class="start-subtitle">
                Comienza una sesión en blanco y registra tus ejercicios sobre la marcha.
              </p>
            </div>
            <button class="start-btn" (click)="workoutFacade.startAdhocWorkout()">
              <app-icon name="play" [size]="20" />
              <span>Iniciar Sesión Libre</span>
            </button>
          }
        </div>

        <!-- Sección: Plan Estructurado (Mesociclo) -->
        <div class="plan-section" data-anim="bloque">
          @if (mesoFacade.isLoading()) {
            <div class="plan-card" style="pointer-events: none;">
              <div class="plan-card__head" style="margin-bottom: 12px;">
                <div class="plan-card__id">
                  <app-skeleton-block variant="text" width="100px" height="12px" />
                  <app-skeleton-block variant="text" width="180px" height="22px" style="margin-top: 6px;" />
                </div>
              </div>
              <app-skeleton-block variant="text" width="55%" height="14px" style="margin-bottom: 16px;" />
              <app-skeleton-block variant="rect" width="100%" height="48px" style="border-radius: 999px;" />
            </div>
          } @else if (mesoFacade.activeMesocycle(); as meso) {
            <div class="plan-card" [class.is-running]="hasPlannedSessionRunning()">
              <div class="plan-card__head">
                <div class="plan-card__id">
                  <span class="plan-eyebrow">Mi Plan Actual</span>
                  <h2 class="start-title">{{ meso.name }}</h2>
                </div>
                <button type="button" class="section-action" (click)="goToPlan()">
                  <span>Ver detalles</span>
                </button>
              </div>

              @if (hasPlannedSessionRunning()) {
                <p class="start-subtitle start-subtitle--running">
                  <span class="indicator-live"></span>
                  Tienes un entrenamiento planificado en curso.
                </p>
                <button class="start-btn" (click)="resumeWorkout()">
                  <app-icon name="play" [size]="20" [ariaHidden]="true" />
                  <span>Retomar Plan</span>
                </button>
              } @else if (mesoFacade.getNextSession(); as next) {
                <p class="start-subtitle">
                  Semana <b>{{ next.week.week_number }}</b> · Día
                  <b>{{ next.session.day_number }}</b>
                </p>
                <button
                  class="start-btn"
                  (click)="
                    workoutFacade.startWorkoutFromMesocycleSession(
                      next.session,
                      next.session.routine
                    )
                  "
                >
                  <app-icon name="play" [size]="20" [ariaHidden]="true" />
                  <span>Iniciar Sesión Prescrita</span>
                </button>
              } @else {
                <p class="start-subtitle">Has completado todas las sesiones de este bloque.</p>
              }
            </div>
          } @else {
            <div class="empty-plan-card">
              <div class="empty-plan-card__text">
                <h2 class="empty-plan-card__title">Bloque de Entrenamiento</h2>
                <p class="empty-plan-card__sub">No tienes un plan estructurado.</p>
              </div>
              <button
                type="button"
                class="section-action"
                (click)="goToCreatePlan()"
                data-llm-action="crear-plan"
              >
                <app-icon name="plus" [size]="16" [ariaHidden]="true"></app-icon>
                <span>Crear Plan</span>
              </button>
            </div>
          }
        </div>

        <!-- Sección: Mis Rutinas -->
        <div class="routines-section" data-anim="bloque">
          <div class="section-header">
            <h3 class="section-title">Mis Rutinas</h3>
            <button
              type="button"
              class="section-action"
              (click)="goToCreateRoutine()"
              data-llm-action="crear-rutina"
            >
              <app-icon name="plus" [size]="16" [ariaHidden]="true" />
              <span>Nueva</span>
            </button>
          </div>

          @if (routineFacade.isLoading() && routineFacade.routines().length === 0) {
            <div class="routines-grid">
              @for (i of [1, 2, 3]; track i) {
                <div class="routine-card" style="pointer-events: none;">
                  <div class="routine-card-top">
                    <app-skeleton-block variant="text" [width]="i === 1 ? '65%' : i === 2 ? '50%' : '55%'" height="16px" />
                  </div>
                  <app-skeleton-block variant="text" [width]="i === 1 ? '80%' : i === 2 ? '70%' : '60%'" height="13px" style="margin-top: 10px;" />
                </div>
              }
            </div>
          } @else if (routineFacade.routines().length === 0) {
            <app-empty-state
              message="Todavía no tenés rutinas"
              subtitle="Armá una plantilla con tus ejercicios y empezá tus sesiones con un toque."
              icon="clipboard-list"
              actionLabel="Crear rutina"
              actionIcon="plus"
              (action)="goToCreateRoutine()"
            />
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
                        [attr.aria-label]="'Editar rutina ' + routine.name"
                        data-llm-action="editar-rutina"
                      >
                        <app-icon name="pencil" [size]="16" [ariaHidden]="true"></app-icon>
                      </button>
                      <button
                        type="button"
                        class="card-icon-btn delete-btn"
                        (click)="confirmDeleteRoutine(routine)"
                        [attr.aria-label]="'Eliminar rutina ' + routine.name"
                        data-llm-action="delete-rutina"
                      >
                        <app-icon name="trash-2" [size]="16" [ariaHidden]="true"></app-icon>
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
          <div class="kpi-grid" data-anim="bloque">
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
        <div class="history-section" data-anim="bloque">
          <div class="section-header">
            <div class="section-header__title">
              <h3 class="section-title">Historial Reciente</h3>
              @if (workoutFacade.history().length > 0) {
                <span class="badge-count">{{ totalWorkouts() }}</span>
              }
            </div>
            @if (workoutFacade.history().length > 3) {
              <button type="button" class="section-action" (click)="goToHistory()">
                <span>Ver todo</span>
                <app-icon name="chevron-right" [size]="16" [ariaHidden]="true" />
              </button>
            }
          </div>

          @if (workoutFacade.isLoadingHistory() && totalWorkouts() === 0) {
            <div class="loading-box">
              <ion-spinner color="primary"></ion-spinner>
              <p>Cargando tus entrenamientos...</p>
            </div>
          } @else if (totalWorkouts() === 0) {
            <app-empty-state
              message="Todavía no registraste sesiones"
              subtitle="Cuando termines tu primer entrenamiento, vas a verlo acá con su volumen, series y duración."
              icon="clipboard-list"
            />
          } @else {
            <div class="feed-list">
              @for (item of recentHistory(); track item.id) {
                <div class="workout-card history-card" (click)="viewDetails(item.id)">
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
              <app-session-detail [workout]="workout" />
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
          <p class="confirm-text">
            ¿Estás seguro de que deseas eliminar la rutina
            <strong>{{ r.name }}</strong
            >? Esta acción no se puede deshacer.
          </p>
        }
        <ng-container appModalFooter>
          <div class="confirm-actions">
            <button type="button" class="modal-btn-cancel" (click)="routineToDelete.set(null)">
              Cancelar
            </button>
            <button
              type="button"
              class="modal-btn-danger"
              (click)="deleteRoutineConfirmed()"
              data-llm-action="delete-rutina"
            >
              Eliminar
            </button>
          </div>
        </ng-container>
      </app-modal>
    </ion-content>
  `,
  styles: [
    `
      .workout-home {
        --background: var(--bg-base);
      }
      .page-container {
        padding: var(--tier-pad, var(--space-4));
        /* El shell publica cuánto mide su cromo inferior (tabs + barra de
           sesión cuando la hay). La vista no adivina el número. */
        padding-bottom: var(--chrome-bottom, 114px);
        display: flex;
        flex-direction: column;
        gap: var(--tier-gap, var(--space-5));
        max-width: 600px;
        margin: 0 auto;
      }

      /* === ARRANQUE DE SESIÓN — la única ceremonia de la vista ===
         Es el suelo carmesí del Tier 1, el que se construyó en la
         fundación y hasta ahora no se había usado en ningún lado.
         Solo este bloque lo gasta: la tarjeta de plan queda como
         superficie normal, y así aparece la jerarquía que antes no
         existía entre el camino primario y el secundario. */
      .start-card {
        position: relative;
        overflow: hidden;
        background: var(--gradient-hero);
        border: none;
        border-radius: var(--radius-xl);
        padding: var(--space-6);
        display: flex;
        flex-direction: column;
        gap: var(--space-5);
      }

      /* La corona de ember, contenida detrás del contenido. */
      .start-card::after {
        content: '';
        position: absolute;
        inset: 0;
        background: radial-gradient(90% 130% at 50% 118%, var(--accent-glow) 0%, transparent 62%);
        pointer-events: none;
      }
      .start-card > * {
        position: relative;
        z-index: 1;
      }

      /* Sobre el carmesí TODO el texto va en hueso: 6.9:1 en el extremo
         más claro del degradado. El gris secundario daría 2.5:1. */
      .start-eyebrow {
        display: inline-flex;
        align-items: center;
        font-family: var(--font-body);
        font-size: var(--text-xs);
        font-weight: var(--font-bold);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-primary);
        margin-bottom: var(--space-3);
      }
      /* El punto pulsante hereda el ember del DS; acá el fondo es
         carmesí, así que se pinta en hueso para no perderse. */
      .start-eyebrow.indicator-live::before,
      .start-eyebrow.indicator-live::after {
        background: var(--text-primary);
      }

      /* Tipografía de impacto: es Tier 1 y renderiza por encima de
         --font-display-floor (28px), que es su condición de uso. */
      .start-title {
        font-family: var(--font-display);
        font-weight: var(--font-regular);
        font-size: 28px;
        line-height: 1.05;
        letter-spacing: 0.005em;
        color: var(--text-primary);
        margin: 0 0 var(--space-2) 0;
      }
      .start-subtitle {
        color: var(--text-primary);
        font-size: var(--text-sm);
        line-height: var(--leading-normal);
        margin: 0;
      }
      .start-subtitle b {
        color: var(--text-primary);
        font-family: var(--font-data);
        font-variant-numeric: tabular-nums;
      }
      .start-subtitle--running {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        color: var(--ds-brand);
        margin-top: var(--space-3);
      }

      .start-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-2);
        width: 100%;
        min-height: var(--tier-target, var(--target-min));
        padding: var(--space-3) var(--space-4);
        background: var(--btn-primary-bg);
        color: var(--btn-primary-text);
        font-family: var(--font-body);
        font-weight: var(--font-bold);
        font-size: var(--text-base);
        border: none;
        border-radius: var(--radius-lg);
        cursor: pointer;
        transition: var(--transition-btn);
      }
      .start-btn:active:not(:disabled) {
        background: var(--btn-primary-bg-hover);
        transform: scale(var(--btn-press-scale-value));
      }

      /* Sobre el suelo carmesí el ember pierde separación del fondo.
         Acá el CTA va en hueso con texto tinta (17.7:1): pasa a ser el
         elemento más brillante de la pantalla, que es exactamente lo
         que la acción primaria de la app debería ser. */
      .start-card .start-btn {
        background: var(--text-primary);
        color: var(--brand-ink);
      }
      .start-card .start-btn:active:not(:disabled) {
        background: var(--bone-pressed);
      }

      /* === KPI GRID === */
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--space-2);
      }
      .kpi-card {
        background: var(--bg-surface);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-lg);
        padding: var(--space-3) var(--space-2);
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: var(--space-1);
        color: var(--text-muted);
      }
      .kpi-data {
        display: flex;
        flex-direction: column;
      }
      /* Es un dato: tipografía de datos con cifras de ancho fijo,
         nunca la de impacto. */
      .kpi-val {
        font-family: var(--font-data);
        font-variant-numeric: tabular-nums;
        font-weight: var(--font-bold);
        font-size: var(--text-lg);
        color: var(--text-primary);
      }
      .kpi-lbl {
        font-family: var(--font-body);
        font-size: var(--text-xs);
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: var(--font-semibold);
      }

      /* === ROUTINES SECTION === */
      .routines-section {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      /* auto-fit, no repeat(2): con una sola rutina, dos columnas fijas
         dejaban media pantalla vacía al lado de la tarjeta. Ahora los
         items llenan el ancho que haya. */
      .routines-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 0.75rem;
      }
      .routine-card {
        background: var(--bg-surface);
        border: 1px solid var(--border-default);
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
        background: var(--bg-elevated);
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
      /* La caja visible queda compacta para no inflar la tarjeta, pero el
         área táctil llega al piso de 44px con un ::after invisible
         centrado. Antes medía 26px: imposible de acertar con el pulgar. */
      .card-icon-btn {
        position: relative;
        background: var(--bg-subtle);
        border: none;
        color: var(--text-secondary);
        width: 32px;
        height: 32px;
        border-radius: var(--radius-sm);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: var(--transition-color);
      }
      .card-icon-btn::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: var(--target-min);
        height: var(--target-min);
      }
      .card-icon-btn.edit-btn:hover {
        background: var(--color-primary-muted);
        color: var(--ds-brand);
      }
      .card-icon-btn.delete-btn:hover {
        background: var(--state-error-bg);
        color: var(--state-error);
      }
      .routine-card-bottom {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .routine-summary {
        font-size: var(--text-xs);
        color: var(--text-muted);
        margin: 0;
      }
      .start-badge {
        font-size: var(--text-xs);
        font-weight: 700;
        color: var(--ds-brand);
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
        justify-content: space-between;
        gap: var(--space-2);
        width: 100%;
      }
      .section-header__title {
        display: flex;
        align-items: center;
        gap: var(--space-2);
      }
      /* h3 no lleva la tipografía de impacto: a este tamaño quedaría
         por debajo de --font-display-floor. */
      .section-title {
        font-family: var(--font-body);
        font-size: var(--text-lg);
        font-weight: var(--font-bold);
        color: var(--text-primary);
        margin: 0;
      }
      .badge-count {
        background: var(--bg-subtle);
        color: var(--text-secondary);
        font-family: var(--font-data);
        font-variant-numeric: tabular-nums;
        font-size: var(--text-xs);
        font-weight: var(--font-bold);
        padding: 2px var(--space-2);
        border-radius: var(--radius-full);
      }

      /* Acción secundaria de sección: "Nueva", "Ver todo", "Ver detalles".
         Área táctil completa aunque el texto sea corto. */
      .section-action {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-1);
        min-height: var(--tier-target, var(--target-min));
        padding: var(--space-2) var(--space-3);
        background: var(--color-primary-muted);
        border: none;
        border-radius: var(--radius-md);
        color: var(--ds-brand);
        font-family: var(--font-body);
        font-size: var(--text-sm);
        font-weight: var(--font-bold);
        cursor: pointer;
        white-space: nowrap;
        transition: var(--transition-btn);
      }
      .section-action:active {
        transform: scale(var(--btn-press-scale-value));
      }

      /* === PLAN / MESOCICLO === */
      .plan-card {
        background: var(--bg-surface);
        border: var(--tier-border, var(--border-tier1)) solid var(--border-default);
        border-radius: var(--radius-xl);
        padding: var(--space-5);
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
      }
      .plan-card.is-running {
        border-color: var(--accent-border);
      }
      .plan-card__head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: var(--space-3);
      }
      .plan-card__id {
        min-width: 0;
      }
      .plan-eyebrow {
        display: block;
        font-family: var(--font-body);
        font-size: var(--text-xs);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--ds-brand);
        font-weight: var(--font-bold);
        margin-bottom: var(--space-1);
      }

      .empty-plan-card {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-5);
        background: var(--bg-surface);
        border: 1px dashed var(--border-strong);
        border-radius: var(--radius-xl);
      }
      .empty-plan-card__title {
        font-family: var(--font-body);
        font-size: var(--text-lg);
        font-weight: var(--font-bold);
        color: var(--text-primary);
        margin: 0 0 var(--space-1) 0;
      }
      .empty-plan-card__sub {
        font-size: var(--text-sm);
        color: var(--text-secondary);
        margin: 0;
      }

      /* === CONFIRMACIÓN DE BORRADO === */
      .confirm-text {
        color: var(--text-secondary);
        margin-bottom: var(--space-6);
        font-size: var(--text-base);
        line-height: var(--leading-normal);
      }
      .confirm-text strong {
        color: var(--text-primary);
      }
      .confirm-actions {
        display: flex;
        gap: var(--space-4);
        width: 100%;
      }
      .confirm-actions button {
        min-height: var(--tier-target, var(--target-min));
      }

      .feed-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .workout-card {
        background: var(--bg-surface);
        border: 1px solid var(--border-subtle);
        border-radius: 16px;
        padding: 1.15rem;
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
        transition: all 0.15s ease;
      }
      .workout-card:hover {
        background: var(--bg-elevated);
        border-color: var(--border-default);
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
        color: var(--text-primary);
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
        color: var(--text-muted);
        font-weight: 500;
      }

      .card-stats {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem 0.75rem;
      }
      .stat-pill {
        background: var(--bg-elevated);
        padding: 0.4rem 0.75rem;
        border-radius: 8px;
        display: flex;
        align-items: baseline;
        gap: 0.35rem;
      }
      /* Volumen, series y ejercicios se comparan entre tarjetas:
         cifras de ancho fijo para que las columnas se lean alineadas. */
      .stat-val {
        font-family: var(--font-data);
        font-variant-numeric: tabular-nums;
        font-weight: var(--font-bold);
        color: var(--text-primary);
        font-size: var(--text-base);
      }
      .stat-lbl {
        font-family: var(--font-body);
        color: var(--text-muted);
        font-size: var(--text-xs);
        font-weight: var(--font-semibold);
      }
      /* No tenían estilos: con más de un ejercicio los nombres salían
         pegados ("Press de bancaRemo con barra"). Como en Historial. */
      .card-exercises {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-1) 6px;
      }
      .exercise-chip {
        background: var(--bg-elevated);
        color: var(--text-secondary);
        border: var(--border-tier3) solid var(--border-subtle);
        border-radius: 6px;
        font-size: var(--text-xs);
        padding: 2px var(--space-2);
      }

      /* === LOADING STATE === */
      .loading-box {
        background: var(--bg-surface);
        border: 1px dashed var(--border-subtle);
        border-radius: 16px;
        padding: 2.5rem 1.5rem;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.6rem;
      }
      .loading-box p {
        margin: 0;
        color: var(--text-muted);
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
  private host = inject(ElementRef<HTMLElement>);
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

  /** Sesión libre: sin rutina ni sesión de mesociclo detrás. */
  hasFreeSessionRunning = computed(() => {
    const session = this.workoutFacade.activeSession();
    return !!session && !session.routine_id && !session.mesocycle_session_id;
  });

  /** Sesión que sí viene de una rutina o del plan estructurado. */
  hasPlannedSessionRunning = computed(() => {
    const session = this.workoutFacade.activeSession();
    return !!session && !!(session.routine_id || session.mesocycle_session_id);
  });

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

  ngAfterViewInit() {
    // La entrada la orquesta el tier declarado en la raíz de la vista.
    // Antes esto era un effect() que animaba solo las tarjetas de
    // historial cada vez que cambiaba la lista, sin relación con el
    // resto de los bloques.
    this.gsap.animateTierEnter(this.host.nativeElement.querySelector('.tier-ceremonia'));
  }
}


