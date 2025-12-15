import { createClient } from '@supabase/supabase-js';

// Hardcoded credentials
const supabaseUrl = 'https://jvxqlhpcbdphlxlkjiod.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2eHFsaHBjYmRwaGx4bGtqaW9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3MTg2NzIsImV4cCI6MjA4MTI5NDY3Mn0.5zbjldhruZJKsGoSL9aQdJ9AMNmZtW-6ZGgNn3qJnjw';

// Create the Supabase client
// Note: We removed the custom 'chiptracker' schema config to default to 'public'.
export const supabase = createClient(supabaseUrl, supabaseKey);