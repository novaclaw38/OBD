import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import PrintSheet from '../components/PrintSheet.jsx'
import { getSettings, saveSettings, migratePinIfNeeded, hashPin, getActiveChildId } from '../utils/storage.js'
import { testConnection } from '../services/chatService.js'
import { fetchHistory, deleteHistory } from '../services/historyService.js'
import { sendVoiceMessage, fetchMessages, fetchMessageById, markPlayed } from '../services/messageService.js'
import { sendStoryRequest, fetchSentStoryRequests } from '../services/storyRequestService.js'
import { supabase } from '../lib/supabase.js'
import { useSpeech } from '../hooks/useSpeech.js'
import { useProgress, masteryTier } from '../hooks/useProgress.js'
import { useSubscription } from '../hooks/useSubscription.jsx'
import { VOICE_OPTIONS, DEFAULT_VOICE, isValidVoiceKey } from '../utils/voiceOptions.js'
import { COURSES } from '../utils/courses.js'
import { SUBJECTS } from '../utils/subjects.js'
import { updateChild } from '../services/childrenService.js'
import ChildrenManager from '../components/ChildrenManager.jsx'
import styles from './ParentPage.module.css'
import {
  IconArrowLeft, IconCheck, IconX, IconMic, IconSpeaker, IconPlay, IconPause,
  IconCamera, IconPhoto, IconPrinter, IconBook, IconPalette, IconLock,
} from '../components/icons.jsx'
import UpgradePrompt from '../components/UpgradePrompt.jsx'
import AvatarPicker from '../components/AvatarPicker.jsx'
import BuddyAvatar from '../components/BuddyAvatar.jsx'

// Which settings keys mirror a field on the cloud `children` row — kept in
// sync so the Parent dashboard's child switcher shows current info.
const CHILD_ROW_FIELD = {
  childName: 'name', buddyName: 'buddyName', avatarType: 'avatarType', avatarColor: 'avatarColor',
}

// Grouped so the tab bar reads as clusters of related settings rather than
// eight flat, same-weight buttons in a row.
const TAB_GROUPS = [
  { label: 'Child',    tabs: ['Children', 'Settings'] },
  { label: 'Learning', tabs: ['Learning'] },
  { label: 'Connect',  tabs: ['Messages', 'Camera', 'History', 'Print'] },
  { label: 'Billing',  tabs: ['Subscription', 'Account'] },
]

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

