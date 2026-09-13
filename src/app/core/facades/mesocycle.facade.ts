import { Injectable, signal, inject } from '@angular/core';
import { SupabaseService } from '../services/infrastructure/supabase.service';
import { MesocycleWithDetails } from '../models/mesocycle.model';

@Injectable({ providedIn: 'root' })
export class MesocycleFacade {
  private supabase = inject(SupabaseService);

  readonly activeMesocycle = signal<MesocycleWithDetails | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  async loadActiveMesocycle() {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const { data: userData } = await this.supabase.client.auth.getUser();
      if (!userData?.user) throw new Error('Usuario no autenticado');

      // Cargamos el mesociclo activo con todas sus relaciones anidadas
      const { data, error } = await this.supabase.client
        .from('mesocycles')
        .select(
          `
          *,
          weeks:mesocycle_weeks (
            *,
            sessions:mesocycle_sessions (
              *,
              targets:mesocycle_session_targets (
                *,
                exercises (id, name_es, name_en)
              ),
              routine:routines (
                *,
                routine_exercises (
                  *,
                  exercises (*)
                )
              )
            )
          )
        `,
        )
        .eq('user_id', userData.user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Ordenamos semanas y sesiones localmente para asegurar el orden cronológico
        const mesocycle = data as any;
        mesocycle.weeks = (mesocycle.weeks || []).sort(
          (a: any, b: any) => a.week_number - b.week_number,
        );
        mesocycle.weeks.forEach((w: any) => {
          w.sessions = (w.sessions || []).sort((a: any, b: any) => a.day_number - b.day_number);
        });

        this.activeMesocycle.set(mesocycle as MesocycleWithDetails);
      } else {
        this.activeMesocycle.set(null);
      }
    } catch (e: any) {
      console.error('[MesocycleFacade] Error cargando mesociclo activo:', e);
      this.error.set(e?.message || 'Error cargando plan activo');
      this.activeMesocycle.set(null);
    } finally {
      this.isLoading.set(false);
    }
  }

  // Obtiene la siguiente sesión pendiente en el calendario elástico
  getNextSession() {
    const plan = this.activeMesocycle();
    if (!plan) return null;

    for (const week of plan.weeks) {
      for (const session of week.sessions) {
        if (session.status === 'pending') {
          return { week, session };
        }
      }
    }
    return null;
  }

  async createManualMesocycle(config: { name: string; duration_weeks: number; include_deload: boolean; progression: string; routines: { day_number: number; routine_id: string }[] }) {
    this.isLoading.set(true);
    try {
      const { data: userData } = await this.supabase.client.auth.getUser();
      if (!userData?.user) throw new Error('Usuario no autenticado');

      const userId = userData.user.id;
      const mesocycleId = crypto.randomUUID();

      // 1. Insertar Mesociclo
      const { error: mErr } = await this.supabase.client.from('mesocycles').insert({
        id: mesocycleId,
        user_id: userId,
        name: config.name,
        duration_weeks: config.duration_weeks,
        status: 'active'
      });
      if (mErr) throw mErr;

      // 2. Preparar semanas y sesiones
      const weeksToInsert = [];
      const sessionsToInsert = [];

      for (let w = 1; w <= config.duration_weeks; w++) {
        const weekId = crypto.randomUUID();
        weeksToInsert.push({
          id: weekId,
          mesocycle_id: mesocycleId,
          user_id: userId,
          week_number: w,
          is_deload: config.include_deload && w === config.duration_weeks
        });

        for (const r of config.routines) {
          sessionsToInsert.push({
            id: crypto.randomUUID(),
            week_id: weekId,
            user_id: userId,
            day_number: r.day_number,
            routine_id: r.routine_id,
            status: 'pending'
          });
        }
      }

      // Insertar bulk
      const { error: wErr } = await this.supabase.client.from('mesocycle_weeks').insert(weeksToInsert);
      if (wErr) throw wErr;

      const { error: sErr } = await this.supabase.client.from('mesocycle_sessions').insert(sessionsToInsert);
      if (sErr) throw sErr;

      // TODO: En el futuro, según `config.progression` (Lineal, Ondulante, etc.), 
      // generaremos los `mesocycle_session_targets` de forma inteligente.
      
      await this.loadActiveMesocycle();
      return { success: true };
    } catch (e: any) {
      console.error('[MesocycleFacade] Error creando plan manual:', e);
      this.error.set(e?.message);
      return { success: false, error: e?.message };
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteMesocycle(mesocycleId: string) {
    this.isLoading.set(true);
    try {
      const { error } = await this.supabase.client
        .from('mesocycles')
        .delete()
        .eq('id', mesocycleId);

      if (error) throw error;
      
      // Reload para que se ponga en null el plan activo
      await this.loadActiveMesocycle();
      return { success: true };
    } catch (e: any) {
      console.error('[MesocycleFacade] Error eliminando plan:', e);
      this.error.set(e?.message);
      return { success: false, error: e?.message };
    } finally {
      this.isLoading.set(false);
    }
  }
}
