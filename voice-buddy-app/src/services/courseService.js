import { authHeaders } from './chatService.js'

async function getJson(url) {
  const response = await fetch(url, { headers: await authHeaders() })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    if (body.error?.code === 'PRO_REQUIRED') throw new Error('PRO_REQUIRED')
    throw new Error(body.error?.message || `HTTP ${response.status}`)
  }
  return response.json()
}

export async function fetchCatalog() {
  const { courses } = await getJson('/api/courses')
  return courses
}

export async function fetchLesson(courseId, lessonId) {
  return getJson(`/api/lesson?course=${encodeURIComponent(courseId)}&lesson=${encodeURIComponent(lessonId)}`)
}
