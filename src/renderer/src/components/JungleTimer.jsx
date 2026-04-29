import { useEffect, useState } from 'react'
import chickenGif from '../assets/chicken.gif'

const jungleTimerName = 'Jungle Respawn'
const jungleBreakpoints = [1800, 1500, 1200, 900, 600, 300, 0]

function JungleTimer({ gvgScope }) {
  const totalRemaining = Number(gvgScope?.timeRemaining)
  const hasScopeTime = Number.isFinite(totalRemaining)
  const [localRemaining, setLocalRemaining] = useState(0)

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
  const isBossChokingWindow = currentWindowStart === 1800 || currentWindowStart === 1200
  const timerLabel = isBossChokingWindow ? 'Chicken Choking' : jungleTimerName
  const isDanger = countdown <= 30
  const timerColorClass =
    countdown > 60 ? 'text-white' : countdown > 30 ? 'text-sky-400' : 'text-red-400'
  const borderColorClass = isDanger ? 'border-red-400' : 'border-white/10'
  const labelColorClass = isBossChokingWindow && isDanger ? 'text-red-400' : 'text-white'

  return (
    <div
      className={`bg-white/5 rounded-xl px-3 py-2 border flex items-center gap-2 ${borderColorClass}`}
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
