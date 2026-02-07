import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Running in demo mode.')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
    }
  }
)

export type Profile = {
  id: string
  email: string
  display_initial: string
  partner_id: string | null
  created_at: string
}

export type Stone = {
  id: string
  user_id: string
  text: string
  placed_at: string
}

export type Invite = {
  id: string
  code: string
  created_by: string
  claimed_by: string | null
  created_at: string
}

export type Thought = {
  id: string
  stone_id: string
  user_id: string
  text: string
  created_at: string
}

export type SocialConnection = {
  id: string
  user_id: string
  provider: string
  auto_publish: boolean
  provider_username: string | null
  created_at: string
  updated_at: string
}
