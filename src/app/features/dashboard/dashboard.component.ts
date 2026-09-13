import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
  viewChildren,
} from "@angular/core";
import { DatePipe } from "@angular/common";
import { AuthFacade } from "@core/facades/auth.facade";
import { GsapAnimationsService } from "@core/services/ui/gsap-animations.service";
import { BentoGridLayoutDirective } from "@core/directives/bento-grid-layout.directive";
import { CardHoverDirective } from "@core/directives/card-hover.directive";
import { AnimateInDirective } from "@core/directives/animate-in.directive";
import { IconComponent } from "@shared/components/icon/icon.component";
import { KpiCardComponent } from "@shared/components/kpi-card/kpi-card.component";
import { KpiCardSkeletonComponent } from "@shared/components/kpi-card/kpi-card-skeleton.component";
import { DashboardFacade } from "@core/facades/dashboard.facade";
import { WorkoutFacade } from "@core/facades/workout.facade";
import { Router } from "@angular/router";

/**
 * DashboardComponent — Página principal de la aplicación.
 *
 * Esta página es la REFERENCIA CANÓNICA del sistema de diseño.
 * Demuestra la composición correcta de todos los patrones del blueprint:
 *
 * ┌── Patrones ilustrados ──────────────────────────────────────────────┐
 * │  surface-hero      → bento-hero con gradiente de marca             │
 * │  app-kpi-card      → métricas con contador GSAP animado            │
 * │  indicator-live    → dot pulsante de estado en tiempo real         │
 * │  app-icon          → iconos Lucide (cero emojis)                   │
 * │  appCardHover    → hover GSAP en todas las cards                 │
 * │  [appBentoGridLayout] → grid con FLIP animation en reflow          │
 * │  animateBentoGrid  → stagger de entrada de las celdas              │
 * │  animateHero       → blur + scale en el banner principal           │
 * │  staggerListItems  → entrada escalonada en listas de actividad     │
 * │  skeleton → content → appAnimateIn en transición de carga        │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * CÓMO ADAPTAR AL PROYECTO:
 * 1. Reemplaza los `kpis` y `activities` estáticos con señales del Facade.
 * 2. Crea un `DashboardFacade` en `core/services/dashboard.facade.ts`.
 * 3. Expón los datos con `toSignal()` y conéctalos a los inputs de los componentes.
 *
 * @example (en app.routes.ts)
 * {
 *   path: 'dashboard',
 *   loadComponent: () =>
 *     import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
 * }
 */
