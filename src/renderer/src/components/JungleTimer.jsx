import { useEffect, useRef, useState } from 'react'
import chickenGif from '../assets/chicken.gif'
import { speakWithPreferredVoice } from '../services/tts'

const jungleTimerName = 'Jungle Respawn'
const jungleBreakpoints = [1800, 1500, 1200, 900, 600, 300, 0]

function JungleTimer({ gvgScope }) {
  const totalRemaining = Number(gvgScope?.timeRemaining)
  const hasScopeTime = Number.isFinite(totalRemaining)
  const [localRemaining, setLocalRemaining] = useState(0)
  const prevCountdownRef = useRef(null)

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
      ? 'Boss in 1 minute'
      : 'Jungle in 1 minute'
  const thirtySecondCallout = isPreThirtyWindow
    ? 'Game starting in 30 seconds'
    : isBossChokingWindow
      ? 'Boss in 30 seconds'
      : 'Jungle in 30 seconds'

  useEffect(() => {
    const previous = prevCountdownRef.current
    const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

    if (!Number.isFinite(previous) || !canSpeak) {
      prevCountdownRef.current = countdown
      return
    }

    const crossedMinute = previous > 60 && countdown <= 60
    const crossedThirty = previous > 30 && countdown <= 30

    if (crossedMinute) {
      speakWithPreferredVoice(minuteCallout)
    }

    if (crossedThirty) {
      speakWithPreferredVoice(thirtySecondCallout)
    }

    prevCountdownRef.current = countdown
  }, [countdown, minuteCallout, thirtySecondCallout])

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
