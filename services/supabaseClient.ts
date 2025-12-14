import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION ---
// Replace these with your actual Supabase project credentials.
// If these are empty, the app will fall back to LocalStorage automatically.
const SUPABASE_URL = ''; 
const SUPABASE_ANON_KEY = '';

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

/**
 * DATABASE SCHEMA INSTRUCTIONS
 * 
 * If using Supabase, run the following SQL in your SQL Editor:
 * 
 * create table players (
 *   id uuid primary key,
 *   name text not null,
 *   created_at timestamptz default now()
 * );
 * 
 * create table games (
 *   id uuid primary key,
 *   data jsonb not null,
 *   created_at timestamptz default now()
 * );
 */
