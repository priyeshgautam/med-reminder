/*
  # Medication Tracker Schema

  1. New Tables
    - `managed_users`
      - `id` (uuid, primary key)
      - `owner_id` (uuid, references auth.users)
      - `name` (text)
      - `created_at` (timestamp)
    
    - `medications`
      - `id` (uuid, primary key)
      - `managed_user_id` (uuid, references managed_users)
      - `name` (text)
      - `dosage` (text)
      - `notes` (text)
      - `created_at` (timestamp)
    
    - `schedules`
      - `id` (uuid, primary key)
      - `medication_id` (uuid, references medications)
      - `time` (time)
      - `days` (text[])
      - `created_at` (timestamp)
      - `last_taken` (timestamp)
      - `next_reminder` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their data
*/

-- Create managed_users table
CREATE TABLE managed_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create medications table
CREATE TABLE medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  managed_user_id uuid REFERENCES managed_users NOT NULL,
  name text NOT NULL,
  dosage text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create schedules table
CREATE TABLE schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id uuid REFERENCES medications NOT NULL,
  time time NOT NULL,
  days text[] NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_taken timestamptz,
  next_reminder timestamptz
);

-- Enable Row Level Security
ALTER TABLE managed_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their managed users"
  ON managed_users
  FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can manage medications for their managed users"
  ON medications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM managed_users
      WHERE managed_users.id = medications.managed_user_id
      AND managed_users.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage schedules for their medications"
  ON schedules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM medications
      JOIN managed_users ON managed_users.id = medications.managed_user_id
      WHERE medications.id = schedules.medication_id
      AND managed_users.owner_id = auth.uid()
    )
  );