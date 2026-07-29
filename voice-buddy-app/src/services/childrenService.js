import { supabase } from '../lib/supabase.js'
import {
  getActiveChildId, setActiveChildId, getLegacySettingsRaw, saveSettingsFor,
} from '../utils/storage.js'

export async function listChildren() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('children')
    .select('id, name, buddy_name, avatar_type, avatar_color, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createChild({ name, buddyName, avatarType, avatarColor }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')
  const { data, error } = await supabase
    .from('children')
    .insert({
      user_id: user.id,
      name,
      buddy_name: buddyName || 'Buddy',
      avatar_type: avatarType || 'bear',
      avatar_color: avatarColor || '#7c3aed',
    })
    .select('id, name, buddy_name, avatar_type, avatar_color, created_at')
    .single()
  if (error) throw error
  return data
}

export async function updateChild(id, patch) {
  const row = {}
  if (patch.name !== undefined) row.name = patch.name
  if (patch.buddyName !== undefined) row.buddy_name = patch.buddyName
  if (patch.avatarType !== undefined) row.avatar_type = patch.avatarType
  if (patch.avatarColor !== undefined) row.avatar_color = patch.avatarColor
  const { error } = await supabase.from('children').update(row).eq('id', id)
  if (error) throw error
}

export async function deleteChild(id) {
  const { error } = await supabase.from('children').delete().eq('id', id)
  if (error) throw error
}

// One-time bootstrap: makes sure this device has an active child pointer.
// - Already has one → no-op.
// - Account has cloud children but this device never picked one → use the
//   oldest (their original child) and carry over any settings already
//   sitting in the legacy flat key onto that child's namespaced slot.
// - Brand-new account, zero children anywhere → create one child seeded
//   from the legacy blob (or defaults), so a pre-multi-child user's existing
//   name/avatar/routines survive untouched.
// Idempotent and cheap after the first call (short-circuits immediately).
export async function ensureActiveChildMigrated() {
  const existing = getActiveChildId()
  if (existing) return existing

  const legacy = getLegacySettingsRaw()
  const children = await listChildren()

  if (children.length > 0) {
    const first = children[0]
    saveSettingsFor(first.id, legacy || {
      childName: first.name,
      buddyName: first.buddy_name,
      avatarType: first.avatar_type,
      avatarColor: first.avatar_color,
    })
    setActiveChildId(first.id)
    return first.id
  }

  const child = await createChild({
    name: legacy?.childName || '',
    buddyName: legacy?.buddyName || 'Buddy',
    avatarType: legacy?.avatarType || 'bear',
    avatarColor: legacy?.avatarColor || '#7c3aed',
  })
  saveSettingsFor(child.id, legacy || {})
  setActiveChildId(child.id)
  return child.id
}
