import { useState, useCallback, useRef, useEffect } from 'react'
import { chatCompletion } from '../services/chatService.js'
import { addHistory, fetchHistory } from '../services/historyService.js'
import { PROMPTS, MODE_INTROS, pickRandom } from '../utils/prompts.js'
import { timeContextLine } from '../utils/timeOfDay.js'
import { supabase } from '../lib/supabase.js'
import { getActiveChildId } from '../utils/storage.js'

const MAX_HISTORY = 16

export function useChat(settings) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('chat')
  const messagesRef = useRef([])
  const modeRef = useRef('chat')
  const sessionRef = useRef({ ts: Date.now() })
  // A ref rather than state: ChildPage reads this synchronously right after
  // awaiting sendMessage, and the object returned by this hook is a fresh
  // literal every render, so a state value read through a stale closure
  // could lag behind the setState made inside sendMessage's own catch block.
  const limitReachedRef = useRef(false)

  const memoryRef = useRef('')

  useEffect(() => {
    const childName = settings?.childName || 'there'

    fetchHistory(5).then(entries => {
      if (!entries?.length) return
      const lines = entries
        .map(e => `- "${(e.user_text || '').slice(0, 100)}" (${e.mode} mode)`)
        .join('\n')
      memoryRef.current = `\n\nRECENT MEMORIES — things ${childName} said in past chats:\n${lines}\nIf these come up naturally in conversation, reference them warmly to make ${childName} feel remembered.`
    }).catch(() => {})

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const childId = getActiveChildId()
      let query = supabase
        .from('lesson_completions')
        .select('course_id, lesson_id')
        .eq('user_id', user.id)
      query = childId ? query.or(`child_id.eq.${childId},child_id.is.null`) : query
      query
        .order('completed_at', { ascending: false })
        .limit(5)
        .then(({ data }) => {
          if (!data?.length) return
          const names = data.map(r => `${r.lesson_id} (${r.course_id})`).join(', ')
          memoryRef.current +=
            `\n\nLESSONS ${childName} HAS COMPLETED: ${names}. Celebrate their learning if the topic comes up!`
        })
    }).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const buildSystemPrompt = useCallback((currentMode) => {
    const childName  = settings?.childName  || 'there'
    const buddyName  = settings?.buddyName  || 'Buddy'
    const childAge   = settings?.childAge   || 7
    const base = currentMode === 'sing'
      ? PROMPTS.sing(childName, buddyName, childAge)
      : PROMPTS.chat(childName, buddyName, childAge)
    return base + timeContextLine() + memoryRef.current
  }, [settings])

  const switchMode = useCallback((newMode) => {
    setMode(newMode)
    modeRef.current = newMode
    const newMsgs = []
    setMessages(newMsgs)
    messagesRef.current = newMsgs
    setError(null)
    sessionRef.current = { ts: Date.now() }

    const childName = settings?.childName || 'there'
    const buddyName = settings?.buddyName  || 'Buddy'
    const variants = MODE_INTROS[newMode] || MODE_INTROS.chat
    return pickRandom(variants)(childName, buddyName)
  }, [settings?.childName, settings?.buddyName])

  const sendMessage = useCallback(async (userText, currentMode) => {
    setError(null)
    limitReachedRef.current = false
    const currentM = currentMode || modeRef.current
    const userMsg = { role: 'user', content: userText }

    const updatedMsgs = [...messagesRef.current, userMsg]
    messagesRef.current = updatedMsgs
    setMessages(updatedMsgs)
    setLoading(true)

    try {
      const system = { role: 'system', content: buildSystemPrompt(currentM) }
      const recent = updatedMsgs.slice(-MAX_HISTORY)
      const contextMsgs = [system, ...recent]

      const reply = await chatCompletion(contextMsgs, { mode: currentM })

      const assistantMsg = { role: 'assistant', content: reply }
      const finalMsgs = [...messagesRef.current, assistantMsg]
      messagesRef.current = finalMsgs
      setMessages(finalMsgs)

      addHistory({
        ts: Date.now(),
        mode: currentM,
        userText,
        buddyText: reply,
      })

      return reply
    } catch (err) {
      let friendly
      if (err.message === 'NO_API_KEY') {
        friendly = "Oops! I need a magic key to talk. Ask a grown-up to add it in the settings!"
      } else if (err.message === 'RATE_LIMIT') {
        friendly = "Whoa, I need a little rest! Try again in a minute, okay?"
      } else if (err.message === 'FREE_LIMIT_REACHED' || err.message === 'PRO_REQUIRED') {
        limitReachedRef.current = true
        friendly = "Let's take a little break from chatting for today!"
      } else {
        friendly = "Hmm, something went a little funny! Can you try again?"
      }
      setError(friendly)
      return friendly
    } finally {
      setLoading(false)
    }
  }, [buildSystemPrompt])

  const clearChat = useCallback(() => {
    setMessages([])
    messagesRef.current = []
    setError(null)
    sessionRef.current = { ts: Date.now() }
  }, [])

  return { messages, loading, error, mode, switchMode, sendMessage, clearChat, limitReachedRef }
}
