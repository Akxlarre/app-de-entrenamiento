import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { NavigationEnd } from '@angular/router';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { barbellOutline, searchOutline, personOutline, barbell, search, person, timerOutline, sparklesOutline, sparkles } from 'ionicons/icons';
import { WorkoutFacade } from '@core/facades/workout.facade';
import { CoachFacade } from '@core/services/ai/coach.facade';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { CoachChatComponent } from '@shared/components/coach-chat/coach-chat.component';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-tabs-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, DatePipe, DrawerComponent, CoachChatComponent],
  template: `
    <ion-tabs>
      @if (workoutFacade.activeSession() && !isWorkoutRoute()) {
        <button 
          class="active-workout-fab transition-opacity duration-200" 
          [class.opacity-0]="coachFacade.isDrawerOpen()"
          [class.pointer-events-none]="coachFacade.isDrawerOpen()"
          (click)="resumeWorkout()"
        >
          <div class="pulse-ring"></div>
          <ion-icon name="timer-outline"></ion-icon>
        </button>
      }

      <!-- Coach IA FAB Flotante Global -->
      <button 
        class="coach-floating-fab transition-opacity duration-200" 
        [class.has-active-workout]="workoutFacade.activeSession() !== null"
        [class.opacity-0]="coachFacade.isDrawerOpen()"
        [class.pointer-events-none]="coachFacade.isDrawerOpen()"
        (click)="coachFacade.toggleDrawer()" 
        title="Consultar a tu Coach IA"
      >
        <div class="coach-pulse-ring"></div>
        <ion-icon name="sparkles"></ion-icon>
      </button>

      <!-- Coach Drawer Lateral -->
      <app-drawer
        [isOpen]="coachFacade.isDrawerOpen()"
        title="Coach Virtual IA"
        icon="sparkles"
        [noPadding]="true"
        (closed)="coachFacade.closeDrawer()"
      >
        <div class="h-full flex flex-col">
          <app-coach-chat
            [messages]="coachFacade.messages()"
            [isLoading]="coachFacade.isLoading()"
            (onSend)="coachFacade.sendMessage($event)"
            (onClear)="coachFacade.clearChat()"
          />
        </div>
      </app-drawer>

      @if (!isWorkoutRoute()) {
        <ion-tab-bar slot="top" class="custom-tab-bar">
          <ion-tab-button tab="workouts">
            <ion-icon name="barbell-outline"></ion-icon>
            <ion-label>Entrenar</ion-label>
          </ion-tab-button>

          <ion-tab-button tab="explorer">
            <ion-icon name="search-outline"></ion-icon>
            <ion-label>Ejercicios</ion-label>
          </ion-tab-button>

          <ion-tab-button tab="profile">
            <ion-icon name="person-outline"></ion-icon>
            <ion-label>Perfil</ion-label>
          </ion-tab-button>
        </ion-tab-bar>
      }
    </ion-tabs>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    ion-tabs {
      --layout-top-offset: calc(88px + max(16px, env(safe-area-inset-top, 16px)));
    }

    /* Pass the variable directly to the official Ionic Custom Property */
    :host ::ng-deep ion-content {
      --padding-top: var(--layout-top-offset);
    }

    .custom-tab-bar {
      --background: rgba(12, 12, 16, 0.85);
      --border: none;
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      height: 64px;
      margin: max(16px, env(safe-area-inset-top, 16px)) 16px 0 16px;
      border-radius: 32px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      padding-top: 0;
    }

    /* Gradient fade mask to smoothly hide scrolling content at the top */
    .custom-tab-bar::after {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 120px; /* Covers the top bar margin and fades out below it */
      background: linear-gradient(to bottom, var(--ion-background-color, #09090b) 15%, transparent 100%);
      pointer-events: none;
      z-index: -1;
    }

    ion-tab-button {
      --color: #71717a;
      --color-selected: #3b82f6;
      --ripple-color: transparent;
      --background-focused: transparent;
      background: transparent;
      transition: all 0.15s ease;
    }

    ion-tab-button:active {
      transform: scale(0.92);
      opacity: 0.8;
    }

    ion-tab-button ion-icon {
      font-size: 1.4rem;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    ion-tab-button.tab-selected ion-icon {
      transform: scale(1.12);
      filter: drop-shadow(0 2px 8px rgba(59, 130, 246, 0.5));
    }

    ion-tab-button ion-label {
      font-size: 0.72rem !important;
      font-weight: 600;
      letter-spacing: 0.02em;
      margin-top: 3px;
      transition: color 0.2s ease;
    }

    ion-tab-button.tab-selected ion-label {
      font-weight: 700 !important;
    }

    /* === ACTIVE WORKOUT FAB === */
    .active-workout-fab {
      position: absolute;
      bottom: max(24px, env(safe-area-inset-bottom, 24px));
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #10b981;
      color: #000;
      border: none;
      box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      cursor: pointer;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .active-workout-fab:active {
      transform: scale(0.9);
    }

    .active-workout-fab ion-icon {
      font-size: 1.6rem;
      z-index: 2;
    }

    .pulse-ring {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: #10b981;
      animation: fab-pulse 2s infinite cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 1;
    }

    /* === COACH IA FLOATING FAB === */
    .coach-floating-fab {
      position: absolute;
      bottom: max(24px, env(safe-area-inset-bottom, 24px));
      right: 24px;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.25);
      box-shadow: 0 8px 24px rgba(139, 92, 246, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 90;
      cursor: pointer;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
    }

    .coach-floating-fab.has-active-workout {
      right: 90px;
    }

    .coach-floating-fab:active {
      transform: scale(0.92);
    }

    .coach-floating-fab ion-icon {
      font-size: 1.4rem;
      z-index: 2;
    }

    .coach-pulse-ring {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: rgba(168, 85, 247, 0.5);
      animation: coach-fab-pulse 2.5s infinite cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 1;
    }

    @keyframes coach-fab-pulse {
      0% { transform: scale(1); opacity: 0.7; }
      60% { transform: scale(1.35); opacity: 0; }
      100% { transform: scale(1); opacity: 0; }
    }
  `]
})
export class TabsLayoutComponent {
  workoutFacade = inject(WorkoutFacade);
  coachFacade = inject(CoachFacade);
  router = inject(Router);

  isWorkoutRoute = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => this.router.url.includes('/workouts/active'))
    ),
    { initialValue: this.router.url.includes('/workouts/active') }
  );

  constructor() {
    addIcons({ barbellOutline, searchOutline, personOutline, barbell, search, person, timerOutline, sparklesOutline, sparkles });
  }

  resumeWorkout() {
    this.router.navigate(['/app/workouts/active']);
  }
}