export default function ParentPage({ session }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [tab, setTab] = useState('Settings')
  const [settings, setSettings] = useState(() => getSettings())
  const speech = useSpeech(settings)
  const { isPro, tier, daysLeft } = useSubscription()
  // Which feature triggered the upgrade prompt, so its copy can be
  // contextual (see UpgradePrompt's TRIGGERS map) instead of one generic
  // pitch reused everywhere. null = closed.
  const [upgradeTrigger, setUpgradeTrigger] = useState(null)

  // ChildPage redirects here with this when a child hits the free daily
  // chat limit and a grown-up enters the PIN to unlock more.
  useEffect(() => {
    if (location.state?.openUpgrade) setUpgradeTrigger(location.state.openUpgrade)
  }, [location.state])
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [previewStatus, setPreviewStatus] = useState('idle') // idle | speaking
  const [pinInput, setPinInput] = useState('')
  const [testStatus, setTestStatus] = useState(null)
  const [testError, setTestError] = useState('')
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [printData, setPrintData] = useState(null)
  const [printType, setPrintType] = useState('story')
  // Games is a static worksheet that never reads printData, so it's always
  // printable; Story/Activity render printData.buddyText and need a selection.
  const canPrintNow = printType === 'games' || !!printData
  const [recStatus, setRecStatus] = useState('idle') // idle | recording | sending | sent | error
  const [sentMessages, setSentMessages] = useState([])
  const [msgsLoading, setMsgsLoading] = useState(false)
  const [storyText, setStoryText] = useState('')
  const [storyStatus, setStoryStatus] = useState('idle') // idle | sending | sent | error
  const [sentStories, setSentStories] = useState([])
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const camVideoRef   = useRef(null)
  const camPcRef      = useRef(null)
  const camChannelRef = useRef(null)
  const [camStatus, setCamStatus] = useState('idle') // idle | requesting | streaming | error
  const [camError,  setCamError]  = useState(null)
  const [subInfo, setSubInfo] = useState(null)
  const [subLoading, setSubLoading] = useState(false)
  const [cancelStatus, setCancelStatus] = useState('idle') // idle | confirming | cancelling | done | error
  const [cancelError, setCancelError] = useState('')
  const [updatePaymentStatus, setUpdatePaymentStatus] = useState('idle') // idle | redirecting | error
  const [updatePaymentError, setUpdatePaymentError] = useState('')
  const [showSaved, setShowSaved] = useState(false)
  const savedFlashRef = useRef(null)
  const [pinStage, setPinStage] = useState('idle') // idle | confirm
  const [pinPending, setPinPending] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinSaved, setPinSaved] = useState(false)
  const [camConfirming, setCamConfirming] = useState(false)
  const [playingMsgId, setPlayingMsgId] = useState(null)
  const playAudioRef = useRef(null)
  const { completions, records } = useProgress()

  // One-time migration of any pre-existing plaintext parentPin to a hash.
  useEffect(() => {
    migratePinIfNeeded(getSettings()).then(setSettings)
  }, [])

  // Load sent messages + story requests when Messages tab opens
  useEffect(() => {
    if (tab !== 'Messages') return
    setMsgsLoading(true)
    fetchMessages().then(setSentMessages).catch(console.error).finally(() => setMsgsLoading(false))
    fetchSentStoryRequests().then(setSentStories).catch(console.error)
    return () => { playAudioRef.current?.pause(); setPlayingMsgId(null) }
  }, [tab])

  const handleSendStory = async () => {
    const text = storyText.trim()
    if (!text) return
    setStoryStatus('sending')
    try {
      await sendStoryRequest(text)
      setStoryText('')
      setStoryStatus('sent')
      fetchSentStoryRequests().then(setSentStories).catch(console.error)
      setTimeout(() => setStoryStatus('idle'), 2000)
    } catch (err) {
      console.error('Failed to send story request:', err)
      setStoryStatus('error')
    }
  }

  // Don't leave a stale "start camera?" confirmation showing if the parent
  // navigates away from the Camera tab and back.
  useEffect(() => {
    if (tab !== 'Camera') setCamConfirming(false)
  }, [tab])

  // Load history from Supabase when History tab opens
  useEffect(() => {
    if (tab !== 'History') return
    setHistoryLoading(true)
    fetchHistory().then((rows) => {
      setHistory(rows.map((r) => ({
        ts: r.ts,
        mode: r.mode,
        userText: r.user_text,
        buddyText: r.buddy_text,
      })))
    }).catch(console.error).finally(() => setHistoryLoading(false))
  }, [tab])

  // Load subscription details when Subscription tab opens
  useEffect(() => {
    if (tab !== 'Subscription') return
    setSubLoading(true)
    setCancelStatus('idle')
    setCancelError('')
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return null
      return supabase
        .from('subscriptions')
        .select('status, trial_end, subscription_end')
        .eq('user_id', user.id)
        .maybeSingle()
    }).then((result) => {
      setSubInfo(result?.data || null)
    }).catch(console.error).finally(() => setSubLoading(false))
  }, [tab])

  const handleUpdatePayment = async () => {
    setUpdatePaymentStatus('redirecting')
    setUpdatePaymentError('')
    try {
      const { data: { session: freshSession } } = await supabase.auth.getSession()
      const res = await fetch('/api/payfast-update-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${freshSession?.access_token}`,
        },
        body: JSON.stringify({
          firstName: freshSession?.user?.user_metadata?.full_name?.split(' ')[0] || 'Parent',
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Could not start payment update')
      window.location.href = body.paymentUrl
    } catch (err) {
      setUpdatePaymentStatus('error')
      setUpdatePaymentError(err.message || 'Something went wrong')
    }
  }

  const handleCancelSubscription = async () => {
    setCancelStatus('cancelling')
    setCancelError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/payfast-cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Cancellation failed')
      setCancelStatus('done')
      setSubInfo((prev) => (prev ? { ...prev, status: 'cancelled' } : prev))
    } catch (err) {
      setCancelStatus('error')
      setCancelError(err.message || 'Something went wrong')
    }
  }

  const updateSetting = (key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value }
      saveSettings(next)
      return next
    })
    setShowSaved(true)
    clearTimeout(savedFlashRef.current)
    savedFlashRef.current = setTimeout(() => setShowSaved(false), 1500)

    const rowField = CHILD_ROW_FIELD[key]
    const childId = getActiveChildId()
    if (rowField && childId) {
      updateChild(childId, { [rowField]: value }).catch(() => {})
    }
  }

  // Lets a parent hear the currently-selected voice right here, instead of
  // switching to the child page just to test it.
  const handlePreviewVoice = () => {
    setPreviewStatus('speaking')
    speech.speak("Hi! I'm Buddy, your child's AI friend!", () => setPreviewStatus('idle'))
  }

  const handleAvatarSave = ({ type, name, color, costume }) => {
    updateSetting('avatarType', type)
    updateSetting('buddyName', name)
    updateSetting('avatarColor', color)
    updateSetting('costume', costume)
    setShowAvatarPicker(false)
  }

  // The PIN is never stored or displayed in plaintext. A typo here would
  // otherwise silently lock a parent out, so the new PIN must be entered
  // twice — the hash is only written once both entries match.
  const handlePinInput = async (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4)
    setPinInput(digits)
    setPinError('')
    if (digits.length !== 4) return

    if (pinStage === 'idle') {
      setPinPending(digits)
      setPinInput('')
      setPinStage('confirm')
      return
    }

    // pinStage === 'confirm'
    if (digits === pinPending) {
      updateSetting('parentPinHash', await hashPin(digits))
      setPinSaved(true)
      setTimeout(() => setPinSaved(false), 2000)
    } else {
      setPinError("Those PINs didn't match — try again.")
    }
    setPinInput('')
    setPinPending('')
    setPinStage('idle')
  }

  const handleTestConnection = async () => {
    setTestStatus('testing')
    setTestError('')
    try {
      await testConnection()
      setTestStatus('ok')
      setTimeout(() => setTestStatus(null), 3000)
    } catch (err) {
      setTestError(err.message || 'Unknown error')
      setTestStatus('fail')
      setTimeout(() => setTestStatus(null), 6000)
    }
  }

  const stopCamera = () => {
    camChannelRef.current?.send({ type: 'broadcast', event: 'signal', payload: { type: 'stop' } })
    camPcRef.current?.close()
    camChannelRef.current?.unsubscribe()
    camPcRef.current      = null
    camChannelRef.current = null
    if (camVideoRef.current) camVideoRef.current.srcObject = null
    setCamStatus('idle')
    setCamError(null)
  }

  const startCamera = async () => {
    if (!isPro) { setUpgradeTrigger('camera'); return }
    if (camStatus !== 'idle' && camStatus !== 'error') return
    setCamConfirming(false)
    setCamStatus('requesting')
    setCamError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setCamStatus('idle'); return }

    const pc = new RTCPeerConnection(ICE_SERVERS)
    camPcRef.current = pc

    pc.ontrack = (e) => {
      if (camVideoRef.current) {
        camVideoRef.current.srcObject = e.streams[0]
        camVideoRef.current.play().catch(() => {})
      }
      setCamStatus('streaming')
    }

    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState
      if (s === 'failed' || s === 'disconnected' || s === 'closed') {
        setCamStatus('error')
        setCamError('Connection lost. Make sure the app is open on the kids device.')
      }
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        camChannelRef.current?.send({ type: 'broadcast', event: 'signal',
          payload: { type: 'ice-parent', candidate: e.candidate.toJSON() } })
      }
    }

    const channel = supabase.channel('camera-' + user.id, { config: { private: true } })
    camChannelRef.current = channel

    channel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
      if (payload.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        channel.send({ type: 'broadcast', event: 'signal',
          payload: { type: 'answer', sdp: { type: answer.type, sdp: answer.sdp } } })
      }
      if (payload.type === 'ice-child') {
        try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)) }
        catch (_) {}
      }
    }).subscribe(() => {
      // Small delay to let child's subscription settle, then request stream
      setTimeout(() => {
        channel.send({ type: 'broadcast', event: 'signal', payload: { type: 'request' } })
      }, 600)
    })
  }

  const startRecording = async () => {
    if (!isPro) { setUpgradeTrigger('messages'); return }
    if (recStatus === 'recording' || recStatus === 'sending') return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const mr = new MediaRecorder(stream)
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
        if (blob.size < 500) { setRecStatus('idle'); return }
        setRecStatus('sending')
        try {
          await sendVoiceMessage(blob)
          setRecStatus('sent')
          fetchMessages().then(setSentMessages).catch(console.error)
          setTimeout(() => setRecStatus('idle'), 2000)
        } catch {
          setRecStatus('error')
          setTimeout(() => setRecStatus('idle'), 2000)
        }
      }
      mediaRecorderRef.current = mr
      mr.start()
      setRecStatus('recording')
    } catch {
      setRecStatus('error')
      setTimeout(() => setRecStatus('idle'), 2000)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }
  }

  // Sent Messages only showed a played/unplayed badge with no way to hear
  // what was actually sent — these are voice recordings (no transcript
  // exists), so playback is the only way to review one.
  const handlePlayMessage = async (msg) => {
    if (playingMsgId === msg.id) {
      playAudioRef.current?.pause()
      setPlayingMsgId(null)
      return
    }
    playAudioRef.current?.pause()
    try {
      const { audioUrl } = await fetchMessageById(msg.id)
      const audio = new Audio(audioUrl)
      playAudioRef.current = audio
      setPlayingMsgId(msg.id)
      audio.addEventListener('ended', () => setPlayingMsgId(null))
      await audio.play()
      if (!msg.played) {
        markPlayed(msg.id)
        setSentMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, played: true } : m)))
      }
    } catch {
      setPlayingMsgId(null)
    }
  }

  const handleClearHistory = async () => {
    if (window.confirm('Clear all chat history? This cannot be undone.')) {
      await deleteHistory()
      setHistory([])
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const handlePrint = () => {
    if (!canPrintNow) return
    window.print()
  }

  const handleSelectPrint = (entry) => {
    setPrintData(entry)
    // A stale "Games" selection from an earlier visit would otherwise
    // silently ignore this entry — Games is a generic worksheet that
    // never reads printData, so force the type back to one that does.
    setPrintType('story')
    setTab('Print')
  }

  return (
    <main className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>
          <IconArrowLeft size={16} /> Back to Buddy
        </button>
        <h1 className={styles.title}>Parent Dashboard</h1>
        <button className={styles.btnDanger} style={{ flexShrink: 0 }} onClick={handleLogout}>
          Log out
        </button>
      </div>

      {/* Trial status banner */}
      {tier === 'trial' && daysLeft !== null && daysLeft <= 3 && (
        <div className={styles.trialBanner}>
          <span>Your free trial ends in {daysLeft} day{daysLeft === 1 ? '' : 's'}.</span>
          <button className={styles.trialBannerBtn} onClick={() => setUpgradeTrigger('trialEnding')}>Add payment method</button>
        </div>
      )}
      {tier === 'free' && daysLeft === 0 && (
        <div className={`${styles.trialBanner} ${styles.trialBannerEnded}`}>
          <span>Your free trial has ended.</span>
          <button className={styles.trialBannerBtn} onClick={() => setUpgradeTrigger('trialEnded')}>Subscribe to Buddy Pro</button>
        </div>
      )}

      {/* Tabs */}
      <div className={styles.tabs}>
        {TAB_GROUPS.map((group, gi) => (
          <div className={styles.tabGroup} key={group.label}>
            {group.tabs.map((t) => (
              <button
                key={t}
                className={`${styles.tab} ${tab === t ? styles.activeTab : ''}`}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
            {gi < TAB_GROUPS.length - 1 && <span className={styles.tabDivider} aria-hidden="true" />}
          </div>
        ))}
      </div>

      {/* Tab content */}
      <div className={styles.content}>

        {/* ---- SETTINGS ---- */}
        {tab === 'Children' && (
          <ChildrenManager
            session={session}
            onSwitched={() => { setSettings(getSettings()); navigate('/app') }}
          />
        )}

        {tab === 'Settings' && (
          <div className={styles.section}>
            <div className={styles.sectionHeaderRow}>
              <h2 className={styles.sectionTitle}>Child Settings</h2>
              <span className={`${styles.savedFlash} ${showSaved ? styles.savedFlashVisible : ''}`}><IconCheck size={13} /> Saved</span>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="childName">Child's Name</label>
              <input
                id="childName"
                className={styles.input}
                value={settings.childName}
                onChange={(e) => updateSetting('childName', e.target.value)}
                placeholder="e.g. Byron"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="childAge">Child's Age</label>
              <select
                id="childAge"
                className={styles.input}
                value={settings.childAge ?? ''}
                onChange={(e) => updateSetting('childAge', Number(e.target.value))}
              >
                <option value="" disabled>Select an age</option>
                {[3, 4, 5, 6, 7, 8, 9, 10].map((age) => (
                  <option key={age} value={age}>{age} years old</option>
                ))}
              </select>
              <p className={styles.hint}>
                Sets which lessons are suggested first and how Buddy talks.
              </p>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Buddy Avatar</label>
              <div className={styles.btnRow} style={{ alignItems: 'center' }}>
                <BuddyAvatar
                  type={settings.avatarType || 'bear'}
                  costume={settings.costume}
                  avatarColor={settings.avatarColor}
                  status="idle"
                  size={56}
                  live={false}
                />
                <button className={styles.btnTest} onClick={() => setShowAvatarPicker(true)}>
                  <IconPalette size={15} /> Customize
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="parentPin">Parent PIN</label>
              <input
                id="parentPin"
                className={styles.input}
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pinInput}
                onChange={(e) => handlePinInput(e.target.value)}
                placeholder={pinStage === 'confirm' ? 'Re-enter the same PIN to confirm' : 'Enter new 4-digit PIN'}
              />
              {pinError ? (
                <p className={styles.testError}>{pinError}</p>
              ) : pinSaved ? (
                <p className={styles.hint}><IconCheck size={13} /> New PIN saved</p>
              ) : (
                <p className={styles.hint}>
                  {pinStage === 'confirm' ? 'Type it once more to confirm' : 'Leave blank to keep your current PIN'}
                </p>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="speechRate">Speech Rate</label>
              <input
                id="speechRate"
                type="range"
                className={styles.slider}
                min="0.6" max="1.2" step="0.05"
                value={settings.speechRate}
                onChange={(e) => updateSetting('speechRate', parseFloat(e.target.value))}
              />
              <p className={styles.hint}>{settings.speechRate.toFixed(2)}× (lower = slower)</p>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Auto-listen after Buddy speaks</label>
              <div className={styles.toggle}>
                <input
                  type="checkbox"
                  id="autoListen"
                  checked={settings.autoListen}
                  onChange={(e) => updateSetting('autoListen', e.target.checked)}
                />
                <label htmlFor="autoListen" className={styles.toggleLabel}>
                  {settings.autoListen ? 'On (hands-free)' : 'Off (tap to talk)'}
                </label>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Screen-time saver (voice only)</label>
              <div className={styles.toggle}>
                <input
                  type="checkbox"
                  id="voiceOnly"
                  checked={settings.voiceOnly || false}
                  onChange={(e) => updateSetting('voiceOnly', e.target.checked)}
                />
                <label htmlFor="voiceOnly" className={styles.toggleLabel}>
                  {settings.voiceOnly ? 'Voice only (screen off)' : 'Full screen (default)'}
                </label>
              </div>
              <p className={styles.hint}>Turn on to hide all visuals — just a glowing orb. Great for bedtime or reducing screen time.</p>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Daily Time Limit {!isPro && <IconLock size={11} />}</label>
              {isPro ? (
                <>
                  <select
                    className={styles.input}
                    value={settings.dailyLimitMinutes || ''}
                    onChange={(e) => updateSetting('dailyLimitMinutes', e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Off</option>
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">60 minutes</option>
                  </select>
                  <p className={styles.hint}>Buddy gives a friendly heads-up 5 minutes before, then pauses with a gentle goodnight screen. Your PIN unlocks more time instantly.</p>
                </>
              ) : (
                <button className={styles.input} style={{ textAlign: 'left', color: 'var(--ink-dim)' }} onClick={() => setUpgradeTrigger('timeLimit')}>
                  Upgrade to Pro to set a daily limit
                </button>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="voiceName">Buddy's Voice</label>
              <div className={styles.btnRow}>
                <select
                  id="voiceName"
                  className={styles.input}
                  style={{ flex: 1 }}
                  value={isValidVoiceKey(settings.voiceName) ? settings.voiceName : DEFAULT_VOICE}
                  onChange={(e) => updateSetting('voiceName', e.target.value)}
                >
                  {VOICE_OPTIONS.map((v) => (
                    <option key={v.key} value={v.key}>{v.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className={styles.btnTest}
                  onClick={handlePreviewVoice}
                  disabled={previewStatus === 'speaking'}
                >
                  {previewStatus === 'speaking' ? <><IconSpeaker size={15} /> Playing…</> : <><IconPlay size={15} /> Preview</>}
                </button>
              </div>
              <p className={styles.hint}>
                This is the actual voice Buddy speaks with.
              </p>
            </div>

            <div className={styles.field}>
              <button className={styles.linkBtn} onClick={handleTestConnection} disabled={testStatus === 'testing'}>
                {testStatus === 'testing' ? 'Testing connection...' : testStatus === 'ok' ? <><IconCheck size={14} /> Connected!</> : testStatus === 'fail' ? <><IconX size={14} /> Connection failed</> : "Buddy not responding? Test connection"}
              </button>
              {testStatus === 'fail' && testError && (
                <p className={styles.testError}>{testError}</p>
              )}
            </div>
          </div>
        )}

        {/* ---- SUBSCRIPTION ---- */}
        {tab === 'Subscription' && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Subscription</h2>

            {subLoading ? (
              <p className={styles.empty}>Loading...</p>
            ) : (
              <>
                <SubscriptionSummary subInfo={subInfo} />

                {subInfo?.status === 'cancelled' && (
                  <p className={styles.hint} style={{ marginTop: 4 }}>
                    Your subscription is cancelled. You won't be charged again.
                  </p>
                )}

                {(subInfo?.status === 'trial' || subInfo?.status === 'active') && (
                  <div className={styles.field} style={{ marginTop: 20 }}>
                    {cancelStatus === 'confirming' ? (
                      <>
                        <p className={styles.hint} style={{ marginBottom: 10 }}>
                          Cancel your subscription? You'll keep access until the current
                          period ends, then Buddy switches to the Free plan.
                        </p>
                        <div className={styles.btnRow}>
                          <button className={styles.btnDanger} onClick={handleCancelSubscription}>
                            Yes, cancel
                          </button>
                          <button className={styles.btnTest} onClick={() => setCancelStatus('idle')}>
                            Keep subscription
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        className={styles.btnDanger}
                        onClick={() => setCancelStatus('confirming')}
                        disabled={cancelStatus === 'cancelling'}
                      >
                        {cancelStatus === 'cancelling' ? 'Cancelling...' : 'Cancel Subscription'}
                      </button>
                    )}
                    {cancelStatus === 'error' && (
                      <p className={styles.testError} style={{ marginTop: 10 }}>{cancelError}</p>
                    )}
                    {cancelStatus === 'done' && (
                      <p className={styles.hint} style={{ marginTop: 10 }}>
                        Cancelled. You'll keep access until the current period ends.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ---- ACCOUNT ---- */}
        {tab === 'Account' && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Account</h2>

            <div className={styles.field}>
              <label className={styles.label}>Email</label>
              <input className={styles.input} value={session?.user?.email || ''} disabled readOnly />
            </div>

            <div className={styles.field} style={{ marginTop: 20 }}>
              <label className={styles.label}>Payment Method</label>
              <p className={styles.hint} style={{ marginBottom: 10 }}>
                Update the card used for your monthly Buddy Pro subscription. You'll be taken to
                PayFast's secure page to enter a new card — nothing changes until you complete it,
                and your next charge still happens on your normal renewal date.
              </p>
              <button
                className={styles.btnTest}
                onClick={handleUpdatePayment}
                disabled={updatePaymentStatus === 'redirecting'}
              >
                {updatePaymentStatus === 'redirecting' ? 'Redirecting to PayFast...' : 'Update Payment Method'}
              </button>
              {updatePaymentStatus === 'error' && (
                <p className={styles.testError} style={{ marginTop: 10 }}>{updatePaymentError}</p>
              )}
            </div>
          </div>
        )}

        {/* ---- LEARNING ---- */}
        {tab === 'Learning' && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Learning Progress</h2>
            <p className={styles.hint} style={{ marginBottom: 20 }}>
              What {settings.childName || 'your child'} has completed in Courses so far.
            </p>
            <div className={styles.courseProgressList}>
              {COURSES.map((course) => {
                const done = course.lessons.filter((l) => completions.has(`${course.id}:${l.id}`)).length
                const total = course.lessons.length
                const pct = total ? Math.round((done / total) * 100) : 0
                return (
                  <div key={course.id} className={styles.courseProgressCard}>
                    <div className={styles.courseProgressHeader}>
                      <span className={styles.courseProgressName}>{course.title}</span>
                      <span className={styles.courseProgressCount}>{done}/{total} lessons</span>
                    </div>
                    <div className={styles.progressBarTrack}>
                      <div className={styles.progressBarFill} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {(() => {
              const learned = [...completions]
                .map((key) => {
                  const [courseId, lessonId] = key.split(':')
                  const course = COURSES.find((c) => c.id === courseId)
                  const lesson = course?.lessons.find((l) => l.id === lessonId)
                  const record = records.get(key)
                  return lesson ? { course, lesson, ...record } : null
                })
                .filter(Boolean)
                .sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0))
                .slice(0, 8)

              if (!learned.length) return null
              const TIER_ICON = { gold: '🥇', silver: '🥈', bronze: '🥉' }
              return (
                <div style={{ marginTop: 28 }}>
                  <h3 className={styles.sectionTitle} style={{ fontSize: 15 }}>Recently Learned</h3>
                  <p className={styles.hint} style={{ marginBottom: 14 }}>
                    What {settings.childName || 'your child'} can actually do now — not just what they clicked through.
                  </p>
                  <ul className={styles.courseProgressList}>
                    {learned.map(({ course, lesson, masteryScore }) => {
                      const tier = masteryTier(masteryScore)
                      const subject = SUBJECTS.find((s) => s.id === course.subject)
                      return (
                        <li key={`${course.id}:${lesson.id}`} className={styles.courseProgressCard}>
                          <div className={styles.courseProgressHeader}>
                            <span className={styles.courseProgressName}>
                              {subject?.emoji} {lesson.objective || lesson.title}
                            </span>
                            {tier && <span>{TIER_ICON[tier]}</span>}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })()}
          </div>
        )}

        {/* ---- MESSAGES ---- */}
        {tab === 'Messages' && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Send Voice Message to Buddy {!isPro && <IconLock size={11} />}
            </h2>
            {isPro ? (
              <>
                <p className={styles.hint} style={{ marginBottom: 20 }}>
                  Hold the button and speak. Release when done — Buddy will hear it right away!
                </p>

                <div className={styles.recordArea}>
                  <button
                    className={`${styles.recordBtn} ${recStatus === 'recording' ? styles.recording : ''}`}
                    onPointerDown={startRecording}
                    onPointerUp={stopRecording}
                    onPointerLeave={stopRecording}
                    disabled={recStatus === 'sending'}
                    aria-label={recStatus === 'recording' ? 'Recording, release to send' : 'Hold to record a voice message'}
                  >
                    {recStatus === 'sent' ? <IconCheck size={22} /> : recStatus === 'error' ? <IconX size={22} /> : <IconMic size={22} />}
                  </button>
                  <p className={styles.recLabel}>
                    {recStatus === 'recording' ? 'Recording... release to send'
                      : recStatus === 'sending' ? 'Sending to Buddy...'
                      : recStatus === 'sent'    ? 'Message sent!'
                      : recStatus === 'error'   ? 'Something went wrong, try again'
                      : 'Hold to record'}
                  </p>
                </div>
              </>
            ) : (
              <button className={styles.input} style={{ textAlign: 'left', color: 'var(--ink-dim)' }} onClick={() => setUpgradeTrigger('messages')}>
                Upgrade to Pro to send Buddy a voice message
              </button>
            )}

            <h2 className={styles.sectionTitle} style={{ marginTop: 24 }}>Sent Messages</h2>
            {msgsLoading ? (
              <p className={styles.empty}>Loading...</p>
            ) : sentMessages.length === 0 ? (
              <p className={styles.empty}>No messages sent yet.</p>
            ) : (
              <div className={styles.historyList}>
                {sentMessages.map((msg) => (
                  <div key={msg.id} className={styles.historyEntry}>
                    <div className={styles.entryMeta}>
                      <span className={`${styles.modeBadge} ${msg.played ? styles.chat : styles.story}`}>
                        {msg.played ? 'played' : 'unplayed'}
                      </span>
                      <span className={styles.entryDate}>
                        {new Date(msg.created_at).toLocaleDateString()}{' '}
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <button className={styles.btnSmall} onClick={() => handlePlayMessage(msg)}>
                      {playingMsgId === msg.id ? <><IconPause size={14} /> Pause</> : <><IconPlay size={14} /> Play what you sent</>}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <h2 className={styles.sectionTitle} style={{ marginTop: 24 }}>
              Bedtime Story Idea {!isPro && <IconLock size={11} />}
            </h2>
            {isPro ? (
              <>
                <p className={styles.hint} style={{ marginBottom: 12 }}>
                  Leave a theme and Buddy will offer to tell it as a story next time — ask-first, just like your voice messages.
                </p>
                <textarea
                  className={styles.input}
                  style={{ minHeight: 72, resize: 'vertical' }}
                  value={storyText}
                  onChange={(e) => setStoryText(e.target.value)}
                  placeholder="e.g. a brave little dragon who's scared of the dark"
                  maxLength={200}
                />
                <button
                  className={styles.btnSave}
                  style={{ marginTop: 10 }}
                  onClick={handleSendStory}
                  disabled={!storyText.trim() || storyStatus === 'sending'}
                >
                  {storyStatus === 'sending' ? 'Sending...' : storyStatus === 'sent' ? <><IconCheck size={14} /> Sent!</> : 'Send story idea'}
                </button>

                {sentStories.length > 0 && (
                  <div className={styles.historyList} style={{ marginTop: 16 }}>
                    {sentStories.map((s) => (
                      <div key={s.id} className={styles.historyEntry}>
                        <div className={styles.entryMeta}>
                          <span className={`${styles.modeBadge} ${s.delivered ? styles.chat : styles.story}`}>
                            {s.delivered ? 'told' : 'waiting'}
                          </span>
                          <span className={styles.entryDate}>{new Date(s.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className={styles.hint}>{s.prompt_text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <button className={styles.input} style={{ textAlign: 'left', color: 'var(--ink-dim)' }} onClick={() => setUpgradeTrigger('story')}>
                Upgrade to Pro to leave Buddy a story idea
              </button>
            )}
          </div>
        )}

        {/* ---- CAMERA ---- */}
        {tab === 'Camera' && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Live Camera {!isPro && <IconLock size={11} />}
            </h2>
            {!isPro ? (
              <button className={styles.input} style={{ textAlign: 'left', color: 'var(--ink-dim)' }} onClick={() => setUpgradeTrigger('camera')}>
                Upgrade to Pro for peace-of-mind camera check-ins
              </button>
            ) : (
              <>
                <p className={styles.hint} style={{ marginBottom: 16 }}>
                  Opens the camera on the kids device so you can check in remotely.
                  The app must be open on their screen.
                </p>

                <div className={styles.cameraBox}>
                  <video
                    ref={camVideoRef}
                    className={styles.cameraVideo}
                    autoPlay
                    playsInline
                    style={{ display: camStatus === 'streaming' ? 'block' : 'none' }}
                  />
                  {camStatus !== 'streaming' && (
                    <div className={styles.cameraPlaceholder}>
                      {camStatus === 'idle'       && <span className={styles.camIdleIcon}><IconPhoto size={34} /></span>}
                      {camStatus === 'requesting' && <p className={styles.camMsg}>Connecting to device...</p>}
                      {camStatus === 'error'      && <p className={styles.camErr}>{camError}</p>}
                    </div>
                  )}
                </div>

                {camConfirming ? (
                  <div className={styles.field} style={{ marginTop: 16 }}>
                    <p className={styles.hint} style={{ marginBottom: 10 }}>
                      This turns on the camera on your child's device right now, without asking
                      them first. Continue?
                    </p>
                    <div className={styles.btnRow}>
                      <button className={styles.btnSave} onClick={startCamera}>Yes, start camera</button>
                      <button className={styles.btnTest} onClick={() => setCamConfirming(false)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.btnRow} style={{ marginTop: 16 }}>
                    {(camStatus === 'idle' || camStatus === 'error') ? (
                      <button className={styles.btnSave} onClick={() => setCamConfirming(true)}>
                        <IconCamera size={16} /> Start Camera
                      </button>
                    ) : (
                      <button className={styles.btnDanger} onClick={stopCamera}>
                        Stop Camera
                      </button>
                    )}
                  </div>
                )}

                <p className={styles.hint} style={{ marginTop: 12 }}>
                  A camera icon will appear on the kids screen while the camera is active.
                </p>
              </>
            )}
          </div>
        )}

        {/* ---- HISTORY ---- */}
        {tab === 'History' && (
          <div className={styles.section}>
            <div className={styles.historyHeader}>
              <h2 className={styles.sectionTitle}>Chat History</h2>
              {history.length > 0 && (
                <button className={styles.btnDanger} onClick={handleClearHistory}>
                  Clear All
                </button>
              )}
            </div>
            {historyLoading ? (
              <p className={styles.empty}>Loading history...</p>
            ) : history.length === 0 ? (
              <p className={styles.empty}>No conversations yet. Go talk to Buddy!</p>
            ) : (
              <div className={styles.historyList}>
                {history.map((entry, i) => (
                  <div key={i} className={styles.historyEntry}>
                    <div className={styles.entryMeta}>
                      <span className={`${styles.modeBadge} ${styles[entry.mode]}`}>
                        {entry.mode}
                      </span>
                      <span className={styles.entryDate}>
                        {new Date(entry.ts).toLocaleDateString()} {new Date(entry.ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
                      </span>
                    </div>
                    <p className={styles.entryUser}><strong>Child:</strong> {entry.userText}</p>
                    <p className={styles.entryBuddy}><strong>Buddy:</strong> {entry.buddyText}</p>
                    <button
                      className={styles.btnSmall}
                      onClick={() => handleSelectPrint(entry)}
                    >
                      Print this
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---- PRINT ---- */}
        {tab === 'Print' && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Print</h2>

            <div className={styles.field}>
              <label className={styles.label}>Print Type</label>
              <div className={styles.printTypes}>
                {['story','activity','games'].map((t) => (
                  <button
                    key={t}
                    className={`${styles.printTypeBtn} ${printType === t ? styles.activePrintType : ''}`}
                    onClick={() => setPrintType(t)}
                  >
                    {t === 'story' ? <><IconBook size={15} /> Story</> : t === 'activity' ? <><IconPalette size={15} /> Activity</> : <>Games</>}
                  </button>
                ))}
              </div>
            </div>

            {printData && (
              <div className={styles.field}>
                <label className={styles.label}>Selected content</label>
                <div className={styles.printPreviewMeta}>
                  <span className={`${styles.modeBadge} ${styles[printData.mode]}`}>{printData.mode}</span>
                  <span>{printData.userText?.slice(0, 60)}...</span>
                </div>
              </div>
            )}

            <div className={styles.btnRow}>
              <button
                className={styles.btnPrint}
                onClick={handlePrint}
                disabled={!canPrintNow}
              >
                <IconPrinter size={16} /> Print Now
              </button>
              {printType !== 'games' && (
                <button
                  className={styles.btnSave}
                  onClick={() => setPrintData({
                    mode: printType,
                    userText: 'Sample content',
                    buddyText: `Here is a fun ${printType} for ${settings.childName}! Enjoy it together.`,
                    ts: Date.now(),
                  })}
                >
                  Use Sample
                </button>
              )}
            </div>

            {!canPrintNow && (
              <p className={styles.hint} style={{ marginTop: 12 }}>
                Select an item from History to print, or tap "Use Sample" to try a blank template.
              </p>
            )}
            {printType === 'games' && (
              <p className={styles.hint} style={{ marginTop: 12 }}>
                Riddles and word games are a generic worksheet — they aren't tied to a specific conversation.
              </p>
            )}

            {/* Hidden print area — shown only during window.print() */}
            {canPrintNow && (
              <div id="print-portal" className={styles.printPortal}>
                <PrintSheet
                  type={printType}
                  data={printData}
                  childName={settings.childName}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {upgradeTrigger && (
        <UpgradePrompt session={session} trigger={upgradeTrigger} onClose={() => setUpgradeTrigger(null)} />
      )}
      {showAvatarPicker && (
        <AvatarPicker
          session={session}
          currentType={settings.avatarType}
          currentName={settings.buddyName}
          currentColor={settings.avatarColor}
          currentCostume={settings.costume}
          onSave={handleAvatarSave}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}
    </main>
  )
}

/* ---- Subscription Summary ---- */
function SubscriptionSummary({ subInfo }) {
  const fmt = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
  const now = Date.now()

  if (!subInfo || (subInfo.status !== 'trial' && subInfo.status !== 'active' && subInfo.status !== 'cancelled')) {
    return (
      <>
        <p className={styles.hint}><strong>Plan:</strong> Free</p>
        <p className={styles.hint}>Upgrade from the app to unlock all activity modes, courses, camera, and voice messages.</p>
      </>
    )
  }

  if (subInfo.status === 'trial') {
    const trialEnd = subInfo.trial_end ? new Date(subInfo.trial_end) : null
    const active = trialEnd && trialEnd.getTime() > now
    const daysLeft = active ? Math.max(0, Math.ceil((trialEnd - now) / 86400000)) : 0
    return (
      <p className={styles.hint}>
        <strong>Plan:</strong> Free trial{active ? ` — ${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : ' — ended'}
        {trialEnd && <> (ends {fmt(subInfo.trial_end)})</>}. Then R149/month unless cancelled.
      </p>
    )
  }

  if (subInfo.status === 'active') {
    return (
      <p className={styles.hint}>
        <strong>Plan:</strong> Buddy Pro — R149/month
        {subInfo.subscription_end && <>, renews {fmt(subInfo.subscription_end)}</>}.
      </p>
    )
  }

  // cancelled
  const accessUntil = subInfo.subscription_end || subInfo.trial_end
  return (
    <p className={styles.hint}>
      <strong>Plan:</strong> Cancelled
      {accessUntil && <> — access until {fmt(accessUntil)}</>}.
    </p>
  )
}
