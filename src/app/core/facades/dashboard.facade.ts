import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
import { AuthFacade } from './auth.facade';

export interface DashboardKpi {
  id: string;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  trend?: number;
  trendLabel?: string;
  accent?: boolean;
}

export interface DashboardActivity {
  id: string;
  icon: string;
  title: string;
  description: string;
  time: string;
  iconBg: string;
  iconColor: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardFacade {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthFacade);

  readonly kpis = signal<DashboardKpi[]>([]);
  readonly activities = signal<DashboardActivity[]>([]);
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  constructor() {
    this.loadDashboardData();
  }

  async loadDashboardData(): Promise<void> {
    try {
      this.loading.set(true);
      this.error.set(null);
      
      const user = this.auth.currentUser();
      if (!user) {
        this.loading.set(false);
        return;
      }

      await this.fetchAndCalculateMetrics(user.id);
    } catch (e: any) {
      console.error('[DashboardFacade] Error cargando dashboard:', e);
      this.error.set(e.message);
    } finally {
      this.loading.set(false);
    }
  }

  private async fetchAndCalculateMetrics(userId: string): Promise<void> {
    const now = new Date();
    const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const firstDayPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const firstDayThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString();

    const { data: workouts, error: wError } = await this.supabase.client
      .from('workouts')
      .select('id, start_time, routines(name)')
      .eq('user_id', userId)
      .gte('start_time', firstDayPreviousMonth)
      .order('start_time', { ascending: false });

    if (wError) throw wError;

    const currentMonthWorkouts = (workouts || []).filter((w: any) => w.start_time >= firstDayCurrentMonth);
    const previousMonthWorkouts = (workouts || []).filter((w: any) => w.start_time >= firstDayPreviousMonth && w.start_time < firstDayCurrentMonth);

    let currentTonnage = 0;
    let previousTonnage = 0;
    let weeklyEffectiveSets = 0;

    if (workouts && workouts.length > 0) {
      const workoutIds = workouts.map((w: any) => w.id);
      const { data: sets, error: sError } = await this.supabase.client
        .from('workout_sets')
        .select('weight, reps, set_type, completed, workout_id')
        .in('workout_id', workoutIds)
        .eq('completed', true);

      if (sError) throw sError;

      for (const set of sets || []) {
        if (set.set_type === 'warmup') continue;
        const tonnage = (Number(set.weight) || 0) * (Number(set.reps) || 0);
        const workout = workouts.find((w: any) => w.id === set.workout_id);
        if (!workout) continue;
        if (workout.start_time >= firstDayCurrentMonth) currentTonnage += tonnage;
        else previousTonnage += tonnage;
        if (workout.start_time >= firstDayThisWeek) weeklyEffectiveSets++;
      }
    }

    this.updateSignals(currentMonthWorkouts, previousMonthWorkouts, currentTonnage, previousTonnage, weeklyEffectiveSets, now);
  }

  private updateSignals(
    currentMonthWorkouts: any[], 
    previousMonthWorkouts: any[], 
    currentTonnage: number, 
    previousTonnage: number, 
    weeklyEffectiveSets: number,
    now: Date
  ): void {
    const workoutTrend = previousMonthWorkouts.length > 0 
      ? ((currentMonthWorkouts.length - previousMonthWorkouts.length) / previousMonthWorkouts.length) * 100 
      : 0;
    const tonnageTrend = previousTonnage > 0 
      ? ((currentTonnage - previousTonnage) / previousTonnage) * 100 
      : 0;

    this.kpis.set([
      { id: 'workouts', label: 'Entrenamientos (Mes)', value: currentMonthWorkouts.length, trend: Math.round(workoutTrend * 10) / 10, trendLabel: 'vs. mes anterior', accent: true },
      { id: 'tonnage', label: 'Volumen Total (Mes)', value: Math.round(currentTonnage), suffix: ' kg', trend: Math.round(tonnageTrend * 10) / 10, trendLabel: 'vs. mes anterior' },
      { id: 'sets', label: 'Series Efectivas (Semana)', value: weeklyEffectiveSets }
    ]);

    this.activities.set(currentMonthWorkouts.slice(0, 5).map((w: any) => {
      const diffDays = Math.floor((now.getTime() - new Date(w.start_time).getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: w.id,
        icon: 'activity',
        title: 'Sesión Completada',
        description: w.routines?.name || 'Entrenamiento Ad-hoc',
        time: diffDays === 0 ? 'Hoy' : `Hace ${diffDays} días`,
        iconBg: 'var(--color-primary-muted)',
        iconColor: 'var(--color-primary)'
      };
    }));
  }
}
