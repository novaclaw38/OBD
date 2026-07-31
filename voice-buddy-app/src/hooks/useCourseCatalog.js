import { useState, useEffect } from 'react'
import { fetchCatalog } from '../services/courseService.js'

// Shared by CoursesPage and the Parent dashboard's progress view. The catalog
// is small and rarely changes, so each consumer fetching once on mount is
// cheaper than threading it through context.
export function useCourseCatalog() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchCatalog()
      .then((data) => { if (!cancelled) setCourses(data) })
      .catch((err) => { if (!cancelled) setError(err) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return { courses, loading, error }
}
