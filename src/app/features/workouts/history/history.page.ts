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
  ],
  template: `
    <ion-content class="history-page" [fullscreen]="true">
      <app-header title="Historial Completo" [showBack]="true" (backClicked)="goBack()">
      </app-header>

      <div class="page-container">
        <div class="history-section">
          <div class="section-header">
            <h3 class="section-title">Todos tus entrenamientos</h3>
            <span class="badge-count">{{ workoutFacade.history().length }}</span>
          </div>

          @if (workoutFacade.isLoadingHistory() && workoutFacade.history().length === 0) {
            <div class="loading-box">
              <ion-spinner color="primary"></ion-spinner>
              <p>Cargando historial...</p>
            </div>
          } @else if (workoutFacade.history().length === 0) {
            <div class="empty-feed">
              <app-icon name="clipboard-list" [size]="40" class="empty-icon" />
              <h4>Aún no has registrado sesiones</h4>
            </div>
          } @else {
            <div class="feed-list">
              @for (item of workoutFacade.history(); track item.id) {
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
      .back-btn {
        --color: var(--ds-brand);
        font-weight: 600;
        font-size: 0.95rem;
      }
      .history-page {
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
        gap: 0.75rem;
      }
      .stat-pill {
        background: rgba(255, 255, 255, 0.04);
        padding: 0.4rem 0.75rem;
        border-radius: 8px;
        display: flex;
        align-items: baseline;
        gap: 0.35rem;
      }
      .stat-num {
        font-weight: 800;
        color: var(--text-primary);
        font-size: 0.95rem;
      }
      .stat-unit {
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

  constructor() {
    addIcons({ chevronBackOutline, closeOutline });

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
