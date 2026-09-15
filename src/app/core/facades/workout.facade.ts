import { Injectable, signal, inject, effect } from '@angular/core';
import { SupabaseService } from '../services/infrastructure/supabase.service';
import { Router } from '@angular/router';
import { RoutineWithExercises, RoutineExercise } from '../models/routine.model';
import { WorkoutReport, WorkoutExerciseFeedback } from '../models/workout-feedback.model';
import { ToastService } from '../services/ui/toast.service';

export interface ActiveSet {
  id: string;
  set_number: number;
  set_type: 'normal' | 'warmup' | 'dropset' | 'failure';
  weight: number;
  reps: number;
  rir?: number;
  completed: boolean;
  is_from_previous?: boolean;
  target_reps?: string;
}

export interface ActiveExercise {
  exercise_id: string;
  exercise_name: string;
  rest_seconds?: number;
  notes?: string;
  sets: ActiveSet[];
  feedback?: WorkoutExerciseFeedback;
}

export interface ActiveWorkoutState {
  id: string;
  start_time: Date;
  routine_id?: string;
  mesocycle_session_id?: string;
  exercises: ActiveExercise[];
  report?: WorkoutReport;
}

export interface HistorySet {
  reps: number;
  weight: number;
  set_number: number;
  set_type: string;
  rir?: number; // Agregado para el drawer
}

export interface HistoryExerciseDetail {
  name: string;
  sets: HistorySet[];
}

