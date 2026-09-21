import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { NavigationEnd } from '@angular/router';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular';
import { IconComponent } from '@shared/components/icon/icon.component';
import { addIcons } from 'ionicons';
import {
  barbellOutline,
  searchOutline,
  personOutline,
  barbell,
  search,
  person,
} from 'ionicons/icons';
import { WorkoutFacade } from '@core/facades/workout.facade';
import { CoachFacade } from '@core/services/ai/coach.facade';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { CoachChatComponent } from '@shared/components/coach-chat/coach-chat.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tabs-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.has-session]': 'workoutFacade.activeSession() !== null && !isWorkoutRoute()',
  },
  imports: [
    IonTabs,
    IonTabBar,
    IonTabButton,
    IonIcon,
    IonLabel,
    DrawerComponent,
    CoachChatComponent,
    IconComponent,
  ],
  template: `
    <ion-tabs>
      <!-- Barra de sesión en curso — reemplaza al FAB mudo anterior.
           Dice qué se está entrenando y hace cuánto, no solo que "hay algo". -->
      @if (workoutFacade.activeSession(); as session) {
        @if (!isWorkoutRoute()) {
          <button
            class="session-bar"
            [class.is-hidden]="coachFacade.isDrawerOpen()"
            (click)="resumeWorkout()"
          >
            <span class="session-bar__pulse indicator-live"></span>
            <span class="session-bar__body">
              <span class="session-bar__label">Sesión en curso</span>
              <span class="session-bar__detail">{{ currentExerciseLabel(session) }}</span>
            </span>
            <span class="session-bar__time">{{ elapsedLabel() }}</span>
            <app-icon name="chevron-right" [size]="20" />
          </button>
        }
      }

      <!-- Coach IA — se eleva cuando la barra de sesión está presente -->
      <button
        class="coach-fab"
        [class.is-hidden]="coachFacade.isDrawerOpen() || isCoachRoute()"
        (click)="coachFacade.toggleDrawer()"
        aria-label="Consultar a tu Coach IA"
      >
        <app-icon name="sparkles" [size]="22" />
      </button>

      <app-drawer
        [isOpen]="coachFacade.isDrawerOpen()"
        title="Coach Virtual IA"
        icon="sparkles"
        [noPadding]="true"
        (closed)="coachFacade.closeDrawer()"
      >
        <!-- Contenedor del chat -->
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

      @if (!isWorkoutRoute()) {
        <ion-tab-bar slot="bottom" class="main-tab-bar">
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
  styles: [
    `
      :host {
        display: block;
        height: 100%;

        /* Geometría del pie. Todo lo que flota se posiciona contra estas
           dos medidas, así nada se pisa cuando aparece la sesión. */
        --tabbar-h: calc(58px + var(--ion-safe-area-bottom, env(safe-area-inset-bottom, 0px)));
        --session-bar-h: 56px;

        /* El shell publica cuánto espacio ocupa su cromo inferior y las
           vistas lo consumen para su padding. Antes cada vista adivinaba
           un número mágico (96px) que se quedaba corto al aparecer la
           barra de sesión y le tapaba el último bloque.
           El FAB del Coach no cuenta: flota sobre la esquina como
           cualquier FAB y no bloquea una columna entera. */
        --chrome-bottom: calc(var(--tabbar-h) + var(--space-4));
      }

      :host(.has-session) {
        --chrome-bottom: calc(var(--tabbar-h) + var(--session-bar-h) + var(--space-4));
      }

      /* ── Barra de tabs ─────────────────────────────────────────
         Antes vivía en slot="top" como píldora flotante, reservando
         88px en todas las pantallas. Ahora va al pie: es el default
         de Ionic y queda al alcance del pulgar. */
      .main-tab-bar {
        --background: var(--bg-surface);
        --border: 1px solid var(--border-default);
        height: var(--tabbar-h);
        padding-bottom: env(safe-area-inset-bottom, 0px);
      }

      ion-tab-button {
        --color: var(--text-muted);
        --color-selected: var(--ds-brand);
        --ripple-color: transparent;
        --background-focused: transparent;
        min-height: var(--target-min);
        transition: var(--transition-color);
      }

      ion-tab-button:active {
        opacity: 0.7;
      }

      ion-tab-button ion-icon {
        font-size: 1.35rem;
      }

      ion-tab-button ion-label {
        font-family: var(--font-body);
        font-size: var(--text-xs) !important;
        font-weight: var(--font-semibold);
        letter-spacing: 0.01em;
        margin-top: 3px;
      }

      ion-tab-button.tab-selected ion-label {
        font-weight: var(--font-bold) !important;
      }

      /* ── Barra de sesión en curso ──────────────────────────────
         Ember, no verde: en este sistema el verde significa
         "logrado" y esto es "está pasando ahora". */
      .session-bar {
        position: absolute;
        left: 0;
        right: 0;
        bottom: var(--tabbar-h);
        z-index: 95;

        display: flex;
        align-items: center;
        gap: var(--space-3);
        width: 100%;
        min-height: var(--session-bar-h);
        padding: var(--space-2) var(--space-4);

        background: var(--bg-elevated);
        border: none;
        border-top: var(--border-tier2) solid var(--ds-brand);
        color: var(--text-primary);
        text-align: left;
        cursor: pointer;
        transition:
          opacity var(--duration-fast) var(--ease-standard),
          transform var(--duration-fast) var(--ease-standard);
      }

      .session-bar:active {
        transform: scale(0.995);
        background: var(--bg-subtle);
      }

      .session-bar.is-hidden {
        opacity: 0;
        pointer-events: none;
      }

      .session-bar__pulse {
        flex-shrink: 0;
      }

      .session-bar__body {
        display: flex;
        flex-direction: column;
        min-width: 0;
        flex: 1;
      }

      .session-bar__label {
        font-family: var(--font-body);
        font-size: var(--text-xs);
        font-weight: var(--font-bold);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--ds-brand);
      }

      .session-bar__detail {
        font-family: var(--font-body);
        font-size: var(--text-sm);
        color: var(--text-secondary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .session-bar__time {
        font-family: var(--font-data);
        font-size: var(--text-xl);
        font-weight: var(--font-bold);
        font-variant-numeric: tabular-nums;
        color: var(--text-primary);
        flex-shrink: 0;
      }

      /* ── Coach IA ──────────────────────────────────────────────
         Un solo acento dominante por superficie: el ember ya lo
         tiene la sesión, así que el Coach usa superficie elevada
         con borde de marca en vez de un degradado que compita. */
      .coach-fab {
        position: absolute;
        right: var(--space-4);
        bottom: var(--chrome-bottom);
        z-index: 90;

        width: var(--target-min);
        height: var(--target-min);
        border-radius: var(--radius-full);

        background: var(--bg-elevated);
        border: var(--border-tier2) solid var(--accent-border);
        color: var(--ds-brand);
        box-shadow: var(--shadow-lg);

        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition:
          opacity var(--duration-fast) var(--ease-standard),
          transform var(--duration-fast) var(--ease-standard),
          bottom var(--duration-fast) var(--ease-standard);
      }

      .coach-fab:active {
        transform: scale(var(--btn-press-scale-value));
      }

      .coach-fab.is-hidden {
        opacity: 0;
        pointer-events: none;
      }
    `,
  ],
})
export class TabsLayoutComponent {
  workoutFacade = inject(WorkoutFacade);
  coachFacade = inject(CoachFacade);
  router = inject(Router);
  private destroyRef = inject(DestroyRef);

  isWorkoutRoute = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url.includes('/workouts/active')),
    ),
    { initialValue: this.router.url.includes('/workouts/active') },
  );

  /** En la vista del Coach el FAB sobra (abre el mismo chat) y tapaba Enviar. */
  isCoachRoute = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url.startsWith('/app/coach')),
    ),
    { initialValue: this.router.url.startsWith('/app/coach') },
  );

  /** Reloj de pared. Un cronómetro necesita tick real; no es polling de datos. */
  private now = signal(Date.now());

  readonly elapsedLabel = computed(() => {
    const session = this.workoutFacade.activeSession();
    if (!session) return '';
    const startedAt = new Date(session.start_time).getTime();
    const totalSeconds = Math.max(0, Math.floor((this.now() - startedAt) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
  });

  constructor() {
    addIcons({
      barbellOutline,
      searchOutline,
      personOutline,
      barbell,
      search,
      person,
    });

    const ticker = setInterval(() => this.now.set(Date.now()), 1000);
    this.destroyRef.onDestroy(() => clearInterval(ticker));
  }

  currentExerciseLabel(session: { exercises: { exercise_name: string }[] }): string {
    const total = session.exercises.length;
    if (total === 0) return 'Sin ejercicios registrados';
    return session.exercises[total - 1].exercise_name;
  }

  resumeWorkout() {
    this.router.navigate(['/app/workouts/active']);
  }
}
