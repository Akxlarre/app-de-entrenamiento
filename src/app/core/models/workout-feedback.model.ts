export type FeedbackCategory = 'pain' | 'technique' | 'equipment' | 'intensity' | 'other';

export interface WorkoutReport {
  id?: string;
  workout_id: string;
  user_id?: string;
  energy_level?: number; // 1-5
  session_rpe?: number; // 1-10
  satisfaction_rating?: number; // 1-5
  notes?: string;
  created_at?: string;
}

export interface WorkoutExerciseFeedback {
  id?: string;
  workout_id?: string; // Can be added later if generated client-side
  exercise_id: string;
  user_id?: string;
  category: FeedbackCategory;
  rating?: number; // 1-5
  tags?: string[];
  notes?: string;
  created_at?: string;
}
