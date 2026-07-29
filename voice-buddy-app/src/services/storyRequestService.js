import { supabase } from '../lib/supabase.js'

export async function sendStoryRequest(promptText) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')
  const { error } = await supabase.from('story_requests').insert({
    user_id: user.id,
    prompt_text: promptText,
  })
  if (error) throw error
}

export async function fetchLatestUndelivered() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('story_requests')
    .select('id, prompt_text')
    .eq('user_id', user.id)
    .eq('delivered', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function fetchSentStoryRequests(limit = 10) {
  const { data, error } = await supabase
    .from('story_requests')
    .select('id, prompt_text, delivered, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

export async function markStoryDelivered(id) {
  await supabase.from('story_requests').update({ delivered: true }).eq('id', id)
}