@Component({
  selector: "app-dashboard",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    BentoGridLayoutDirective,
    CardHoverDirective,
    AnimateInDirective,
    IconComponent,
    KpiCardComponent,
    KpiCardSkeletonComponent,
  ],
  template: `
    <!-- ═══════════════════════════════════════════════════════════════
         BENTO GRID — contenedor principal del dashboard
         [appBentoGridLayout] habilita FLIP animation en reflows
    ════════════════════════════════════════════════════════════════ -->
    <section
      #gridEl
      class="bento-grid"
      appBentoGridLayout
      aria-label="Panel de control"
    >
      <!-- ── HERO — Banner principal con surface-hero ────────────────
           surface-hero aplica el gradiente de marca + radial glow.
           El texto SIEMPRE en var(--color-primary-text) (blanco).
           Solo UNA surface-hero por vista.
      ──────────────────────────────────────────────────────────── -->
      <div
        #heroEl
        class="bento-hero surface-hero rounded-2xl p-8 flex flex-col justify-between gap-4"
        data-llm-nav="dashboard-hero"
      >
        <!-- Fila superior: saludo + indicador de estado -->
        <div class="flex items-start justify-between gap-4">
          <div class="flex flex-col gap-1">
            <p
              class="m-0 text-sm font-medium"
              style="color: rgba(255,255,255,0.7)"
            >
              {{ today | date: "EEEE, d MMMM y" : "" : "es" }}
            </p>
            <h1
              class="m-0 text-3xl font-bold"
              style="color: var(--color-primary-text)"
            >
              Hola, {{ userName() }}
            </h1>
            <p class="m-0 text-base" style="color: rgba(255,255,255,0.8)">
              Aquí tienes el resumen de hoy.
            </p>
          </div>

          <!-- Indicador de sistema activo -->
          <div
            class="indicator-live text-sm flex-shrink-0 rounded-full px-3 py-1"
            style="background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.9)"
          >
            Sistema activo
          </div>
        </div>

        <!-- Fila inferior: acciones rápidas del hero -->
        <div class="flex items-center gap-3 flex-wrap">
          <!-- Botón Libre -->
          <button
            class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border-none cursor-pointer transition-all duration-200"
            [style.background]="isFreeWorkoutActive() ? '#10b981' : 'rgba(255,255,255,0.2)'"
            [style.color]="isFreeWorkoutActive() ? '#ffffff' : 'var(--color-primary-text)'"
            style="backdrop-filter: blur(8px)"
            (click)="handleFreeWorkoutClick()"
          >
            <app-icon [name]="isFreeWorkoutActive() ? 'play' : 'dumbbell'" [size]="14" />
            {{ isFreeWorkoutActive() ? 'Retomar Libre' : 'Libre' }}
          </button>

          <!-- Botón Plan -->
          <button
            class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border-none cursor-pointer transition-all duration-200"
            [style.background]="isPlanWorkoutActive() ? '#10b981' : 'rgba(255,255,255,0.2)'"
            [style.color]="isPlanWorkoutActive() ? '#ffffff' : 'var(--color-primary-text)'"
            style="backdrop-filter: blur(8px)"
            (click)="handlePlanWorkoutClick()"
          >
            <app-icon [name]="isPlanWorkoutActive() ? 'play' : 'calendar'" [size]="14" />
            {{ isPlanWorkoutActive() ? 'Retomar Plan' : 'Plan' }}
          </button>
        </div>
      </div>

      <!-- ── KPIs — 4 métricas en celdas square ──────────────────────
           app-kpi-card encapsula: .kpi-value + .kpi-label + trend + animateCounter()
           Solo 1 card-accent por sección bento → va en la primera KPI.
      ──────────────────────────────────────────────────────────── -->
      @for (kpi of kpis(); track kpi.id) {
        <div class="bento-square" appCardHover>
          @if (loading()) {
            <app-kpi-card-skeleton />
          } @else {
            <app-kpi-card
              [label]="kpi.label"
              [value]="kpi.value"
              [suffix]="kpi.suffix ?? ''"
              [prefix]="kpi.prefix ?? ''"
              [trend]="kpi.trend"
              [trendLabel]="kpi.trendLabel ?? ''"
              [accent]="kpi.accent ?? false"
              appAnimateIn
            />
          }
        </div>
      }

      <!-- ── FEATURE — Actividad reciente ───────────────────────────
           bento-feature: 8 columnas de ancho, 2 filas de alto.
           Lista con stagger GSAP al montar.
      ──────────────────────────────────────────────────────────── -->
      <div class="bento-feature card" appCardHover>
        <!-- Header de sección -->
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <app-icon
              name="activity"
              [size]="16"
              style="color: var(--ds-brand)"
            />
            <h2 class="m-0 text-base font-semibold text-text-primary">
              Actividad reciente
            </h2>
          </div>
          <button
            class="text-xs font-medium cursor-pointer border-none bg-transparent p-0"
            style="color: var(--color-primary)"
            data-llm-action="view-all-activity"
          >
            Ver todo
          </button>
        </div>

        <!-- Lista de actividad con stagger -->
        <ul #activityList class="m-0 p-0 list-none flex flex-col gap-1">
          @for (item of activities(); track item.id) {
            <li
              class="flex items-start gap-3 py-2.5 border-b last:border-b-0"
              style="border-color: var(--border-subtle)"
            >
              <!-- Ícono del evento -->
              <div
                class="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full"
                [style.background]="item.iconBg"
                [style.color]="item.iconColor"
              >
                <app-icon [name]="item.icon" [size]="14" />
              </div>

              <!-- Contenido del evento -->
              <div class="flex-1 min-w-0">
                <p class="m-0 text-sm font-medium text-text-primary truncate">
                  {{ item.title }}
                </p>
                <p class="m-0 text-xs text-text-muted">
                  {{ item.description }}
                </p>
              </div>

              <!-- Timestamp -->
              <span class="flex-shrink-0 text-xs text-text-muted self-center">{{
                item.time
              }}</span>
            </li>
          }
        </ul>
      </div>

      <!-- ── TALL — Acciones rápidas ─────────────────────────────────
           bento-tall: 3 columnas, 2 filas. Panel de acciones frecuentes.
      ──────────────────────────────────────────────────────────── -->
      <div class="bento-tall card flex flex-col gap-3" appCardHover>
        <div class="flex items-center gap-2 mb-1">
          <app-icon name="plus" [size]="16" style="color: var(--ds-brand)" />
          <h2 class="m-0 text-base font-semibold text-text-primary">
            Acciones rápidas
          </h2>
        </div>

        @for (action of quickActions(); track action.id) {
          <button
            class="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium cursor-pointer border text-left transition-all duration-150"
            style="background: var(--bg-elevated); border-color: var(--border-subtle); color: var(--text-secondary)"
            [attr.data-llm-action]="action.llmAction"
          >
            <div
              class="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-md"
              [style.background]="action.iconBg"
              [style.color]="action.iconColor"
            >
              <app-icon [name]="action.icon" [size]="14" />
            </div>
            {{ action.label }}
            <app-icon
              name="chevron-right"
              [size]="14"
              class="ml-auto"
              style="color: var(--text-muted)"
            />
          </button>
        }
      </div>

      <!-- ── WIDE — Estado del sistema ──────────────────────────────
           bento-wide: ancho completo de media pantalla, 1 fila.
           Muestra el estado de servicios con indicator-live.
      ──────────────────────────────────────────────────────────── -->
      <div
        class="bento-wide card flex items-center justify-between gap-4"
        appCardHover
      >
        <div class="flex items-center gap-3">
          <div class="indicator-live text-sm font-medium text-text-secondary">
            Todos los sistemas operativos
          </div>
        </div>

        <div class="flex items-center gap-6 flex-wrap">
          @for (service of systemStatus(); track service.name) {
            <div class="flex items-center gap-1.5">
              <div
                class="w-2 h-2 rounded-full flex-shrink-0"
                [style.background]="
                  service.ok ? 'var(--state-success)' : 'var(--state-error)'
                "
              ></div>
              <span class="text-xs text-text-muted">{{ service.name }}</span>
            </div>
          }
        </div>

        <div class="flex-shrink-0 text-xs text-text-muted">
          Actualizado hace 2 min
        </div>
      </div>
    </section>
  `,
})
export class DashboardComponent implements AfterViewInit {
  // ── Servicios ─────────────────────────────────────────────────────────────
  private readonly auth = inject(AuthFacade);
  private readonly gsap = inject(GsapAnimationsService);
  private readonly dashboardFacade = inject(DashboardFacade);
  private readonly workoutFacade = inject(WorkoutFacade);
  private readonly router = inject(Router);

