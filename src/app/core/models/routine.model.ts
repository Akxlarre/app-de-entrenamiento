import { ExerciseDefinition } from '../facades/exercise.facade';

export interface Routine {
  id: string;
  user_id: string;
  name: string;
  notes?: string | null;
  created_at: string;
}

export type RoutineSetType = 'normal' | 'warmup' | 'dropset' | 'failure';

export interface RoutineSetTemplate {
  set_number: number;
  set_type: RoutineSetType;
  target_reps?: string;
}

export interface RoutineExercise {
  id: string;
  routine_id: string;
  exercise_id: string;
  order_index: number;
  sets?: RoutineSetTemplate[];
  rest_seconds?: number;
  notes?: string;
  created_at: string;
  exercises?: ExerciseDefinition; // Al hacer join con la tabla exercises
}

export interface RoutineWithExercises extends Routine {
  routine_exercises: RoutineExercise[];
}

export interface CreateRoutineDto {
  name: string;
  notes?: string;
  exercises: {
    exercise_id: string;
    order_index: number;
    sets?: RoutineSetTemplate[];
    rest_seconds?: number;
    notes?: string;
  }[];
}
