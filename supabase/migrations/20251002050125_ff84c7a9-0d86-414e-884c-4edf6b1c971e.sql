-- Add matrix_color column to profiles table for customizable matrix rain animation
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS matrix_color TEXT DEFAULT '#00ff00';