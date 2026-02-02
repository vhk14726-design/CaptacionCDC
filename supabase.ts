
import { createClient } from '@supabase/supabase-js';

// Credenciales vinculadas directamente para tu proyecto
const SUPABASE_URL = 'https://qhexfrvlefnxwjtoshhl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoZXhmcnZsZWZueHdqdG9zaGhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMzExNDEsImV4cCI6MjA4NTYwNzE0MX0.JWmYrGm3yiddJvtaIiYfOTyB7XJME7tr5XBkOVOT9Os';

// Inicialización garantizada del cliente
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.debug("Supabase Central Intelligence System: Online");
