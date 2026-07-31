import { getUser } from './_auth.js'
import { COURSES } from './_courseData.js'

// The catalog is the sales pitch — titles and learning objectives are what
// convince a parent to subscribe, so any signed-in user may read it. Lesson
// steps live behind api/lesson.js and require entitlement.
const toCatalog = (course) => ({
  id: course.id,
  title: course.title,
  emoji: course.emoji,
  color: course.color,
  description: course.description,
  subject: course.subject,
  lessons: course.lessons.map((l) => ({
    id: l.id,
    title: l.title,
    emoji: l.emoji,
    ageBand: l.ageBand ?? null,
    objective: l.objective ?? null,
  })),
})

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: { message: 'Sign in to browse courses.' } })

  res.setHeader('Cache-Control', 'private, max-age=300')
  return res.status(200).json({ courses: COURSES.map(toCatalog) })
}
