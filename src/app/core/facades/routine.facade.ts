import { Injectable, signal, inject } from '@angular/core';
import { SupabaseService } from '../services/infrastructure/supabase.service';
import { ToastService } from '../services/ui/toast.service';
import { RoutineWithExercises, CreateRoutineDto } from '../models/routine.model';

/** Código Postgres de foreign_key_violation. */
const FK_VIOLATION = '23503';

@Injectable({ providedIn: 'root' })
export class RoutineFacade {
  private supabase = inject(SupabaseService);
  private toast = inject(ToastService);

  readonly routines = signal<RoutineWithExercises[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  async loadRoutines() {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      // Cargamos rutinas junto con sus ejercicios y el detalle del ejercicio (nombre, etc.)
      const { data, error } = await this.supabase.client
        .from('routines')
        .select(
          `
          *,
          routine_exercises (
            *,
            exercises (*)
          )
        `,
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Ordenamos los ejercicios dentro de cada rutina según su order_index
      const sortedData = (data as any[]).map((r) => ({
        ...r,
        routine_exercises: (r.routine_exercises || []).sort(
          (a: any, b: any) => a.order_index - b.order_index,
        ),
      }));

      this.routines.set(sortedData as RoutineWithExercises[]);
    } catch (e: any) {
      console.error('[RoutineFacade] Error cargando rutinas:', e);
      this.error.set(e?.message || 'Error cargando rutinas');
    } finally {
      this.isLoading.set(false);
    }
  }

  async createRoutine(dto: CreateRoutineDto): Promise<string | null> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const { data: userData } = await this.supabase.client.auth.getUser();
      if (!userData?.user) throw new Error('Usuario no autenticado');

      // 1. Crear la rutina
      const routineId = crypto.randomUUID();
      const { error: routineError } = await this.supabase.client.from('routines').insert({
        id: routineId,
        user_id: userData.user.id,
        name: dto.name,
        notes: dto.notes || null,
      });

      if (routineError) throw routineError;

      // 2. Insertar los ejercicios asociados
      if (dto.exercises && dto.exercises.length > 0) {
        const exercisesToInsert = dto.exercises.map((ex) => ({
          id: crypto.randomUUID(),
          routine_id: routineId,
          exercise_id: ex.exercise_id,
          order_index: ex.order_index,
          sets: ex.sets || [],
          rest_seconds: ex.rest_seconds ?? 90,
          notes: ex.notes || null,
        }));

        const { error: exError } = await this.supabase.client
          .from('routine_exercises')
          .insert(exercisesToInsert);

        if (exError) throw exError;
      }

      // 3. Recargar la lista
      await this.loadRoutines();
      return routineId;
    } catch (e: any) {
      console.error('[RoutineFacade] Error creando rutina:', e);
      this.error.set(e?.message || 'Error al crear la rutina');
      return null;
    } finally {
      this.isLoading.set(false);
    }
  }

  async getRoutine(id: string): Promise<RoutineWithExercises | null> {
    const existing = this.routines().find((r) => r.id === id);
    if (existing) return existing;

    try {
      const { data, error } = await this.supabase.client
        .from('routines')
        .select(
          `
          *,
          routine_exercises (
            *,
            exercises (*)
          )
        `,
        )
        .eq('id', id)
        .single();

      if (error || !data) return null;

      const sorted = {
        ...data,
        routine_exercises: (data.routine_exercises || []).sort(
          (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0),
        ),
      };
      return sorted as RoutineWithExercises;
    } catch {
      return null;
    }
  }

  async updateRoutine(id: string, dto: CreateRoutineDto): Promise<boolean> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      // 1. Actualizar rutina base
      const { error: routineError } = await this.supabase.client
        .from('routines')
        .update({
          name: dto.name,
          notes: dto.notes || null,
        })
        .eq('id', id);

      if (routineError) throw routineError;

      // 2. Reemplazar ejercicios de la rutina (borrar existentes e insertar los actualizados)
      await this.supabase.client.from('routine_exercises').delete().eq('routine_id', id);

      if (dto.exercises && dto.exercises.length > 0) {
        const exercisesToInsert = dto.exercises.map((ex) => ({
          id: crypto.randomUUID(),
          routine_id: id,
          exercise_id: ex.exercise_id,
          order_index: ex.order_index,
          sets: ex.sets || [],
          rest_seconds: ex.rest_seconds ?? 90,
          notes: ex.notes || null,
        }));

        const { error: exError } = await this.supabase.client
          .from('routine_exercises')
          .insert(exercisesToInsert);

        if (exError) throw exError;
      }

      // 3. Recargar la lista
      await this.loadRoutines();
      return true;
    } catch (e: any) {
      console.error('[RoutineFacade] Error actualizando rutina:', e);
      this.error.set(e?.message || 'Error al actualizar la rutina');
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteRoutine(id: string): Promise<boolean> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const { error } = await this.supabase.client.from('routines').delete().eq('id', id);

      if (error) throw error;

      this.routines.update((arr) => arr.filter((r) => r.id !== id));
      return true;
    } catch (e: any) {
      console.error('[RoutineFacade] Error eliminando rutina:', e);
      // mesocycle_sessions.routine_id es ON DELETE RESTRICT: si un plan usa la
      // rutina, la base rechaza el borrado con foreign_key_violation.
      if (e?.code === FK_VIOLATION) {
        const detalle =
          'Forma parte de un plan de entrenamiento. Para eliminarla, primero elimina el plan que la usa.';
        this.error.set(detalle);
        this.toast.error('No se puede eliminar la rutina', detalle);
      } else {
        this.error.set('No se pudo eliminar la rutina.');
        this.toast.error('No se pudo eliminar la rutina', 'Inténtalo de nuevo en unos segundos.');
      }
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }
}
