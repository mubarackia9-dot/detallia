import { createClient } from '@supabase/supabase-js'

// La clave "publishable" es pública por diseño: la seguridad la dan las
// políticas RLS de la base de datos (cada usuaria solo ve sus registros).
const url = import.meta.env.VITE_SUPABASE_URL || 'https://pinaceoejtxfrlrtdcch.supabase.co'
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_o3jl7tWIurPxReVSXTKKvg_vgtMnIlo'

export const supabase = createClient(url, key)
