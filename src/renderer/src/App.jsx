import { useCallback, useEffect, useRef, useState } from 'react'
import InitialSetupScreen from './components/InitialSetupScreen'
import OffenseTimers from './components/OffenseTimers'
import DefenseTimers from './components/DefenseTimers'
import GvgStatusGate from './components/GvgStatusGate'

const initialTimers = [
  { id: 1, name: 'Com: Healcut', duration: 300, remaining: 300, isRunning: false },
  // { id: 2, name: 'Objective Capture', duration: 180, remaining: 180, isRunning: false },
  // { id: 3, name: 'Buff / Buff Cooldown', duration: 90, remaining: 90, isRunning: false },
  // { id: 4, name: 'Tower Push Timer', duration: 240, remaining: 240, isRunning: false },
]
const baseOverlayWidth = 380
const baseOverlayHeightFallback = 420
const defaultServerUrl = 'http://217.182.78.238:3333'

const setupStorageKey = 'wwm-overlay-setup'
const defaultSetup = {
  userName: '',
  mode: 'Member',
  team: 'Offense',
  apiKey: '',
  selectedGear: [],
}

function loadSavedSetup() {
  if (typeof window === 'undefined') {
    return { setup: defaultSetup, isConfigured: false }
  }

  try {
    const raw = window.localStorage.getItem(setupStorageKey)
    if (!raw) {
      return { setup: defaultSetup, isConfigured: false }
    }

    const parsed = JSON.parse(raw)
    const mode = parsed?.setup?.mode === 'Commander' ? 'Commander' : 'Member'
    const team = parsed?.setup?.team === 'Defense' ? 'Defense' : 'Offense'
    const selectedGear = Array.isArray(parsed?.setup?.selectedGear)
      ? parsed.setup.selectedGear.filter((item) =>
          ['Mo blade', 'Ink Fan', 'Heal Umbrella', 'Twin Blades'].includes(item)
        ).slice(0, 2)
      : []

    return {
      setup: {
        userName: typeof parsed?.setup?.userName === 'string' ? parsed.setup.userName : '',
        mode,
        team,
        apiKey: typeof parsed?.setup?.apiKey === 'string' ? parsed.setup.apiKey : '',
        selectedGear,
      },
      isConfigured: Boolean(parsed?.isConfigured),
    }
  } catch {
    return { setup: defaultSetup, isConfigured: false }
  }
}

