import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { getActiveChildId } from '../utils/storage.js'

export function useCompletions() {
  const [completions, setCompletions] = useState(new Set())

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const childId = getActiveChildId()
      let query = supabase
        .from('lesson_completions')
        .select('course_id, lesson_id')
        .eq('user_id', user.id)
      // Rows from before multi-child shipped have child_id = null — treat
      // those as belonging to whichever child this device resolved as
      // "active" first, so existing progress isn't orphaned.
      query = childId ? query.or(`child_id.eq.${childId},child_id.is.null`) : query
      query.then(({ data, error }) => {
        if (error) { console.error('Failed to fetch completions:', error); return }
        if (data) setCompletions(new Set(data.map(r => `${r.course_id}:${r.lesson_id}`)))
      })
    })
  }, [])

  const markComplete = useCallback(async (courseId, lessonId) => {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return
    const childId = getActiveChildId()
    const { error: upsertError } = await supabase.from('lesson_completions').upsert(
      { user_id: user.id, course_id: courseId, lesson_id: lessonId, child_id: childId },
      { onConflict: 'user_id,course_id,lesson_id,child_id' }
    )
    if (upsertError) { console.error('Failed to save completion:', upsertError); return }
    setCompletions(prev => new Set([...prev, `${courseId}:${lessonId}`]))
  }, [])

  return { completions, markComplete }
}
