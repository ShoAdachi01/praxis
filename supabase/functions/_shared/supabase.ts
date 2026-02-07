import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

/** Admin client that bypasses RLS — use for reading/writing tokens */
export function createServiceClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey)
}

/** User-scoped client from the Authorization header — use for auth verification */
export function createUserClient(authHeader: string) {
  return createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
}
