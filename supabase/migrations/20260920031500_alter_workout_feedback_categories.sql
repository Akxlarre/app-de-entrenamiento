-- Migration to change feedback category to an array of categories
-- Allows users to select multiple feedback categories (e.g. technique and intensity simultaneously)

ALTER TABLE workout_exercise_feedback 
  RENAME COLUMN category TO categories;

-- If there is data, we convert the text column to a text array column
ALTER TABLE workout_exercise_feedback 
  ALTER COLUMN categories TYPE TEXT[] 
  USING ARRAY[categories];
