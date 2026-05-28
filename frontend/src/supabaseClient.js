import { createClient } from '@supabase/supabase-js';

// ถ้าคุณใช้ Vite ให้ใช้ import.meta.env
// ถ้าใช้ Create React App ให้ใช้ process.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);