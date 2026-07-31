import { getUser, isEntitled } from './_auth.js'
import { COURSES } from './_courseData.js'

// Full lesson content — steps and the printable worksheet. This is the paid
// product, so entitlement is checked here rather than in the UI, which used to
// ship every lesson to every visitor in the client bundle.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: { message: 'Sign in to open a lesson.' } })

  if (!(await isEntitled(user.id))) {
    return res.status(403).json({ error: { message: 'This lesson is part of Buddy Pro.', code: 'PRO_REQUIRED' } })
  }

  const { course: courseId, lesson: lessonId } = req.query
  const course = COURSES.find((c) => c.id === courseId)
  const lesson = course?.lessons.find((l) => l.id === lessonId)
  if (!lesson) return res.status(404).json({ error: { message: 'Lesson not found.' } })

  res.setHeader('Cache-Control', 'private, max-age=300')
  return res.status(200).json({
    lesson,
    course: { id: course.id, title: course.title, emoji: course.emoji },
  })
}
