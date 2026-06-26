import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchGvgStatus, startGvg as startGvgOnServer } from '../services/serverApi'

function GvgStatusGate({
  mode,
  serverUrl,
  postHeaders,
  refreshSeq,
  oneRowLayout,
  onGvgRunningChange,
  onGvgScopeChange,
  onStatusChange,
  onOpenSettings,
  children,
}) {
  const [gvgRunning, setGvgRunning] = useState(false)
  const [statusError, setStatusError] = useState('')
  const [additionalMinutes, setAdditionalMinutes] = useState('0')
  const [additionalSeconds, setAdditionalSeconds] = useState('0')
  const [startSubmitting, setStartSubmitting] = useState(false)
  const [startError, setStartError] = useState('')
  const pollingRef = useRef(null)

  const refreshStatus = useCallback(async () => {
    const status = await fetchGvgStatus(serverUrl, postHeaders?.() ?? {})
    setGvgRunning(status.gvgRunning)
    onGvgRunningChange(status.gvgRunning)
    onGvgScopeChange?.(status.gvgScope)
    onStatusChange?.(status)
    setStatusError('')
    return status
  }, [onGvgRunningChange, onGvgScopeChange, onStatusChange, postHeaders, serverUrl])

  useEffect(() => {
    let active = true

    const startPolling = async () => {
      try {
        await refreshStatus()
      } catch (error) {
        if (active) {
          setStatusError(error instanceof Error ? error.message : 'Syncing error: failed to fetch GvG status.')
        }
      }

      if (!active) {
        return
      }

      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }

      pollingRef.current = setInterval(() => {
        refreshStatus().catch((error) => {
          if (active) {
            setStatusError(error instanceof Error ? error.message : 'Syncing error: failed to fetch GvG status.')
          }
        })
      }, 2000)
    }

    startPolling()

    return () => {
      active = false
      onGvgRunningChange(false)
      onGvgScopeChange?.(null)
      onStatusChange?.(null)
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [onGvgRunningChange, onGvgScopeChange, onStatusChange, refreshStatus])

  useEffect(() => {
    if (!refreshSeq) {
      return
    }

    refreshStatus().catch((error) => {
      setStatusError(error instanceof Error ? error.message : 'Syncing error: failed to fetch GvG status.')
    })
  }, [refreshSeq, refreshStatus])

  const startGvg = async () => {
    const minutesValue = Number(additionalMinutes)
    const secondsValue = Number(additionalSeconds)

    if (!Number.isInteger(minutesValue) || minutesValue < 0) {
      setStartError('Minutes must be a whole number (0 or higher).')
      return
    }

    if (!Number.isInteger(secondsValue) || secondsValue < 0 || secondsValue > 59) {
      setStartError('Seconds must be a whole number between 0 and 59.')
      return
    }

    const numericAdditionalTime = minutesValue * 60 + secondsValue

    try {
      setStartSubmitting(true)
      setStartError('')

      await startGvgOnServer(serverUrl, numericAdditionalTime, postHeaders())

      await refreshStatus()
    } catch (error) {
      setStartError(error instanceof Error ? error.message : 'Failed to start GvG.')
    } finally {
      setStartSubmitting(false)
    }
  }

  if (gvgRunning) {
    return typeof children === 'function' ? children() : children
  }

  if (oneRowLayout) {
    return (
      <>
        {statusError ? (
          <div className="px-3 py-1 text-[11px] text-red-300 bg-red-950/30 border-b border-red-500/40">
            {statusError}
          </div>
        ) : null}
        {startError ? (
          <div className="px-3 py-1 text-[11px] text-red-300 bg-red-950/30 border-b border-red-500/40">
            {startError}
          </div>
        ) : null}

        <div
          className="py-1 pl-10 pr-2 max-h-[420px] overflow-hidden grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"
        >
          <div className="min-w-0 flex items-center justify-center gap-2" style={{ WebkitAppRegion: 'no-drag' }}>
            {mode === 'Commander' ? (
              <>
                <span className="text-xs text-white/65 whitespace-nowrap">Start in</span>
                <input
                  type="number"
                  min="0"
                  value={additionalMinutes}
                  onChange={(event) => setAdditionalMinutes(event.target.value)}
                  className="no-spin w-10 px-1.5 py-1 text-xs text-white bg-white/10 border border-white/20 rounded-md outline-none focus:border-sky-400/70"
                  aria-label="Minutes till GvG starts"
                />
                <span className="text-xs text-white/55">:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={additionalSeconds}
                  onChange={(event) => setAdditionalSeconds(event.target.value)}
                  className="no-spin w-10 px-1.5 py-1 text-xs text-white bg-white/10 border border-white/20 rounded-md outline-none focus:border-sky-400/70"
                  aria-label="Seconds till GvG starts"
                />
              </>
            ) : (
              <span className="text-xs text-white/75 truncate">
                GvG not started. Waiting for updates.
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0" style={{ WebkitAppRegion: 'no-drag' }}>
            <button
              onClick={onOpenSettings}
              className="w-8 h-8 p-1 flex items-center justify-center text-white/70 border border-white/20 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Open settings"
              title="Settings"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-4.5 h-4.5"
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
            {mode === 'Commander' ? (
              <button
                onClick={startGvg}
                disabled={startSubmitting}
                className="h-8 px-2 text-[10px] font-semibold bg-transparent border rounded-lg border-emerald-400/70 text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                Start
              </button>
            ) : null}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="p-4 space-y-2" style={{ WebkitAppRegion: 'no-drag' }}>
        {statusError ? (
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-red-500/40 text-[11px] text-red-300">
            {statusError}
          </div>
        ) : null}

        {mode === 'Commander' ? (
          <>
            <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10 space-y-2">
              <label className="text-xs text-white/70 block">Time till GvG starts</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <div className="text-[11px] text-white/60">Minutes</div>
                  <input
                    type="number"
                    min="0"
                    value={additionalMinutes}
                    onChange={(event) => setAdditionalMinutes(event.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-lg outline-none focus:border-sky-400/70"
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-[11px] text-white/60">Seconds</div>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={additionalSeconds}
                    onChange={(event) => setAdditionalSeconds(event.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-lg outline-none focus:border-sky-400/70"
                  />
                </div>
              </div>
            </div>

            {startError ? (
              <div className="bg-white/5 rounded-xl px-3 py-2 border border-red-500/40 text-[11px] text-red-300">
                {startError}
              </div>
            ) : null}
          </>
        ) : (
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10 text-sm text-white/80">
            GvG not started. Waiting for updates.
          </div>
        )}
      </div>

      <div
        className={`p-3 border-t border-white/10 flex items-center ${mode === 'Commander' ? 'justify-between' : 'justify-start'}`}
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
        {mode === 'Commander' ? (
          <button
            onClick={startGvg}
            disabled={startSubmitting}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-400/70 text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
          >
            Start GvG
          </button>
        ) : null}
      </div>
    </>
  )
}

export default GvgStatusGate
