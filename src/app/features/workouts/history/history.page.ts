import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  AfterViewInit,
  effect,
  signal,
  computed,
} from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import {
  IonContent,
  IonIcon,
  IonSpinner,
  IonButtons,
  IonButton,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBackOutline, closeOutline } from 'ionicons/icons';
import { WorkoutFacade, WorkoutHistoryItem } from '@core/facades/workout.facade';
import { AppHeaderComponent } from '@shared/components/app-header/app-header.component';
import { GsapAnimationsService } from '@core/services/ui/gsap-animations.service';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { IconComponent } from '@shared/components/icon/icon.component';
import { SessionDetailComponent } from '../components/session-detail/session-detail.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { SkeletonBlockComponent } from '@shared/components/skeleton-block/skeleton-block.component';

@Component({
  selector: 'app-workout-history',
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
    IonButtons,
    IonButton,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IconComponent,
    SessionDetailComponent,
    EmptyStateComponent,
    SkeletonBlockComponent,
  ],
  template: `
    <ion-content class="history-page tier-trabajo" [fullscreen]="true">
      <app-header title="Historial Completo" [showBack]="true" (backClicked)="goBack()">
      </app-header>

      <div class="page-container">
        <div class="history-section">
          <div class="section-header">
            <h3 class="section-title">Todos tus entrenamientos</h3>
            <span class="badge-count">{{ workoutFacade.history().length }}</span>
          </div>

          @if (workoutFacade.isLoadingHistory() && workoutFacade.history().length === 0) {
            <div class="feed-list">
              @for (i of [1, 2, 3]; track i) {
                <div class="workout-card history-card" style="pointer-events: none;">
                  <div class="card-top">
                    <app-skeleton-block variant="text" width="40%" height="16px" />
                    <app-skeleton-block variant="text" width="20%" height="16px" />
                  </div>
                  <div class="card-stats">
                    <app-skeleton-block variant="text" width="60px" height="24px" style="border-radius: 99px;" />
                    <app-skeleton-block variant="text" width="60px" height="24px" style="border-radius: 99px;" />
                  </div>
                  <div class="exercise-tags" style="margin-top: 12px;">
                    <app-skeleton-block variant="text" width="80px" height="20px" style="border-radius: 4px;" />
                    <app-skeleton-block variant="text" width="100px" height="20px" style="border-radius: 4px;" />
                    <app-skeleton-block variant="text" width="90px" height="20px" style="border-radius: 4px;" />
                  </div>
                </div>
              }
            </div>
          } @else if (workoutFacade.history().length === 0) {
            <app-empty-state icon="clipboard-list" message="Aún no has registrado sesiones" />
          } @else {
            <div class="feed-list">
              @for (item of workoutFacade.history(); track item.id) {
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
                      <span class="stat-num">{{ item.total_volume | number: '1.0-0' }}</span>
                      <span class="stat-unit">kg</span>
                    </div>
                    <div class="stat-pill">
                      <span class="stat-num">{{ item.total_sets }}</span>
                      <span class="stat-unit">{{
                        item.total_sets === 1 ? 'serie' : 'series'
                      }}</span>
                    </div>
                  </div>

                  @if (item.exercises_summary.length > 0) {
                    <div class="exercise-tags">
                      @for (name of item.exercises_summary; track name) {
                        <span class="ex-tag">{{ name }}</span>
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
    </ion-content>
  `,
  styles: [
    `
      /* Tier 2 (spec 0013). Tarjeta, contador y etiquetas con los valores
         de "Historial Reciente" de Entrenar: es la misma información.
         El fondo lo pinta la regla global de ion-content (fix-028). */
      .page-container {
        padding: 1rem;
        padding-bottom: calc(90px + env(safe-area-inset-bottom, 16px));
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        max-width: 600px;
        margin: 0 auto;
      }
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
      /* Iba en Anton a 16.8px, debajo de su piso de 28. */
      .section-title {
        font-family: var(--font-body);
        font-size: var(--text-lg);
        font-weight: var(--font-bold);
        color: var(--text-primary);
        margin: 0;
      }
      /* Medía 12px. */
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
      .feed-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .workout-card {
        background: var(--bg-surface);
        border: var(--border-tier3) solid var(--border-subtle);
        border-radius: 16px;
        padding: 1.15rem;
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
        cursor: pointer;
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
      /* Cifras de ancho fijo: se comparan entre tarjetas. */
      .stat-num {
        font-family: var(--font-data);
        font-variant-numeric: tabular-nums;
        font-weight: var(--font-bold);
        color: var(--text-primary);
        font-size: var(--text-base);
      }
      /* Medía 11.5px. */
      .stat-unit {
        color: var(--text-muted);
        font-size: var(--text-xs);
        font-weight: var(--font-semibold);
      }
      .exercise-tags {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-1) 6px;
      }
      /* Neutras, como en Entrenar: iban en el azul de la marca anterior
         y a 11.5px. */
      .ex-tag {
        background: var(--bg-elevated);
        color: var(--text-secondary);
        border: var(--border-tier3) solid var(--border-subtle);
        border-radius: 6px;
        font-size: var(--text-xs);
        padding: 2px var(--space-2);
        font-weight: var(--font-medium);
      }
      .loading-box {
        background: var(--bg-surface);
        border: var(--border-tier3) dashed var(--border-subtle);
        border-radius: 16px;
        padding: 2.5rem 1.5rem;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.6rem;
      }
      .safe-bottom {
        height: 2.5rem;
      }
    `,
  ],
})
export class HistoryPage implements OnInit, AfterViewInit {
  workoutFacade = inject(WorkoutFacade);
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

  private hasAnimated = false;

  constructor() {
    addIcons({ chevronBackOutline, closeOutline });

    effect(() => {
      const history = this.workoutFacade.history();
      if (history.length > 0 && !this.hasAnimated) {
        this.hasAnimated = true;
        setTimeout(() => {
          const cards = document.querySelectorAll('.history-card');
          if (cards.length) {
            this.gsap.staggerListItems(cards as any);
          }
        }, 50);
      }
    });
  }

  ngOnInit() {
    // Solo cargamos si el historial está vacío para evitar el flasheo del loader si ya venimos del Dashboard
    if (this.workoutFacade.history().length === 0) {
      this.workoutFacade.loadHistory();
    }
  }

  goBack() {
    this.router.navigate(['/app/workouts']);
  }

  viewDetails(id: string) {
    this.selectedWorkoutId.set(id);
  }

  closeDetails() {
    this.selectedWorkoutId.set(null);
  }

  ngAfterViewInit() {}
}

