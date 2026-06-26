import { useEffect, useState } from 'react'
import { resetCommanderBuff } from '../services/serverApi'

function CommanderBuffTimer({
  gvgScope,
  serverUrl,
  postHeaders,
  buffField,
  label,
  compactLabel,
  compact,
  oneRow,
  iconSrc,
  canReset,
  onResetSuccess,
}) {
  const statusValue = Number(gvgScope?.commanderCooldowns?.[buffField])
  const hasValue = Number.isFinite(statusValue)
  const uptimeValue = Number(gvgScope?.commanderCooldownConfig?.[buffField]?.uptime)
  const cooldownValue = Number(gvgScope?.commanderCooldownConfig?.[buffField]?.cooldown)
  const hasConfig = Number.isFinite(uptimeValue) && Number.isFinite(cooldownValue)
  const [remaining, setRemaining] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60)
    const sec = seconds % 60
    return `${min}:${sec < 10 ? '0' : ''}${sec}`
  }

  useEffect(() => {
    if (!hasValue) {
      setRemaining(0)
      return
    }

    setRemaining(Math.max(0, Math.floor(statusValue)))
  }, [hasValue, statusValue])

  useEffect(() => {
    if (!hasValue || remaining <= 0) {
      return undefined
    }

    const id = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(id)
  }, [hasValue, remaining])

  const isReady = remaining <= 0
  const activeThreshold = hasConfig ? cooldownValue - uptimeValue : Number.POSITIVE_INFINITY
  const isBuffActive = hasConfig && remaining > activeThreshold
  const backgroundClass = isBuffActive ? 'bg-emerald-900' : 'bg-white/5'
  const borderColorClass = isBuffActive ? 'border-emerald-400/70' : 'border-white/10'
  const labelColorClass = isBuffActive ? 'text-emerald-300' : 'text-white'
  const timerColorClass = isBuffActive || isReady ? 'text-emerald-400' : 'text-white'

  const onReset = async () => {
    try {
      setIsSubmitting(true)
      setError('')
      await resetCommanderBuff(serverUrl, buffField, postHeaders?.() ?? {})
      onResetSuccess?.()
    } catch {
      setError(`Failed to reset ${label}.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (oneRow) {
    const content = (
      <>
        {iconSrc ? <img src={iconSrc} alt="" className="w-5 h-5 shrink-0 object-contain" /> : null}
        <span className={`min-w-[28px] text-right font-mono text-base font-bold tabular-nums ${timerColorClass}`}>
          {isReady ? 'RDY' : remaining}
        </span>
      </>
    )

    const className = `${backgroundClass} rounded-lg px-1.5 py-1 border flex items-center gap-1 ${borderColorClass}`

    return (
      <>
        {isReady && canReset ? (
          <button
            onClick={onReset}
            disabled={isSubmitting}
            className={`${className} hover:bg-white/10 transition-colors disabled:opacity-50`}
            style={{ WebkitAppRegion: 'no-drag' }}
            aria-label={`Reset ${label}`}
            title={`${label}: reset and start`}
          >
            {content}
          </button>
        ) : (
          <div
            className={className}
            style={{ WebkitAppRegion: 'no-drag' }}
            title={label}
          >
            {content}
          </div>
        )}
        {error ? <div className="px-1 text-[11px] text-red-300">{error}</div> : null}
      </>
    )
  }

  return (
    <>
      {compact ? (
        <div
          className={`${backgroundClass} rounded-xl px-2.5 py-2 border space-y-1 ${borderColorClass}`}
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          <div className={`text-[11px] font-semibold truncate ${labelColorClass}`}>
            {compactLabel || label}
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className={`text-base font-mono font-bold tabular-nums ${timerColorClass}`}>
              {isReady ? 'RDY' : formatTime(remaining)}
            </span>
            {isReady && canReset ? (
              <button
                onClick={onReset}
                disabled={isSubmitting}
                className="w-6 h-6 shrink-0 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-md transition-colors disabled:opacity-50"
                aria-label={`Reset ${label}`}
                title="Reset and start"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-3.5 h-3.5 text-white/80"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 12a9 9 0 1 0 3-6.7" />
                  <path d="M3 3v4h4" />
                </svg>
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div
          className={`${backgroundClass} rounded-xl px-3 py-2 border flex items-center gap-2 ${borderColorClass}`}
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          <span className={`flex-1 text-sm font-medium truncate ${labelColorClass}`}>{label}</span>
          {isReady && canReset ? (
            <button
              onClick={onReset}
              disabled={isSubmitting}
              className="w-8 h-8 shrink-0 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
              aria-label={`Reset ${label}`}
              title="Reset and start"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4 text-white/80"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <path d="M3 3v4h4" />
              </svg>
            </button>
          ) : null}
          <span className={`w-[88px] text-right font-mono text-2xl font-bold tabular-nums ${timerColorClass}`}>
            {isReady ? 'RDY' : formatTime(remaining)}
          </span>
        </div>
      )}
      {error ? <div className="px-1 text-[11px] text-red-300">{error}</div> : null}
    </>
  )
}

export default CommanderBuffTimer