  // ── ViewChildren para GSAP ────────────────────────────────────────────────
  private readonly gridEl = viewChild.required<ElementRef<HTMLElement>>("gridEl");
  private readonly heroEl = viewChild.required<ElementRef<HTMLElement>>("heroEl");
  private readonly activityList = viewChild<ElementRef<HTMLElement>>("activityList");

  // ── Estado ────────────────────────────────────────────────────────────────

  readonly loading = this.dashboardFacade.loading;
  readonly today = new Date();
  readonly userName = computed(() => this.auth.currentUser()?.name?.split(" ")[0] ?? "Atleta");

  // ── Datos desde la Facade ─────────────────────────────────────────────────
  readonly kpis = this.dashboardFacade.kpis;
  readonly activities = this.dashboardFacade.activities;

  readonly quickActions = signal([
    {
      id: "qa1",
      icon: "plus",
      label: "Nuevo Entrenamiento",
      llmAction: "new-workout",
      iconBg: "var(--color-primary-muted)",
      iconColor: "var(--color-primary)",
    },
    {
      id: "qa2",
      icon: "activity",
      label: "Mis Rutinas",
      llmAction: "view-routines",
      iconBg: "var(--bg-subtle)",
      iconColor: "var(--text-secondary)",
    },
    {
      id: "qa3",
      icon: "bar-chart-2",
      label: "Ver Progreso",
      llmAction: "view-analytics",
      iconBg: "var(--bg-subtle)",
      iconColor: "var(--text-secondary)",
    },
  ]);

  readonly systemStatus = signal([
    { name: "Supabase DB", ok: true },
    { name: "MCP Server", ok: true },
    { name: "Groq AI", ok: true },
  ]);

// ── Workout State ─────────────────────────────────────────────────────────
  readonly isFreeWorkoutActive = computed(() => {
    const s = this.workoutFacade.activeSession();
    return s && !s.routine_id && !s.mesocycle_session_id;
  });

  readonly isPlanWorkoutActive = computed(() => {
    const s = this.workoutFacade.activeSession();
    return s && (!!s.routine_id || !!s.mesocycle_session_id);
  });

  handleFreeWorkoutClick() {
    if (this.workoutFacade.activeSession()) {
      this.router.navigate(['/app/workouts/active']);
    } else {
      this.workoutFacade.startAdhocWorkout();
    }
  }

  handlePlanWorkoutClick() {
    if (this.workoutFacade.activeSession()) {
      this.router.navigate(['/app/workouts/active']);
    } else {
      this.router.navigate(['/app/workouts']);
    }
  }

  // ── Animaciones de entrada (GSAP) ─────────────────────────────────────────

  // ── Animaciones de entrada (GSAP) ─────────────────────────────────────────

  ngAfterViewInit(): void {
    // 1. Hero — blur + scale (siempre primero, contexto visual inmediato)
    this.gsap.animateHero(this.heroEl().nativeElement);

    // 2. Bento grid — stagger de celdas desde abajo
    this.gsap.animateBentoGrid(this.gridEl().nativeElement);

    // 3. Lista de actividad — slide desde la izquierda con stagger
    const list = this.activityList()?.nativeElement;
    if (list) {
      this.gsap.staggerListItems(list.querySelectorAll("li"));
    }
  }
}