export interface WorkoutHistoryItem {
  id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number;
  total_volume: number;
  total_sets: number;
  exercises_summary: string[];
  detailed_exercises: HistoryExerciseDetail[];
  energy_level?: number;
  session_rpe?: number;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class WorkoutFacade {
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private toast = inject(ToastService);

  // Estado del entrenamiento activo
  readonly activeSession = signal<ActiveWorkoutState | null>(null);
  readonly error = signal<string | null>(null);
  readonly isSaving = signal<boolean>(false);

  // Historial de entrenamientos
  readonly history = signal<WorkoutHistoryItem[]>([]);
  readonly isLoadingHistory = signal<boolean>(false);

  constructor() {
    this.restoreSession();

    // Sincronización multi-pestaña (Mitigación 4)
    window.addEventListener('storage', (event) => {
      if (event.key === 'fittrack_active_workout') {
        this.restoreSession();
      }
    });

    // Persistencia Automática
    effect(() => {
      const session = this.activeSession();
      if (session) {
        localStorage.setItem('fittrack_active_workout', JSON.stringify(session));
      } else {
        localStorage.removeItem('fittrack_active_workout');
        localStorage.removeItem('fittrack_rest_timer');
      }
    });
  }

  private restoreSession() {
    const saved = localStorage.getItem('fittrack_active_workout');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);

        // Validación básica de esquema (Mitigación 2)
        if (
          !parsed ||
          typeof parsed !== 'object' ||
          !Array.isArray(parsed.exercises) ||
          !parsed.start_time
        ) {
          throw new Error('Esquema inválido en LocalStorage');
        }

        const startTime = new Date(parsed.start_time);

        // Validación de fecha (Mitigación 3)
        if (isNaN(startTime.getTime())) {
          throw new Error('Fecha inválida');
        }

        // Límite de vigencia (Stale check): 12 horas (Mitigación 3)
        const hoursElapsed = (Date.now() - startTime.getTime()) / (1000 * 60 * 60);
        if (hoursElapsed > 12) {
          throw new Error('Entrenamiento zombie (más de 12hs)');
        }

        parsed.start_time = startTime;
        this.activeSession.set(parsed);
      } catch (e) {
        console.warn('Descartando sesión activa corrupta o caducada:', e);
        localStorage.removeItem('fittrack_active_workout');
        this.activeSession.set(null);
      }
    } else {
      this.activeSession.set(null);
    }
  }

  async startAdhocWorkout() {
    const workoutId = crypto.randomUUID();
    const session: ActiveWorkoutState = {
      id: workoutId,
      start_time: new Date(),
      exercises: [],
    };
    this.activeSession.set(session);
    this.router.navigate(['/app/workouts/active']);

    const { data: userData } = await this.supabase.client.auth.getUser();
    if (userData?.user) {
      const { error } = await this.supabase.client.from('workouts').upsert({
        id: workoutId,
        user_id: userData.user.id,
        start_time: session.start_time.toISOString(),
        end_time: null,
      });
      if (error) {
        console.warn(
          '[WorkoutFacade] No se pudo crear workout inicial en Supabase:',
          error.message,
        );
      }
    }
  }

  async startWorkoutFromRoutine(routine: RoutineWithExercises) {
    const workoutId = crypto.randomUUID();
    const session: ActiveWorkoutState = {
      id: workoutId,
      start_time: new Date(),
      routine_id: routine.id,
      exercises: [],
    };
    this.activeSession.set(session);
    this.router.navigate(['/app/workouts/active']);

    const { data: userData } = await this.supabase.client.auth.getUser();
    if (userData?.user) {
      const { error } = await this.supabase.client.from('workouts').upsert({
        id: workoutId,
        user_id: userData.user.id,
        routine_id: routine.id,
        start_time: session.start_time.toISOString(),
        end_time: null,
      });
      if (error) {
        console.warn(
          '[WorkoutFacade] No se pudo crear workout inicial en Supabase:',
          error.message,
        );
      }
    }

    // Cargar los ejercicios de la rutina secuencialmente para rellenar con historial y configuración
    for (const rx of routine.routine_exercises) {
      if (rx.exercises) {
        const name = rx.exercises.name_es || rx.exercises.name_en;
        await this.addExerciseFromRoutine(rx, name);
      }
    }
  }

  async startWorkoutFromMesocycleSession(mesoSession: any, routine: RoutineWithExercises) {
    const workoutId = crypto.randomUUID();
    const stateSession: ActiveWorkoutState = {
      id: workoutId,
      start_time: new Date(),
      routine_id: routine.id,
      mesocycle_session_id: mesoSession.id,
      exercises: [],
    };
    this.activeSession.set(stateSession);
    this.router.navigate(['/app/workouts/active']);

    const { data: userData } = await this.supabase.client.auth.getUser();
    if (userData?.user) {
      const { error } = await this.supabase.client.from('workouts').upsert({
        id: workoutId,
        user_id: userData.user.id,
        routine_id: routine.id,
        start_time: stateSession.start_time.toISOString(),
        end_time: null,
      });
      if (error) {
        console.warn(
          '[WorkoutFacade] No se pudo crear workout inicial en Supabase:',
          error.message,
        );
      }
    }

    // Cargar los ejercicios con los targets del mesociclo
    for (const rx of routine.routine_exercises) {
      if (rx.exercises) {
        const name = rx.exercises.name_es || rx.exercises.name_en;
        const targets =
          mesoSession.targets?.filter((t: any) => t.exercise_id === rx.exercise_id) || [];
        await this.addExerciseFromRoutine(rx, name, targets);
      }
    }
  }

  async addExerciseFromRoutine(rx: RoutineExercise, exerciseName: string, mesoTargets?: any[]) {
    let previousSets: any[] = [];

    try {
      // 1. Encontrar el último entrenamiento donde se hizo este ejercicio
      const { data: latestSet } = await this.supabase.client
        .from('workout_sets')
        .select('workout_id')
        .eq('exercise_id', rx.exercise_id)
        .eq('completed', true)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestSet) {
        // 2. Traer todas las series de ese entrenamiento
        const { data: sets } = await this.supabase.client
          .from('workout_sets')
          .select('weight, reps, rir, set_type, set_number')
          .eq('workout_id', latestSet.workout_id)
          .eq('exercise_id', rx.exercise_id)
          .eq('completed', true)
          .order('set_number', { ascending: true });

        if (sets && sets.length > 0) {
          previousSets = sets;
        }
      }
    } catch (e) {
      console.warn('[WorkoutFacade] Historial no encontrado para autocompletar', e);
    }

    this.activeSession.update((session) => {
      if (!session) return session;

      let setsToCreate: ActiveSet[] = [];
      const routineSets = rx.sets || [];

      if (routineSets.length > 0) {
        // La rutina tiene series configuradas: respetamos la estructura y heredamos el historial
        setsToCreate = routineSets.map((rs, index) => {
          const ps = previousSets[index];
          const target = mesoTargets?.find((t) => t.set_number === (rs.set_number || index + 1));

          return {
            id: crypto.randomUUID(),
            set_number: rs.set_number || index + 1,
            set_type: rs.set_type || 'normal',
            weight: target?.target_weight !== undefined ? target.target_weight : ps?.weight || 0,
            reps: ps?.reps || 0,
            rir: target?.target_rir !== undefined ? target.target_rir : ps?.rir,
            completed: false,
            is_from_previous: Boolean(ps),
            target_reps: target?.target_reps || rs.target_reps,
          };
        });
      } else if (previousSets.length > 0) {
        // Fallback: usar historial previo si la rutina no tenía series configuradas
        setsToCreate = previousSets.map((ps, index) => {
          const target = mesoTargets?.find((t) => t.set_number === ps.set_number);

          return {
            id: crypto.randomUUID(),
            set_number: ps.set_number,
            set_type: ps.set_type || 'normal',
            weight: target?.target_weight !== undefined ? target.target_weight : ps.weight || 0,
            reps: ps.reps || 0,
            rir: target?.target_rir !== undefined ? target.target_rir : ps.rir,
            completed: false,
            is_from_previous: true,
            target_reps: target?.target_reps,
          };
        });
      } else {
        // 1 serie vacía por defecto
        setsToCreate = [
          {
            id: crypto.randomUUID(),
            set_number: 1,
            set_type: 'normal' as const,
            weight: 0,
            reps: 0,
            completed: false,
            is_from_previous: false,
          },
        ];
      }

      const newExercise: ActiveExercise = {
        exercise_id: rx.exercise_id,
        exercise_name: exerciseName,
        rest_seconds: rx.rest_seconds,
        notes: rx.notes,
        sets: setsToCreate,
      };

      return { ...session, exercises: [...session.exercises, newExercise] };
    });
  }

  async addExercise(exerciseId: string, exerciseName: string) {
    let previousSets: any[] = [];

    try {
      // 1. Encontrar el último entrenamiento donde se hizo este ejercicio
      const { data: latestSet } = await this.supabase.client
        .from('workout_sets')
        .select('workout_id')
        .eq('exercise_id', exerciseId)
        .eq('completed', true)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestSet) {
        // 2. Traer todas las series de ese entrenamiento
        const { data: sets } = await this.supabase.client
          .from('workout_sets')
          .select('weight, reps, rir, set_type, set_number')
          .eq('workout_id', latestSet.workout_id)
          .eq('exercise_id', exerciseId)
          .eq('completed', true)
          .order('set_number', { ascending: true });

        if (sets && sets.length > 0) {
          previousSets = sets;
        }
      }
    } catch (e) {
      console.warn('[WorkoutFacade] Historial no encontrado para autocompletar', e);
    }

    this.activeSession.update((session) => {
      if (!session) return session;

      let setsToCreate = [];
      if (previousSets.length > 0) {
        setsToCreate = previousSets.map((ps) => ({
          id: crypto.randomUUID(),
          set_number: ps.set_number,
          set_type: ps.set_type || 'normal',
          weight: ps.weight || 0,
          reps: ps.reps || 0,
          rir: ps.rir,
          completed: false,
          is_from_previous: true,
        }));
      } else {
        setsToCreate = [
          {
            id: crypto.randomUUID(),
            set_number: 1,
            set_type: 'normal' as const,
            weight: 0,
            reps: 0,
            completed: false,
            is_from_previous: false,
          },
        ];
      }

      const newExercise: ActiveExercise = {
        exercise_id: exerciseId,
        exercise_name: exerciseName,
        sets: setsToCreate,
      };

      return { ...session, exercises: [...session.exercises, newExercise] };
    });
  }

  removeExercise(exerciseId: string) {
    const session = this.activeSession();
    if (session) {
      this.supabase.client
        .from('workout_sets')
        .delete()
        .eq('workout_id', session.id)
        .eq('exercise_id', exerciseId)
        .then();
    }
    this.activeSession.update((curr) => {
      if (!curr) return curr;
      return {
        ...curr,
        exercises: curr.exercises.filter((ex) => ex.exercise_id !== exerciseId),
      };
    });
  }

  addSet(exerciseId: string) {
    this.activeSession.update((session) => {
      if (!session) return session;
      const exercises = session.exercises.map((ex) => {
        if (ex.exercise_id === exerciseId) {
          const lastSet = ex.sets[ex.sets.length - 1];
          return {
            ...ex,
            sets: [
              ...ex.sets,
              {
                id: crypto.randomUUID(),
                set_number: ex.sets.length + 1,
                set_type: 'normal' as const,
                weight: lastSet ? lastSet.weight : 0,
                reps: lastSet ? lastSet.reps : 0,
                completed: false,
                is_from_previous: false,
              },
            ],
          };
        }
        return ex;
      });
      return { ...session, exercises };
    });
  }

  updateSet(exerciseId: string, setId: string, updates: Partial<ActiveSet>) {
    this.activeSession.update((session) => {
      if (!session) return session;
      const exercises = session.exercises.map((ex) => {
        if (ex.exercise_id === exerciseId) {
          const sets = ex.sets.map((s) => (s.id === setId ? { ...s, ...updates } : s));
          return { ...ex, sets };
        }
        return ex;
      });
      return { ...session, exercises };
    });

    const session = this.activeSession();
    if (session && updates.completed !== undefined) {
      const exercise = session.exercises.find((ex) => ex.exercise_id === exerciseId);
      const set = exercise?.sets.find((s) => s.id === setId);
      if (set) {
        const completedAt = set.completed ? new Date().toISOString() : null;
        this.supabase.client.auth.getUser().then(async ({ data: userData }) => {
          if (!userData?.user) return; // Si no hay usuario autenticado, la sesión se guardará al finalizar

          const startTimeIso = (
            session.start_time instanceof Date ? session.start_time : new Date(session.start_time)
          ).toISOString();

          // Garantizar que la sesión padre existe en BD antes de asociar el set
          await this.supabase.client.from('workouts').upsert(
            {
              id: session.id,
              user_id: userData.user.id,
              start_time: startTimeIso,
              end_time: null,
            },
            { onConflict: 'id' },
          );

          this.supabase.client
            .from('workout_sets')
            .upsert(
              {
                id: set.id,
                workout_id: session.id,
                exercise_id: exerciseId,
                set_number: set.set_number,
                set_type: set.set_type,
                weight: Number(set.weight) || 0,
                reps: Number(set.reps) || 0,
                rir: set.rir != null ? Number(set.rir) : null,
                completed: Boolean(set.completed),
                completed_at: completedAt,
              },
              { onConflict: 'id' },
            )
            .then(({ error }) => {
              if (error) {
                console.warn('[WorkoutFacade] Error al sincronizar serie en vivo:', error.message);
              }
            });
        });
      }
    }
  }

  removeSet(exerciseId: string, setId: string) {
    this.supabase.client.from('workout_sets').delete().eq('id', setId).then();

    this.activeSession.update((session) => {
      if (!session) return session;
      const exercises = session.exercises.map((ex) => {
        if (ex.exercise_id === exerciseId) {
          const sets = ex.sets
            .filter((s) => s.id !== setId)
            .map((s, index) => ({
              ...s,
              set_number: index + 1,
            }));
          return { ...ex, sets };
        }
        return ex;
      });
      return { ...session, exercises };
    });
  }

  discardWorkout() {
    const session = this.activeSession();
    if (session) {
      this.supabase.client.from('workouts').delete().eq('id', session.id).then();
    }
    this.activeSession.set(null);
    this.router.navigate(['/app/workouts']);
  }

  setExerciseFeedback(exerciseId: string, feedback: WorkoutExerciseFeedback) {
    this.activeSession.update((session) => {
      if (!session) return session;
      const exercises = session.exercises.map((ex) => {
        if (ex.exercise_id === exerciseId) {
          return { ...ex, feedback };
        }
        return ex;
      });
      return { ...session, exercises };
    });
  }

  setSessionReport(report: WorkoutReport) {
    this.activeSession.update((session) => {
      if (!session) return session;
      return { ...session, report };
    });
  }

  async finishWorkout(): Promise<{ success: boolean; error?: string }> {
    const session = this.activeSession();
    if (!session) return { success: false, error: 'No hay sesión activa' };

    this.isSaving.set(true);

    // Obtenemos el usuario autenticado
    const { data: userData } = await this.supabase.client.auth.getUser();

    // Mitigación 1: Guardado tolerante a fallas (Offline / Auth expirado)
    if (!userData?.user) {
      const pendingSync = JSON.parse(localStorage.getItem('fittrack_pending_sync') || '[]');
      pendingSync.push({
        ...session,
        end_time: new Date().toISOString(),
        saved_at: new Date().toISOString(),
      });
      localStorage.setItem('fittrack_pending_sync', JSON.stringify(pendingSync));

      this.error.set(
        'Sesión expirada. Tu entrenamiento se guardó localmente y se sincronizará después.',
      );
      this.activeSession.set(null);
      this.isSaving.set(false);
      this.router.navigate(['/app/workouts']);
      return { success: true };
    }

    const startTimeIso = (
      session.start_time instanceof Date ? session.start_time : new Date(session.start_time)
    ).toISOString();

    // 1. Upsert Workout
    const { error: wError } = await this.supabase.client.from('workouts').upsert(
      {
        id: session.id,
        user_id: userData.user.id,
        routine_id: session.routine_id || null,
        start_time: startTimeIso,
        end_time: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

    if (wError) {
      this.error.set(wError.message);
      this.isSaving.set(false);
      return { success: false, error: wError.message };
    }

    // 2. Upsert Sets and collect Feedbacks
    const setsToInsert = [];
    const exerciseFeedbacksToInsert = [];

    for (const ex of session.exercises) {
      for (const set of ex.sets) {
        if (set.completed) {
          setsToInsert.push({
            id: set.id,
            workout_id: session.id,
            exercise_id: ex.exercise_id,
            set_number: set.set_number,
            set_type: set.set_type,
            weight: Number(set.weight) || 0,
            reps: Number(set.reps) || 0,
            rir: set.rir != null ? Number(set.rir) : null,
            completed: true,
          });
        }
      }

      if (ex.feedback) {
        exerciseFeedbacksToInsert.push({
          workout_id: session.id,
          exercise_id: ex.exercise_id,
          user_id: userData.user.id,
          category: ex.feedback.category,
          rating: ex.feedback.rating || null,
          tags: ex.feedback.tags || [],
          notes: ex.feedback.notes || null,
        });
      }
    }

    if (setsToInsert.length > 0) {
      const { error: sError } = await this.supabase.client
        .from('workout_sets')
        .upsert(setsToInsert, { onConflict: 'id' });

      if (sError) {
        this.error.set(sError.message);
        this.isSaving.set(false);
        return { success: false, error: sError.message };
      }
    }

    // 3. Upsert Exercise Feedbacks
    if (exerciseFeedbacksToInsert.length > 0) {
      const { error: efError } = await this.supabase.client
        .from('workout_exercise_feedback')
        .insert(exerciseFeedbacksToInsert);

      if (efError) {
        console.warn('[WorkoutFacade] Error saving exercise feedbacks:', efError.message);
        this.toast.warning(
          'Entrenamiento guardado',
          'No se pudo guardar el feedback de uno o más ejercicios.',
        );
      }
    }

    // 4. Upsert Session Report
    if (session.report) {
      const { error: rError } = await this.supabase.client.from('workout_reports').insert({
        workout_id: session.id,
        user_id: userData.user.id,
        energy_level: session.report.energy_level || null,
        session_rpe: session.report.session_rpe || null,
        satisfaction_rating: session.report.satisfaction_rating || null,
        notes: session.report.notes || null,
      });

      if (rError) {
        console.warn('[WorkoutFacade] Error saving session report:', rError.message);
        this.toast.warning(
          'Entrenamiento guardado',
          'No se pudo guardar tu resumen de energía/RPE/notas de la sesión.',
        );
      }
    }

    // 5. Update Mesocycle Session if this belongs to a plan
    if (session.mesocycle_session_id) {
      const { error: msError } = await this.supabase.client
        .from('mesocycle_sessions')
        .update({
          status: 'completed',
          completed_workout_id: session.id,
        })
        .eq('id', session.mesocycle_session_id);

      if (msError) {
        console.warn(
          '[WorkoutFacade] Error marking mesocycle session as completed:',
          msError.message,
        );
      }
    }

    // Clean and redirect
    this.activeSession.set(null);
    this.error.set(null);
    this.isSaving.set(false);
    this.loadHistory();
    this.router.navigate(['/app/workouts']);
    return { success: true };
  }

  async syncPendingWorkouts() {
    const raw = localStorage.getItem('fittrack_pending_sync');
    if (!raw) return;
    try {
      const pending: any[] = JSON.parse(raw);
      if (!Array.isArray(pending) || pending.length === 0) return;

      const { data: userData } = await this.supabase.client.auth.getUser();
      if (!userData?.user) return;

      const remaining: any[] = [];

      for (const session of pending) {
        const { error: wError } = await this.supabase.client.from('workouts').upsert({
          id: session.id,
          user_id: userData.user.id,
          start_time:
            typeof session.start_time === 'string'
              ? session.start_time
              : new Date(session.start_time).toISOString(),
          end_time: session.end_time || new Date().toISOString(),
        });

        if (wError) {
          remaining.push(session);
          continue;
        }

        const setsToInsert = [];
        for (const ex of session.exercises || []) {
          for (const set of ex.sets || []) {
            if (set.completed) {
              setsToInsert.push({
                id: set.id,
                workout_id: session.id,
                exercise_id: ex.exercise_id,
                set_number: set.set_number,
                set_type: set.set_type,
                weight: set.weight,
                reps: set.reps,
                rir: set.rir || null,
                completed: true,
              });
            }
          }
        }

        if (setsToInsert.length > 0) {
          await this.supabase.client.from('workout_sets').upsert(setsToInsert);
        }
      }

      if (remaining.length > 0) {
        localStorage.setItem('fittrack_pending_sync', JSON.stringify(remaining));
      } else {
        localStorage.removeItem('fittrack_pending_sync');
      }
    } catch (e) {
      console.warn('Error sincronizando entrenamientos pendientes:', e);
    }
  }

  async loadHistory() {
    await this.syncPendingWorkouts();
    this.isLoadingHistory.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('workouts')
        .select(
          `
          id,
          start_time,
          end_time,
          workout_sets (
            id,
            weight,
            reps,
            rir,
            completed,
            set_number,
            set_type,
            exercises (
              name_es,
              name_en
            )
          ),
          workout_reports (
            energy_level,
            session_rpe,
            notes
          )
        `,
        )
        .order('start_time', { ascending: false });

      if (error) {
        this.error.set(error.message);
        return;
      }

      if (data) {
        const items: WorkoutHistoryItem[] = data.map((w: any) => {
          const sets = (w.workout_sets || []).filter((s: any) => s.completed);
          let volume = 0;
          const exerciseNames = new Set<string>();

          // Agrupación detallada para el Drawer
          const groupedExercises = new Map<string, HistorySet[]>();

          for (const s of sets) {
            volume += (Number(s.weight) || 0) * (Number(s.reps) || 0);
            const exName = s.exercises?.name_es || s.exercises?.name_en || 'Ejercicio Desconocido';
            exerciseNames.add(exName);

            if (!groupedExercises.has(exName)) {
              groupedExercises.set(exName, []);
            }
            groupedExercises.get(exName)!.push({
              reps: Number(s.reps) || 0,
              weight: Number(s.weight) || 0,
              set_number: s.set_number,
              set_type: s.set_type || 'normal',
              rir: s.rir,
            });
          }

          const detailed_exercises: HistoryExerciseDetail[] = Array.from(
            groupedExercises.entries(),
          ).map(([name, sets]) => ({
            name,
            sets: sets.sort((a, b) => a.set_number - b.set_number),
          }));

          let duration = 0;
          if (w.start_time && w.end_time) {
            const diffMs = new Date(w.end_time).getTime() - new Date(w.start_time).getTime();
            duration = Math.max(1, Math.round(diffMs / (1000 * 60)));
          }

          // PostgREST embebe una relación 1:1 (FK con UNIQUE) como objeto en
          // versiones recientes, pero como array de 1 elemento en otras — se
          // normaliza acá para no depender de la versión del backend.
          const report = Array.isArray(w.workout_reports)
            ? w.workout_reports[0]
            : w.workout_reports;

          return {
            id: w.id,
            start_time: w.start_time,
            end_time: w.end_time,
            duration_minutes: duration,
            total_volume: Math.round(volume),
            total_sets: sets.length,
            exercises_summary: Array.from(exerciseNames),
            detailed_exercises,
            energy_level: report?.energy_level ?? undefined,
            session_rpe: report?.session_rpe ?? undefined,
            notes: report?.notes ?? undefined,
          };
        });

        this.history.set(items);
      }
    } catch (e: any) {
      this.error.set(e?.message || 'Error cargando historial');
    } finally {
      this.isLoadingHistory.set(false);
    }
  }
}
