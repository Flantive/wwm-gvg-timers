import { useEffect, useRef, useState } from 'react'
import chickenGif from '../assets/chicken.gif'
import jungleIcon from '../assets/jungle.png'
import { speakWithPreferredVoice } from '../services/tts'

const jungleTimerName = 'Jungle Respawn'
const jungleBreakpoints = [1800, 1500, 1200, 900, 600, 300, 0]
const maxCustomAnnouncementTime = 35 * 60 + 60

function JungleTimer({ gvgScope, ttsSettings, oneRow }) {
  const totalRemaining = Number(gvgScope?.timeRemaining)
  const hasScopeTime = Number.isFinite(totalRemaining)
  const [localRemaining, setLocalRemaining] = useState(0)
  const prevCountdownRef = useRef(null)
  const prevRemainingRef = useRef(null)
  const announcedCustomRef = useRef(new Set())
  const startedAtRef = useRef('')

  const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60)
    const sec = seconds % 60
    return `${min}:${sec < 10 ? '0' : ''}${sec}`
  }

  const getJungleCountdown = (timeRemaining) => {
    const safeRemaining = Math.max(0, Math.floor(timeRemaining))

    if (safeRemaining > jungleBreakpoints[0]) {
      return Math.min(300, safeRemaining - jungleBreakpoints[0])
    }

    for (let i = 0; i < jungleBreakpoints.length - 1; i += 1) {
      const upper = jungleBreakpoints[i]
      const lower = jungleBreakpoints[i + 1]

      if (safeRemaining <= upper && safeRemaining >= lower) {
        return safeRemaining - lower
      }
    }

    return 0
  }

  const getCurrentWindowStart = (timeRemaining) => {
    const safeRemaining = Math.max(0, Math.floor(timeRemaining))

    if (safeRemaining > jungleBreakpoints[0]) {
      return jungleBreakpoints[0]
    }

    for (let i = 0; i < jungleBreakpoints.length - 1; i += 1) {
      const upper = jungleBreakpoints[i]
      const lower = jungleBreakpoints[i + 1]

      if (safeRemaining <= upper && safeRemaining >= lower) {
        return upper
      }
    }

    return 0
  }

  useEffect(() => {
    if (!hasScopeTime) {
      setLocalRemaining(0)
      return
    }

    setLocalRemaining(Math.max(0, Math.floor(totalRemaining)))
  }, [hasScopeTime, totalRemaining])

  useEffect(() => {
    if (!hasScopeTime || localRemaining <= 0) {
      return undefined
    }

    const id = setInterval(() => {
      setLocalRemaining((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(id)
  }, [hasScopeTime, localRemaining])

  const countdown = getJungleCountdown(localRemaining)
  const currentWindowStart = getCurrentWindowStart(localRemaining)
  const isPreThirtyWindow = localRemaining > 1800
  const isBossChokingWindow =
    !isPreThirtyWindow && (currentWindowStart === 1800 || currentWindowStart === 1200)
  const timerLabel = isPreThirtyWindow ? 'Game Start' : isBossChokingWindow ? 'Boss Respawn' : jungleTimerName
  const isDanger = countdown <= 30
  const isBlueWarning = countdown <= 60 && countdown > 30
  const timerColorClass =
    countdown > 60 ? 'text-white' : countdown > 30 ? 'text-sky-400' : 'text-red-400'
  const borderColorClass = isDanger ? 'border-red-400' : isBlueWarning ? 'border-sky-400' : 'border-white/10'
  const labelColorClass = isBossChokingWindow && isDanger ? 'text-red-400' : 'text-white'
  const backgroundClass = isDanger ? 'bg-red-950' : isBlueWarning ? 'bg-zinc-900' : 'bg-white/5'
  const minuteCallout = isPreThirtyWindow
    ? 'Game starting in 1 minute'
    : isBossChokingWindow
      ? 'Boss in 40 seconds'
      : 'Jungle in 40 seconds'
  const thirtySecondCallout = isPreThirtyWindow
    ? 'Game starting in 30 seconds'
    : isBossChokingWindow
    ? 'Boss in 20 seconds'
      : 'Jungle in 20 seconds'
  const gameStartAnnouncementsEnabled = ttsSettings?.gameStart !== false
  const jungleTimerAnnouncementsEnabled = ttsSettings?.jungleTimers !== false
  const customAnnouncements = Array.isArray(ttsSettings?.customAnnouncements)
    ? ttsSettings.customAnnouncements
    : []
  useEffect(() => {
    const startedAt = typeof gvgScope?.startedAt === 'string' ? gvgScope.startedAt : ''
    if (startedAtRef.current !== startedAt) {
      startedAtRef.current = startedAt
      prevCountdownRef.current = null
      prevRemainingRef.current = null
      announcedCustomRef.current = new Set()
    }
  }, [gvgScope?.startedAt])

  useEffect(() => {
    const previous = prevCountdownRef.current
    const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

    if (!Number.isFinite(previous) || !canSpeak) {
      prevCountdownRef.current = countdown
      return
    }

    const firstThreshold = isPreThirtyWindow ? 60 : 40
    const secondThreshold = isPreThirtyWindow ? 30 : 20
    const crossedMinute = previous > firstThreshold && countdown <= firstThreshold
    const crossedThirty = previous > secondThreshold && countdown <= secondThreshold

    const builtInAnnouncementEnabled = isPreThirtyWindow
      ? gameStartAnnouncementsEnabled
      : jungleTimerAnnouncementsEnabled

    if (crossedMinute && builtInAnnouncementEnabled) {
      speakWithPreferredVoice(minuteCallout)
    }

    if (crossedThirty && builtInAnnouncementEnabled) {
      speakWithPreferredVoice(thirtySecondCallout)
    }

    prevCountdownRef.current = countdown
  }, [
    countdown,
    gameStartAnnouncementsEnabled,
    isPreThirtyWindow,
    jungleTimerAnnouncementsEnabled,
    minuteCallout,
    thirtySecondCallout,
  ])

  useEffect(() => {
    const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window
    const previousRemaining = prevRemainingRef.current

    if (!Number.isFinite(previousRemaining) || !canSpeak) {
      prevRemainingRef.current = localRemaining
      return
    }

    for (const announcement of customAnnouncements) {
      if (!announcement || announcement.enabled === false) {
        continue
      }

      const text = String(announcement.text ?? '').trim()
      if (!text) {
        continue
      }

      const id = typeof announcement.id === 'string' && announcement.id
      if (!id) {
        continue
      }

      const minutes = Number(announcement.minutes)
      const seconds = Number(announcement.seconds)
      const safeMinutes = Number.isFinite(minutes) ? Math.max(0, Math.min(35, Math.floor(minutes))) : 0
      const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.min(60, Math.floor(seconds))) : 0
      const targetRemaining = Math.max(
        0,
        Math.min(maxCustomAnnouncementTime, safeMinutes * 60 + safeSeconds)
      )

      if (announcedCustomRef.current.has(id)) {
        continue
      }

      if (previousRemaining > targetRemaining && localRemaining <= targetRemaining) {
        speakWithPreferredVoice(text)
        announcedCustomRef.current.add(id)
      }
    }

    prevRemainingRef.current = localRemaining
  }, [customAnnouncements, localRemaining])

  if (oneRow) {
    return (
      <div
        className={`${backgroundClass} rounded-lg px-1.5 py-1 border flex items-center gap-1 ${borderColorClass}`}
        style={{ WebkitAppRegion: 'no-drag' }}
        title={timerLabel}
      >
        <img src={jungleIcon} alt="" className="w-5 h-5 shrink-0 object-contain" />
        <span className={`min-w-[42px] text-right font-mono text-base font-bold tabular-nums ${timerColorClass}`}>
          {formatTime(countdown)}
        </span>
      </div>
    )
  }

  return (
    <div
      className={`${backgroundClass} rounded-xl px-3 py-2 border flex items-center gap-2 ${borderColorClass}`}
      style={{ WebkitAppRegion: 'no-drag' }}
    >
      <span className={`flex-1 text-sm font-medium truncate flex items-center gap-2 ${labelColorClass}`}>
        {timerLabel}
        {isBossChokingWindow && countdown < 60 ? (
          <img src={chickenGif} alt="Chicken Choking" className="w-8 h-8 shrink-0 rounded-sm object-cover" />
        ) : null}
      </span>
      <span className={`w-[88px] text-right font-mono text-2xl font-bold tabular-nums ${timerColorClass}`}>
        {formatTime(countdown)}
      </span>
    </div>
  )
}

export default JungleTimer
