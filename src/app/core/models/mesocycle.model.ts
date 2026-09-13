export type MesocycleStatus = 'active' | 'completed' | 'abandoned';
export type SessionStatus = 'pending' | 'completed' | 'skipped';

export interface Mesocycle {
  id: string;
  user_id: string;
  name: string;
  duration_weeks: number;
  current_week: number;
  status: MesocycleStatus;
  start_date?: string;
  created_at: string;
}

export interface MesocycleWeek {
  id: string;
  mesocycle_id: string;
  user_id: string;
  week_number: number;
  is_deload: boolean;
  focus_notes?: string;
  created_at: string;
}

export interface MesocycleSession {
  id: string;
  week_id: string;
  user_id: string;
  day_number: number;
  routine_id: string;
  status: SessionStatus;
  completed_workout_id?: string;
  created_at: string;
  routine?: any;
  targets?: MesocycleSessionTarget[];
}

export interface MesocycleSessionTarget {
  id: string;
  session_id: string;
  user_id: string;
  exercise_id: string;
  set_number: number;
  target_weight?: number;
  target_reps?: string;
  target_rir?: number;
  created_at: string;
}

// Interfaz agregada para facilitar el uso en el Frontend
export interface MesocycleWithDetails extends Mesocycle {
  weeks: (MesocycleWeek & {
    sessions: (MesocycleSession & {
      targets: MesocycleSessionTarget[];
      routine?: any; // RoutineWithExercises (se importa cuando se use)
    })[];
  })[];
}
