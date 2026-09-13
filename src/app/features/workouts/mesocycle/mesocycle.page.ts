import { Component, ChangeDetectionStrategy, inject, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonButtons, IonButton, IonTitle, IonContent, NavController, ActionSheetController } from '@ionic/angular';
import { MesocycleFacade } from '@core/facades/mesocycle.facade';
import { WorkoutFacade } from '@core/facades/workout.facade';
import { MesoTimelineComponent } from './components/meso-timeline.component';
import { WeekDetailComponent } from './components/week-detail.component';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-mesocycle',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonButtons, IonButton, IonTitle, IonContent, MesoTimelineComponent, WeekDetailComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="goBack()">
            <app-icon name="arrow-left"></app-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Mesocycle Manager</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (mesocycle(); as plan) {
        <div class="bento-grid">
          
          <!-- Header Info -->
          <div class="bento-wide card-accent">
            <div class="plan-header">
              <div>
                <h1 class="plan-title">{{ plan.name }}</h1>
                <p class="plan-subtitle">
                  {{ plan.duration_weeks }} Semanas • Estado: <span class="status-badge">{{ plan.status }}</span>
                </p>
              </div>
              <button class="settings-btn" (click)="openSettings()">
                <app-icon name="settings"></app-icon>
              </button>
            </div>
          </div>

          <!-- Timeline -->
          <div class="bento-wide card">
            <app-meso-timeline
              [weeks]="plan.weeks || []"
              [currentWeekNumber]="plan.current_week"
              [selectedWeekId]="selectedWeekId()"
              (selectWeek)="onSelectWeek($event)">
            </app-meso-timeline>
          </div>

          <!-- Week Detail -->
          <div class="bento-wide card no-padding-bottom">
            @if (selectedWeek()) {
              <div class="week-header-info">
                <h2>Semana {{ selectedWeek()?.week_number }}</h2>
                @if (selectedWeek()?.is_deload) {
                  <span class="deload-badge">Descarga (Deload)</span>
                }
              </div>
              @if (selectedWeek()?.focus_notes) {
                <p class="focus-notes">{{ selectedWeek()?.focus_notes }}</p>
              }
              
              <app-week-detail 
                [sessions]="selectedWeek()?.sessions || []"
                (startSession)="onStartSession($event)">
              </app-week-detail>
            } @else {
              <div class="empty-selection">
                <p>Selecciona una semana en la línea de tiempo superior.</p>
              </div>
            }
          </div>

        </div>
      } @else {
        <div class="empty-state">
          <app-icon name="folder-open" [size]="48"></app-icon>
          <h2>No tienes un plan activo</h2>
          <p>Puedes construir tu propio plan manualmente o pedirle al Coach AI que genere uno para ti.</p>
          <div class="empty-actions">
            <button class="btn-primary" (click)="goToCreatePlan()">Crear Plan Manualmente</button>
            <button class="btn-secondary" (click)="goBack()">Volver</button>
          </div>
        </div>
      }
    </ion-content>
  `,
  styles: [`
    .plan-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1rem;
    }
    .plan-title {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--text-primary, #fff);
      margin: 0 0 0.5rem 0;
      letter-spacing: -0.02em;
    }
    .plan-subtitle {
      font-size: 0.85rem;
      color: var(--text-muted, rgba(255,255,255,0.6));
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .status-badge {
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 0.7rem;
      text-transform: uppercase;
    }
    .settings-btn {
      background: rgba(255,255,255,0.05);
      border: none;
      color: var(--text-primary, #fff);
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .no-padding-bottom {
      padding-bottom: 0;
    }

    .week-header-info {
      padding: 1.5rem 1rem 0.5rem 1rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .week-header-info h2 {
      margin: 0;
      font-size: 1.2rem;
      font-weight: 700;
      color: #fff;
    }
    .deload-badge {
      background: rgba(59, 130, 246, 0.2);
      color: #60a5fa;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 700;
    }
    .focus-notes {
      padding: 0 1rem;
      font-size: 0.85rem;
      color: rgba(255,255,255,0.6);
      margin-bottom: 1rem;
      font-style: italic;
    }

    .empty-selection {
      padding: 2rem;
      text-align: center;
      color: rgba(255,255,255,0.5);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 2rem;
      text-align: center;
      color: rgba(255,255,255,0.5);
    }
    .empty-state h2 {
      color: #fff;
      font-size: 1.2rem;
      margin-top: 1rem;
    }
    .empty-state p {
      margin-bottom: 1.5rem;
    }
    .btn-primary {
      background: var(--color-primary, #3b82f6);
      color: #fff;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
    }
    .empty-actions {
      display: flex;
      gap: 1rem;
      margin-top: 1rem;
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
    }
  `]
})
export class MesocyclePage implements OnInit {
  private navCtrl = inject(NavController);
  private facade = inject(MesocycleFacade);
  private actionSheetCtrl = inject(ActionSheetController);
  workoutFacade = inject(WorkoutFacade);

  mesocycle = this.facade.activeMesocycle;
  
  // State for selected week in timeline
  selectedWeekId = signal<string | null>(null);

  selectedWeek = computed(() => {
    const id = this.selectedWeekId();
    const plan = this.mesocycle();
    if (!id || !plan?.weeks) return null;
    return plan.weeks.find(w => w.id === id) || null;
  });

  ngOnInit() {
    this.facade.loadActiveMesocycle().then(() => {
      // Auto-select current week if available
      const plan = this.mesocycle();
      if (plan && plan.weeks) {
        const currentWeek = plan.weeks.find(w => w.week_number === plan.current_week);
        if (currentWeek) {
          this.selectedWeekId.set(currentWeek.id);
        }
      }
    });
  }

  onSelectWeek(weekId: string) {
    this.selectedWeekId.set(weekId);
  }

  goBack() {
    this.navCtrl.back();
  }

  goToCreatePlan() {
    this.navCtrl.navigateForward('/app/workouts/plan/create');
  }

  onStartSession(session: any) {
    if (!session.routine) {
      alert('Esta sesión no tiene una rutina asignada válida.');
      return;
    }
    this.workoutFacade.startWorkoutFromMesocycleSession(session, session.routine);
  }

  async openSettings() {
    const plan = this.mesocycle();
    if (!plan) return;

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Opciones del Plan',
      buttons: [
        {
          text: 'Eliminar Plan',
          role: 'destructive',
          icon: 'trash',
          handler: async () => {
            const result = await this.facade.deleteMesocycle(plan.id);
            if (!result.success) {
              alert('Error al eliminar el plan');
            }
          }
        },
        {
          text: 'Cancelar',
          role: 'cancel',
          icon: 'close',
        }
      ]
    });

    await actionSheet.present();
  }
}
