import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  computed,
  signal,
  AfterViewInit,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonTitle,
  IonContent,
  NavController,
  ActionSheetController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { trash, close } from 'ionicons/icons';
import { AppHeaderComponent } from '@shared/components/app-header/app-header.component';
import { GsapAnimationsService } from '@core/services/ui/gsap-animations.service';
import { MesocycleFacade } from '@core/facades/mesocycle.facade';
import { WorkoutFacade } from '@core/facades/workout.facade';
import { MesoTimelineComponent } from './components/meso-timeline.component';
import { WeekDetailComponent } from './components/week-detail.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-mesocycle',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    MesoTimelineComponent,
    WeekDetailComponent,
    IconComponent,
    AppHeaderComponent,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-header title="Mesocycle Manager" (back)="goBack()"></app-header>

    <ion-content class="tier-trabajo">
      @if (mesocycle(); as plan) {
        <div class="bento-grid">
          <!-- Header Info -->
          <div data-anim="bloque" class="bento-wide card-accent">
            <div class="plan-header">
              <div>
                <h1 class="plan-title">{{ plan.name }}</h1>
                <p class="plan-subtitle">
                  {{ plan.duration_weeks }} Semanas • Estado:
                  <span class="status-badge">{{ plan.status }}</span>
                </p>
              </div>
              <button class="settings-btn" (click)="openSettings()">
                <app-icon name="settings"></app-icon>
              </button>
            </div>
          </div>

          <!-- Timeline -->
          <div data-anim="bloque" class="bento-wide card">
            <app-meso-timeline
              [weeks]="plan.weeks || []"
              [currentWeekNumber]="plan.current_week"
              [selectedWeekId]="selectedWeekId()"
              (selectWeek)="onSelectWeek($event)"
            >
            </app-meso-timeline>
          </div>

          <!-- Week Detail -->
          <div data-anim="bloque" class="bento-wide card no-padding-bottom">
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
                (startSession)="onStartSession($event)"
              >
              </app-week-detail>
            } @else {
              <div class="empty-selection">
                <p>Selecciona una semana en la línea de tiempo superior.</p>
              </div>
            }
          </div>
        </div>
      } @else {
        <app-empty-state
          icon="folder-open"
          message="No tienes un plan activo"
          subtitle="Puedes construir tu propio plan manualmente o pedirle al Coach AI que genere uno para ti."
          actionLabel="Crear Plan Manualmente"
          (action)="goToCreatePlan()"
        ></app-empty-state>
        <div class="flex justify-center mt-4">
          <button class="btn-secondary" (click)="goBack()">Volver</button>
        </div>
      }
    </ion-content>
  `,
  styles: [
    `
      .plan-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 1rem;
      }
      .plan-title {
        font-size: 1.25rem;
        font-weight: 800;
        color: var(--text-primary);
        margin: 0 0 0.5rem 0;
        letter-spacing: -0.02em;
      }
      .plan-subtitle {
        font-size: 0.85rem;
        color: var(--text-muted, var(--text-muted));
        margin: 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .status-badge {
        background: color-mix(in srgb, var(--state-success) 15%, transparent);
        color: var(--state-success);
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 700;
        font-size: var(--text-floor, 13px);
        text-transform: uppercase;
      }
      .settings-btn { min-width: var(--target-min, 44px); min-height: var(--target-min, 44px);
        background: var(--bg-elevated);
        border: none;
        color: var(--text-primary);
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
        color: var(--text-primary);
      }
      .deload-badge {
        background: var(--bg-elevated);
        color: var(--ds-brand);
        padding: 2px 8px;
        border-radius: 4px;
        font-size: var(--text-floor, 13px);
        font-weight: 700;
      }
      .focus-notes {
        padding: 0 1rem;
        font-size: 0.85rem;
        color: var(--text-muted);
        margin-bottom: 1rem;
        font-style: italic;
      }

      .empty-selection {
        padding: 2rem;
        text-align: center;
        color: var(--text-secondary);
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 2rem;
        text-align: center;
        color: var(--text-secondary);
      }
      .empty-state h2 {
        color: var(--text-primary);
        font-size: 1.2rem;
        margin-top: 1rem;
      }
      .empty-state p {
        margin-bottom: 1.5rem;
      }
      .btn-primary { min-height: var(--target-min, 44px);
        background: var(--color-primary, var(--ds-brand));
        color: var(--text-primary);
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
      .btn-secondary { min-height: var(--target-min, 44px);
        background: var(--border-subtle);
        color: var(--text-primary);
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-weight: 600;
      }
    `,
  ],
})
export class MesocyclePage implements OnInit, AfterViewInit {
  constructor() {
    addIcons({ trash, close });
  }

  private gsap = inject(GsapAnimationsService);
  private el = inject(ElementRef);

  ngAfterViewInit() {
    this.gsap.animateTierEnter(this.el.nativeElement);
  }

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
    return plan.weeks.find((w) => w.id === id) || null;
  });

  ngOnInit() {
    this.facade.loadActiveMesocycle().then(() => {
      // Auto-select current week if available
      const plan = this.mesocycle();
      if (plan && plan.weeks) {
        const currentWeek = plan.weeks.find((w) => w.week_number === plan.current_week);
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
    this.navCtrl.navigateBack('/app/workouts');
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
          },
        },
        {
          text: 'Cancelar',
          role: 'cancel',
          icon: 'close',
        },
      ],
    });

    await actionSheet.present();
  }
}