function App() {
  const [timers, setTimers] = useState(initialTimers)
  const [, setGvgRunning] = useState(false)
  const [gvgScope, setGvgScope] = useState(null)
  const [serverUrl, setServerUrl] = useState(defaultServerUrl)
  const [overlayScale, setOverlayScale] = useState(1)
  const [contentHeight, setContentHeight] = useState(baseOverlayHeightFallback)
  const [isConfigured, setIsConfigured] = useState(() => loadSavedSetup().isConfigured)
  const [setupError, setSetupError] = useState('')
  const [setup, setSetup] = useState(() => loadSavedSetup().setup)
  const overlayContentRef = useRef(null)

  const isCommander = setup.mode === 'Commander'
  const TeamTimers = setup.team === 'Defense' ? DefenseTimers : OffenseTimers
  const canContinue =
    setup.userName.trim().length > 0 &&
    setup.selectedGear.length <= 2 &&
    (!isCommander || setup.apiKey.trim().length > 0)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(
      setupStorageKey,
      JSON.stringify({
        setup,
        isConfigured,
      })
    )
  }, [setup, isConfigured])

  useEffect(() => {
    let active = true

    window.api
      ?.getServerUrl?.()
      .then((url) => {
        if (active && typeof url === 'string' && url.trim()) {
          setServerUrl(url)
        }
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!overlayContentRef.current || typeof ResizeObserver === 'undefined') {
      return
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) {
        return
      }
      setContentHeight(Math.max(baseOverlayHeightFallback, Math.ceil(entry.contentRect.height)))
    })

    observer.observe(overlayContentRef.current)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const updateScale = () => {
      const widthScale = window.innerWidth / baseOverlayWidth
      const heightScale = window.innerHeight / (contentHeight || baseOverlayHeightFallback)
      setOverlayScale(Math.max(0.6, Math.min(widthScale, heightScale)))
    }

    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [contentHeight])

  const applyStatusTimers = useCallback((status) => {
    if (!status) {
      return
    }

    const nextTimers =
      status.timers ??
      status.raw?.gvgScope?.timers ??
      status.raw?.gvgScope?.data?.timers ??
      status.raw?.data?.timers ??
      null

    if (Array.isArray(nextTimers)) {
      setTimers(nextTimers)
    }
  }, [])

  const postHeaders = useCallback(() => {
    const headers = {}
    const trimmedUserName = setup.userName.trim()

    if (trimmedUserName) {
      headers.userName = trimmedUserName
    }

    headers.team = setup.team

    if (isCommander && setup.apiKey.trim()) {
      headers['X-API-Key'] = setup.apiKey.trim()
    }

    return headers
  }, [isCommander, setup.apiKey, setup.team, setup.userName])

  const toggleGear = (gear) => {
    setSetup((prev) => {
      if (prev.selectedGear.includes(gear)) {
        return { ...prev, selectedGear: prev.selectedGear.filter((item) => item !== gear) }
      }

      if (prev.selectedGear.length >= 2) {
        return prev
      }

      return { ...prev, selectedGear: [...prev.selectedGear, gear] }
    })
  }

  const submitSetup = () => {
    if (!canContinue) {
      setSetupError('Fill all required fields.')
      return
    }

    setSetupError('')
    setIsConfigured(true)
  }

  const resetSetup = () => {
    setSetup(defaultSetup)
    setSetupError('')
    setIsConfigured(false)
    setGvgRunning(false)
    setGvgScope(null)
    setTimers(initialTimers)
  }

  return (
    <div className="w-screen h-screen flex items-start justify-center overflow-hidden">
      <div
        style={{
          width: `${baseOverlayWidth}px`,
          transform: `scale(${overlayScale})`,
          transformOrigin: 'top center',
        }}
      >
        <div
          ref={overlayContentRef}
          className="w-full bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl text-white overflow-hidden flex flex-col"
        >
          <div
            className="px-3 py-2 bg-black/90 flex items-center justify-between border-b border-white/10 cursor-move"
            style={{ WebkitAppRegion: 'drag' }}
          >
            <h1 className="text-sm font-semibold tracking-wide">WWM GvG Timers</h1>
            <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' }}>
              <span className="text-[10px] text-white/60">Ctrl+Shift+T</span>
              <button
                onClick={() => window.api?.hideOverlay?.() || window.close()}
                className="w-6 h-6 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                X
              </button>
            </div>
          </div>

          {!isConfigured ? (
            <InitialSetupScreen
              setup={setup}
              setupError={setupError}
              onSetupChange={(field, value) => setSetup((prev) => ({ ...prev, [field]: value }))}
              onToggleGear={toggleGear}
              onSubmitSetup={submitSetup}
              onResetSetup={resetSetup}
            />
          ) : (
            <GvgStatusGate
              mode={setup.mode}
              serverUrl={serverUrl}
              postHeaders={postHeaders}
              onGvgRunningChange={setGvgRunning}
              onGvgScopeChange={setGvgScope}
              onStatusChange={applyStatusTimers}
              onOpenSettings={() => {
                setIsConfigured(false)
                setGvgRunning(false)
                setGvgScope(null)
              }}
            >
              <TeamTimers
                timers={timers}
                gvgScope={gvgScope}
                serverUrl={serverUrl}
                postHeaders={postHeaders}
                isCommander={isCommander}
                onOpenSettings={() => {
                  setIsConfigured(false)
                  setGvgRunning(false)
                  setGvgScope(null)
                }}
              />
            </GvgStatusGate>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
