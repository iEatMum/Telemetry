// counselClient.js — calls the server-side AI Counsel edge function.
//
// The client detects the drift PATTERN locally (counsel.js, over the witnessed
// checkpoints) and sends just that pattern up. The function synthesizes the
// Consider card with the model + persona and returns it. The ANTHROPIC key never
// touches the client — it lives only in the function's secrets.
//
// Fails soft: returns null on any error / when there's no backend, and the UI
// keeps showing the local rule-based card. The Guardian still speaks offline.

import { supabase, isSupabaseConfigured } from './supabaseClient.js'

export async function invokeCounsel(pattern, { partnerName } = {}) {
  if (!isSupabaseConfigured || !supabase || !pattern) return null
  try {
    const { data, error } = await supabase.functions.invoke('counsel', {
      body: { pattern, partnerName },
    })
    if (error || !data || data.error) return null
    return data
  } catch {
    return null
  }
}
