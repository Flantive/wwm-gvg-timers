import { useEffect, useMemo, useState } from 'react'
import { resetGvg } from '../services/serverApi'

function TimersScreen({
  gvgScope,
  serverUrl,
  postHeaders,
  isCommander,
  onOpenSettings,
  children,
}) {
  const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60)
    const sec = seconds % 60
    return `${min}:${sec < 10 ? '0' : ''}${sec}`
  }

  const [gvgRemaining, setGvgRemaining] = useState(0)
  const [syncError, setSyncError] = useState('')
  const [resetPhase, setResetPhase] = useState('idle')
  const [countdownValue, setCountdownValue] = useState(3)
  const hasGvgTimer = Number.isFinite(gvgScope?.timeRemaining)

  useEffect(() => {
    if (!hasGvgTimer) {
      setGvgRemaining(0)
      return
    }

    setGvgRemaining(Math.max(0, Math.floor(gvgScope.timeRemaining)))
  }, [gvgScope?.timeRemaining, hasGvgTimer])

  useEffect(() => {
    if (!hasGvgTimer || gvgRemaining <= 0) {
      return undefined
    }

    const id = setInterval(() => {
      setGvgRemaining((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(id)
  }, [gvgRemaining, hasGvgTimer])

  useEffect(() => {
    if (resetPhase !== 'countdown') {
      return undefined
    }

    const id = setTimeout(() => {
      if (countdownValue <= 0) {
        setResetPhase('confirm')
      } else {
        setCountdownValue((prev) => prev - 1)
      }
    }, 1000)

    return () => clearTimeout(id)
  }, [countdownValue, resetPhase])

  useEffect(() => {
    if (resetPhase !== 'confirm') {
      return undefined
    }

    const id = setTimeout(() => {
      setResetPhase('idle')
    }, 5000)

    return () => clearTimeout(id)
  }, [resetPhase])

  const gvgTopLabel = useMemo(() => {
    if (!hasGvgTimer || gvgRemaining <= 0) {
      return 'READY'
    }

    return formatTime(gvgRemaining)
  }, [gvgRemaining, hasGvgTimer])

  const resetGvgFromServer = async () => {
    if (resetPhase === 'idle') {
      setCountdownValue(3)
      setResetPhase('countdown')
      return
    }

    if (resetPhase !== 'confirm') {
      return
    }

    try {
      await resetGvg(serverUrl, postHeaders?.() ?? {})
      setSyncError('')
      setResetPhase('idle')
    } catch {
      setSyncError('Syncing error: failed to reset GvG.')
      setResetPhase('idle')
    }
  }

  return (
    <>
      {hasGvgTimer ? (
        <div className="px-3 pt-2 text-[10px] text-white/60">
          GvG:
          <span
            className={`ml-1 font-mono font-semibold ${
              gvgRemaining <= 0 ? 'text-emerald-400' : 'text-sky-300'
            }`}
          >
            {gvgTopLabel}
          </span>
        </div>
      ) : null}

      {syncError ? (
        <div className="px-3 py-1 text-[11px] text-red-300 bg-red-950/30 border-b border-red-500/40">
          {syncError}
        </div>
      ) : null}

      <div className="p-4 space-y-2 max-h-[420px] overflow-y-auto">
        {children}
      </div>

      <div
        className={`p-3 border-t border-white/10 flex items-center ${isCommander ? 'justify-between' : 'justify-start'}`}
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        <button
          onClick={onOpenSettings}
          className="w-10 h-10 p-1.5 flex items-center justify-center text-white/70 border border-white/20 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Open settings"
          title="Settings"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10.6 3.6h2.8l.5 2a6.8 6.8 0 0 1 1.7.7l1.8-1 2 2-1 1.8c.3.5.5 1.1.7 1.7l2 .5v2.8l-2 .5a6.8 6.8 0 0 1-.7 1.7l1 1.8-2 2-1.8-1a6.8 6.8 0 0 1-1.7.7l-.5 2h-2.8l-.5-2a6.8 6.8 0 0 1-1.7-.7l-1.8 1-2-2 1-1.8a6.8 6.8 0 0 1-.7-1.7l-2-.5v-2.8l2-.5a6.8 6.8 0 0 1 .7-1.7l-1-1.8 2-2 1.8 1c.5-.3 1.1-.5 1.7-.7z" />
            <circle cx="12" cy="12" r="2.6" />
          </svg>
        </button>
        {isCommander ? (
          <button
            onClick={resetGvgFromServer}
            className={`px-3 py-1.5 text-xs font-semibold bg-transparent border rounded-lg transition-colors ${
              resetPhase === 'confirm'
                ? 'text-red-200 border-red-400 hover:bg-red-500/20'
                : 'text-red-400 border-red-500/50 hover:bg-red-500/10'
            }`}
          >
            {resetPhase === 'countdown'
              ? `Confirm in ${countdownValue}`
              : resetPhase === 'confirm'
                ? 'Confirm Reset'
                : 'Reset GvG'}
          </button>
        ) : null}
      </div>
    </>
  )
}

export default TimersScreen
