import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION ---
// Replace these with your actual Supabase project credentials.
// If these are empty, the app will fall back to LocalStorage automatically.
const SUPABASE_URL = 'https://jvxqlhpcbdphlxlkjiod.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2eHFsaHBjYmRwaGx4bGtqaW9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3MTg2NzIsImV4cCI6MjA4MTI5NDY3Mn0.5zbjldhruZJKsGoSL9aQdJ9AMNmZtW-6ZGgNn3qJnjw';

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      db: {
        schema: 'ChipTracker'
      }
    }) 
  : null;

/**
 * DATABASE SCHEMA INSTRUCTIONS
 * 
 * You have moved your tables to the 'ChipTracker' schema.
 * Ensure you have added 'ChipTracker' to "Exposed Schemas" in Supabase Settings -> API.
 * 
 * Schema Reference:
 * 
 * create schema "ChipTracker";
 * 
 * create table "ChipTracker".players (
 *   id uuid primary key,
 *   name text not null,
 *   created_at timestamptz default now()
 * );
 * 
 * create table "ChipTracker".groups (
 *   id uuid primary key,
 *   name text not null,
 *   player_ids jsonb default '[]',
 *   created_at timestamptz default now()
 * );
 * 
 * create table "ChipTracker".games (
 *   id uuid primary key,
 *   data jsonb not null,
 *   created_at timestamptz default now()
 * );
 */