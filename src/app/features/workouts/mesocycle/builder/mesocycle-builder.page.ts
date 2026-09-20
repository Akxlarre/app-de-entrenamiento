import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonTitle,
  IonContent,
  IonInput,
  IonSelect,
  IonSelectOption,
  NavController,
  IonModal,
  IonToggle,
} from '@ionic/angular';
import { MesocycleFacade } from '@core/facades/mesocycle.facade';
import { RoutineFacade } from '@core/facades/routine.facade';
import { IconComponent } from '@shared/components/icon/icon.component';
import { RoutineEditorPage } from '../../routines/routine-editor.page';

@Component({
  selector: 'app-mesocycle-builder',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonTitle,
    IonContent,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonModal,
    IonToggle,
    IconComponent,
    RoutineEditorPage,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="goBack()">
            <app-icon name="arrow-left"></app-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Creador de Plan</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="bento-grid">
        <!-- Progreso del Wizard -->
        <div class="bento-wide step-indicator">
          <div class="step" [class.active]="step() === 1" [class.completed]="step() > 1">
            <div class="step-num">1</div>
            <span>Configuración</span>
          </div>
          <div class="step-line" [class.completed]="step() > 1"></div>
          <div class="step" [class.active]="step() === 2" [class.completed]="step() > 2">
            <div class="step-num">2</div>
            <span>Rutinas</span>
          </div>
          <div class="step-line" [class.completed]="step() > 2"></div>
          <div class="step" [class.active]="step() === 3">
            <div class="step-num">3</div>
            <span>Progresión</span>
          </div>
        </div>

        @if (step() === 1) {
          <!-- Paso 1: Configuración -->
          <div class="bento-wide card-accent">
            <h2>Datos Generales</h2>
            <p class="text-muted">Dale un nombre a tu bloque y define cuánto durará.</p>

            <div class="form-group">
              <label>Nombre del Plan</label>
              <ion-input
                [(ngModel)]="planName"
                placeholder="Ej: Hipertrofia Verano"
                class="custom-input"
              ></ion-input>
            </div>

            <div class="form-group">
              <label>Duración (Semanas)</label>
              <ion-input
                type="number"
                [(ngModel)]="durationWeeks"
                min="1"
                max="16"
                class="custom-input"
              ></ion-input>
            </div>

            <div
              class="form-group flex-row"
              style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;"
            >
              <label style="margin: 0;">Incluir Semana de Descarga (Deload) al final</label>
              <ion-toggle [(ngModel)]="includeDeload"></ion-toggle>
            </div>

            <button class="btn-primary" (click)="nextStep()" [disabled]="!planName()">
              Siguiente
            </button>
          </div>
        }

        @if (step() === 2) {
          <!-- Paso 2: Rutinas -->
          <div class="bento-wide card-accent">
            <h2>Tus Sesiones</h2>
            <p class="text-muted">Agrega las rutinas que vas a realizar cada semana.</p>

            @if (routineFacade.routines().length === 0) {
              <div class="alert-box">
                <app-icon name="alert-circle" [size]="20"></app-icon>
                <span>No tienes rutinas creadas. Ve a la pestaña de Rutinas primero.</span>
              </div>
            } @else {
              <div class="sessions-list">
                @for (s of selectedSessions(); track $index) {
                  <div class="session-item">
                    <div class="session-header">
                      <span class="day-badge">Día {{ s.day_number }}</span>
                      <button class="icon-btn text-danger" (click)="removeSession($index)">
                        <app-icon name="trash-2" [size]="14"></app-icon>
                      </button>
                    </div>
                    <ion-select
                      [(ngModel)]="s.routine_id"
                      interface="action-sheet"
                      placeholder="Selecciona una Rutina"
                      class="custom-select"
                    >
                      @for (r of routineFacade.routines(); track r.id) {
                        <ion-select-option [value]="r.id">{{ r.name }}</ion-select-option>
                      }
                    </ion-select>
                  </div>
                }
              </div>

              <div class="nav-buttons" style="flex-direction: column; gap: 0.75rem;">
                <button class="btn-secondary w-full" (click)="addSession()">
                  + Añadir Día de Entrenamiento
                </button>
                <button class="btn-outline w-full" (click)="isRoutineModalOpen.set(true)">
                  + Crear Nueva Rutina
                </button>
              </div>

              <div class="nav-buttons" style="margin-top: 1.5rem;">
                <button class="btn-outline" (click)="prevStep()">Atrás</button>
                <button
                  class="btn-primary"
                  (click)="nextStep()"
                  [disabled]="selectedSessions().length === 0 || hasEmptySessions()"
                >
                  Siguiente
                </button>
              </div>
            }
          </div>
        }

        @if (step() === 3) {
          <!-- Paso 3: Progresión -->
          <div class="bento-wide card-accent">
            <h2>Estrategia de Periodización</h2>
            <p class="text-muted">
              Elige cómo el sistema calculará tus cargas y repeticiones a lo largo de las semanas.
            </p>

            <div class="progression-options">
              <div
                class="progression-card"
                [class.active]="progressionStrategy() === 'autoregulated'"
                (click)="progressionStrategy.set('autoregulated')"
              >
                <app-icon
                  name="brain"
                  [size]="24"
                  [color]="
                    progressionStrategy() === 'autoregulated'
                      ? 'var(--state-success)'
                      : 'currentColor'
                  "
                ></app-icon>
                <h4>Auto-Regulada (RIR / RPE)</h4>
                <p>
                  Sin pesos estrictos pre-calculados. Ajustas tu carga sesión a sesión basándote en
                  tu fatiga diaria.
                </p>
              </div>

              <div
                class="progression-card"
                [class.active]="progressionStrategy() === 'linear'"
                (click)="progressionStrategy.set('linear')"
              >
                <app-icon
                  name="trending-up"
                  [size]="24"
                  [color]="
                    progressionStrategy() === 'linear' ? 'var(--state-success)' : 'currentColor'
                  "
                ></app-icon>
                <h4>Progresión Lineal</h4>
                <p>
                  El sistema te pedirá añadir una carga fija pequeña (ej. +1.25kg o +1 rep) cada
                  semana en ejercicios principales.
                </p>
              </div>

              <div
                class="progression-card"
                [class.active]="progressionStrategy() === 'undulating'"
                (click)="progressionStrategy.set('undulating')"
              >
                <app-icon
                  name="activity"
                  [size]="24"
                  [color]="
                    progressionStrategy() === 'undulating' ? 'var(--state-success)' : 'currentColor'
                  "
                ></app-icon>
                <h4>Periodización Ondulante</h4>
                <p>
                  Variación de la intensidad y volumen. Días "Pesados" y días "Ligeros" alternados.
                  (Próximamente)
                </p>
              </div>
            </div>

            <div class="nav-buttons" style="margin-top: 1.5rem;">
              <button class="btn-outline" (click)="prevStep()" [disabled]="isSubmitting()">
                Atrás
              </button>
              <button class="btn-primary" (click)="finish()" [disabled]="isSubmitting()">
                @if (isSubmitting()) {
                  <app-icon name="loader-2" class="animate-spin"></app-icon> Guardando...
                } @else {
                  Crear Plan
                }
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Modal de Creación de Rutina Inline -->
      <ion-modal [isOpen]="isRoutineModalOpen()" (didDismiss)="isRoutineModalOpen.set(false)">
        <ng-template>
          <app-routine-editor
            [isInline]="true"
            (routineCreated)="onRoutineCreated($event)"
            (cancelInline)="isRoutineModalOpen.set(false)"
          >
          </app-routine-editor>
        </ng-template>
      </ion-modal>
    </ion-content>
  `,
  styles: [
    `
      h2 {
        font-size: 1.25rem;
        font-weight: 700;
        margin: 0 0 0.25rem 0;
        color: var(--text-primary);
      }
      .text-muted {
        color: var(--text-muted);
        font-size: 0.85rem;
        margin-bottom: 1.5rem;
      }

      .step-indicator {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem;
        background: transparent;
        border: none;
      }
      .step {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        opacity: 0.4;
        transition: all 0.3s;
      }
      .step.active {
        opacity: 1;
      }
      .step.completed {
        opacity: 1;
      }
      .step-num {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--border-subtle);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 0.9rem;
      }
      .step.active .step-num {
        background: var(--bg-elevated);
        border: 2px solid var(--ds-brand);
        color: var(--ds-brand);
      }
      .step.completed .step-num {
        background: var(--state-success);
        color: var(--text-primary);
      }
      .step span {
        font-size: var(--text-floor, 13px);
        font-weight: 600;
      }
      .step-line {
        flex: 1;
        height: 2px;
        background: var(--border-subtle);
        margin: 0 1rem;
        margin-bottom: 20px;
      }
      .step-line.completed {
        background: var(--state-success);
      }

      .form-group {
        margin-bottom: 1.5rem;
      }
      .form-group label {
        display: block;
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--text-muted);
        margin-bottom: 0.5rem;
      }
      .custom-input, .custom-select { font-size: 16px; min-height: var(--target-min, 44px);
        background: var(--bg-surface);
        border-radius: 8px;
        padding: 0.5rem 1rem;
        color: var(--text-primary);
        border: 1px solid var(--bg-elevated);
      }

      .sessions-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }
      .session-item { min-height: var(--target-min, 44px);
        background: var(--bg-surface);
        border: 1px solid var(--bg-elevated);
        border-radius: 12px;
        padding: 1rem;
      }
      .session-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
      }
      .day-badge {
        background: var(--bg-elevated);
        color: var(--ds-brand);
        padding: 2px 8px;
        border-radius: 4px;
        font-size: var(--text-floor, 13px);
        font-weight: 700;
      }

      .progression-options {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .progression-card { min-height: var(--target-min, 44px);
        background: var(--bg-surface);
        border: 1px solid var(--bg-elevated);
        border-radius: 12px;
        padding: 1.25rem;
        transition: all 0.2s;
        cursor: pointer;
      }
      .progression-card.active {
        border-color: var(--state-success);
        background: color-mix(in srgb, var(--state-success) 5%, transparent);
      }
      .progression-card.disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .progression-card h4 {
        margin: 0.5rem 0 0.25rem 0;
        font-size: 1rem;
        color: var(--text-primary);
      }
      .progression-card p {
        margin: 0;
        font-size: 0.8rem;
        color: var(--text-muted);
        line-height: 1.4;
      }

      .btn-primary { min-height: var(--target-min, 44px);
        background: var(--color-primary, var(--ds-brand));
        color: var(--text-primary);
        border: none;
        padding: 0.8rem 1.5rem;
        border-radius: 8px;
        font-weight: 600;
        width: 100%;
        transition: opacity 0.2s;
      }
      .btn-primary:disabled {
        opacity: 0.5;
      }
      .btn-secondary { min-height: var(--target-min, 44px);
        background: var(--bg-elevated);
        color: var(--text-primary);
        border: 1px dashed var(--border-subtle);
        padding: 0.8rem;
        border-radius: 8px;
        font-weight: 600;
        width: 100%;
      }
      .btn-outline { min-height: var(--target-min, 44px);
        background: transparent;
        color: var(--text-primary);
        border: 1px solid var(--border-subtle);
        padding: 0.8rem 1.5rem;
        border-radius: 8px;
        font-weight: 600;
        width: 100%;
      }

      .nav-buttons {
        display: flex;
        gap: 1rem;
        margin-top: 1rem;
      }
      .w-full {
        width: 100%;
      }
      .icon-btn { min-width: var(--target-min, 44px); min-height: var(--target-min, 44px); display: flex; align-items: center; justify-content: center;
        background: transparent;
        border: none;
        display: flex;
        padding: 0.25rem;
        cursor: pointer;
      }
      .text-danger {
        color: var(--state-error);
      }
    `,
  ],
})
export class MesocycleBuilderPage {
  private navCtrl = inject(NavController);
  public routineFacade = inject(RoutineFacade);
  private mesocycleFacade = inject(MesocycleFacade);

  step = signal<number>(1);
  planName = signal<string>('');
  durationWeeks = signal<number>(6);
  includeDeload = signal<boolean>(false);
  progressionStrategy = signal<string>('autoregulated');
  isSubmitting = signal<boolean>(false);

  isRoutineModalOpen = signal<boolean>(false);

  selectedSessions = signal<{ day_number: number; routine_id: string }[]>([
    { day_number: 1, routine_id: '' },
  ]);

  constructor() {
    this.routineFacade.loadRoutines();
  }

  onRoutineCreated(newRoutineId: string) {
    this.isRoutineModalOpen.set(false);
    // Find the first empty session and assign the new routine
    const sessions = [...this.selectedSessions()];
    const emptyIndex = sessions.findIndex((s) => !s.routine_id);
    if (emptyIndex !== -1) {
      sessions[emptyIndex].routine_id = newRoutineId;
      this.selectedSessions.set(sessions);
    }
  }

  nextStep() {
    if (this.step() < 3) this.step.update((s) => s + 1);
  }

  prevStep() {
    if (this.step() > 1) this.step.update((s) => s - 1);
  }

  addSession() {
    const sessions = this.selectedSessions();
    const nextDay = sessions.length > 0 ? sessions[sessions.length - 1].day_number + 1 : 1;
    this.selectedSessions.set([...sessions, { day_number: nextDay, routine_id: '' }]);
  }

  removeSession(index: number) {
    const sessions = [...this.selectedSessions()];
    sessions.splice(index, 1);
    // Re-index days
    sessions.forEach((s, i) => (s.day_number = i + 1));
    this.selectedSessions.set(sessions);
  }

  hasEmptySessions(): boolean {
    return this.selectedSessions().some((s) => !s.routine_id);
  }

  goBack() {
    this.navCtrl.back();
  }

  async finish() {
    this.isSubmitting.set(true);
    const config = {
      name: this.planName(),
      duration_weeks: this.durationWeeks(),
      include_deload: this.includeDeload(),
      progression: this.progressionStrategy(),
      routines: this.selectedSessions(),
    };

    const result = await this.mesocycleFacade.createManualMesocycle(config);
    this.isSubmitting.set(false);

    if (result.success) {
      this.navCtrl.navigateRoot('/app/workouts/plan', { replaceUrl: true });
    } else {
      // Manejo simple de error en UI
      alert('Error al crear el plan: ' + result.error);
    }
  }
}



