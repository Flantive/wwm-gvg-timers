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
const weaponOptions = [
  { label: 'Mo Blade (suck)', code: 'mo_blade' },
  { label: 'Ink Fan (wall)', code: 'ink_fan' },
  { label: 'Twin Blades', code: 'twin_blades' },
]
const validWeaponCodes = new Set(weaponOptions.map((item) => item.code))
const legacyWeaponCodeMap = {
  'Mo Blade (suck)': 'mo_blade',
  'Mo blade': 'mo_blade',
  'Ink Fan (wall)': 'ink_fan',
  'Ink Fan': 'ink_fan',
  'Twin Blades': 'twin_blades',
}

const setupStorageKey = 'wwm-overlay-setup'
const commanderBuffKeybindFields = [
  'commanderHealcutKeybind',
  'commanderSprintKeybind',
  'commanderCarrierDmgKeybind',
]
const clampTransparency = (value) => Math.min(100, Math.max(0, value))
const normalizeCooldown = (value, fallback = 120) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return Math.max(0, Math.floor(parsed))
}
const normalizeKeybind = (value, fallback) => {
  if (typeof value !== 'string') {
    return fallback
  }

  const parts = value
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)

  if (parts.length === 0) {
    return fallback
  }

  return Array.from(new Set(parts)).join('+')
}

const defaultSetup = {
  userName: '',
  mode: 'Member',
  team: 'Offense',
  commanderTimersSize: 'Big',
  showTeamExCooldowns: true,
  apiKey: '',
  firstWeapon: '',
  secondWeapon: '',
  firstWeaponCooldown: 120,
  secondWeaponCooldown: 120,
  firstWeaponKeybind: 'Numpad8',
  secondWeaponKeybind: 'Numpad9',
  commanderHealcutKeybind: 'Numpad1',
  commanderSprintKeybind: 'Numpad2',
  commanderCarrierDmgKeybind: 'Numpad3',
  transparency: 100,
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
    const commanderTimersSize = parsed?.setup?.commanderTimersSize === 'Small' ? 'Small' : 'Big'
    const showTeamExCooldowns =
      typeof parsed?.setup?.showTeamExCooldowns === 'boolean'
        ? parsed.setup.showTeamExCooldowns
        : true
    const legacySelectedGear = Array.isArray(parsed?.setup?.selectedGear) ? parsed.setup.selectedGear : []
    const firstWeaponRaw = parsed?.setup?.firstWeapon ?? legacyWeaponCodeMap[legacySelectedGear[0]] ?? ''
    const secondWeaponRaw = parsed?.setup?.secondWeapon ?? legacyWeaponCodeMap[legacySelectedGear[1]] ?? ''
    const firstWeapon = validWeaponCodes.has(firstWeaponRaw) ? firstWeaponRaw : ''
    let secondWeapon = validWeaponCodes.has(secondWeaponRaw) ? secondWeaponRaw : ''
    if (firstWeapon && secondWeapon === firstWeapon) {
      secondWeapon = ''
    }

    const firstWeaponKeybind = normalizeKeybind(
      parsed?.setup?.firstWeaponKeybind,
      defaultSetup.firstWeaponKeybind
    )
    let secondWeaponKeybind = normalizeKeybind(
      parsed?.setup?.secondWeaponKeybind,
      defaultSetup.secondWeaponKeybind
    )

    if (firstWeaponKeybind === secondWeaponKeybind) {
      secondWeaponKeybind =
        defaultSetup.secondWeaponKeybind !== firstWeaponKeybind
          ? defaultSetup.secondWeaponKeybind
          : ''
    }

    const commanderHealcutKeybind = normalizeKeybind(
      parsed?.setup?.commanderHealcutKeybind,
      defaultSetup.commanderHealcutKeybind
    )
    const commanderSprintKeybind = normalizeKeybind(
      parsed?.setup?.commanderSprintKeybind,
      defaultSetup.commanderSprintKeybind
    )
    const commanderCarrierDmgKeybind = normalizeKeybind(
      parsed?.setup?.commanderCarrierDmgKeybind,
      defaultSetup.commanderCarrierDmgKeybind
    )

    return {
      setup: {
        userName: typeof parsed?.setup?.userName === 'string' ? parsed.setup.userName : '',
        mode,
        team,
        commanderTimersSize,
        showTeamExCooldowns,
        apiKey: typeof parsed?.setup?.apiKey === 'string' ? parsed.setup.apiKey : '',
        firstWeapon,
        secondWeapon,
        firstWeaponCooldown: normalizeCooldown(
          parsed?.setup?.firstWeaponCooldown,
          defaultSetup.firstWeaponCooldown
        ),
        secondWeaponCooldown: normalizeCooldown(
          parsed?.setup?.secondWeaponCooldown,
          defaultSetup.secondWeaponCooldown
        ),
        firstWeaponKeybind,
        secondWeaponKeybind,
        commanderHealcutKeybind,
        commanderSprintKeybind,
        commanderCarrierDmgKeybind,
        transparency: clampTransparency(
          Number.isFinite(Number(parsed?.setup?.transparency))
            ? Number(parsed.setup.transparency)
            : defaultSetup.transparency
        ),
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
  const [statusUserCooldowns, setStatusUserCooldowns] = useState(null)
  const [serverUrl, setServerUrl] = useState('')
  const [overlayScale, setOverlayScale] = useState(1)
  const [contentHeight, setContentHeight] = useState(420)
  const [isConfigured, setIsConfigured] = useState(() => loadSavedSetup().isConfigured)
  const [setupError, setSetupError] = useState('')
  const [setup, setSetup] = useState(() => loadSavedSetup().setup)
  const [statusRefreshSeq, setStatusRefreshSeq] = useState(0)
  const overlayContentRef = useRef(null)
  const transparencyRatio = clampTransparency(setup.transparency) / 100
  const panelAlpha = 0.05 * transparencyRatio

  const isCommander = setup.mode === 'Commander'
  const TeamTimers = setup.team === 'Defense' ? DefenseTimers : OffenseTimers
  const localHotkeyBindings = {
    ...(isCommander
      ? {
          healcut: setup.commanderHealcutKeybind,
          sprint: setup.commanderSprintKeybind,
          carrierdmg: setup.commanderCarrierDmgKeybind,
        }
      : {}),
    ...(setup.firstWeapon ? { ex_weapon_1: setup.firstWeaponKeybind } : {}),
    ...(setup.secondWeapon ? { ex_weapon_2: setup.secondWeaponKeybind } : {}),
  }
  const canContinue =
    setup.userName.trim().length > 0 &&
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
      const next = Math.ceil(entries?.[0]?.contentRect?.height ?? 420)
      setContentHeight(Math.max(1, next))
    })

    observer.observe(overlayContentRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const updateScale = () => {
      const widthScale = window.innerWidth / baseOverlayWidth
      setOverlayScale(Math.max(0.2, widthScale))
    }

    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  useEffect(() => {
    const bottomSafetyPixels = Math.max(4, Math.ceil(3 * overlayScale))
    const nextHeight = Math.ceil(contentHeight * overlayScale) + bottomSafetyPixels
    window.api?.setOverlayHeight?.(nextHeight)
  }, [contentHeight, overlayScale])

  useEffect(() => {
    if (!window.api?.setCommanderHotkeys) {
      return
    }

    if (!isConfigured) {
      window.api.setCommanderHotkeys({})
      return
    }

    const hotkeyConfig = {}
    if (isCommander) {
      hotkeyConfig.healcut = setup.commanderHealcutKeybind
      hotkeyConfig.sprint = setup.commanderSprintKeybind
      hotkeyConfig.carrierdmg = setup.commanderCarrierDmgKeybind
    }

    if (setup.firstWeapon) {
      hotkeyConfig.ex_weapon_1 = setup.firstWeaponKeybind
    }

    if (setup.secondWeapon) {
      hotkeyConfig.ex_weapon_2 = setup.secondWeaponKeybind
    }

    window.api.setCommanderHotkeys(hotkeyConfig)
  }, [
    isCommander,
    isConfigured,
    setup.firstWeapon,
    setup.firstWeaponKeybind,
    setup.secondWeapon,
    setup.secondWeaponKeybind,
    setup.commanderCarrierDmgKeybind,
    setup.commanderHealcutKeybind,
    setup.commanderSprintKeybind,
  ])

  const applyStatusTimers = useCallback((status) => {
    if (!status) {
      setStatusUserCooldowns(null)
      return
    }

    setStatusUserCooldowns(status.userCooldowns ?? null)

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

  const submitSetup = () => {
    if (!canContinue) {
      setSetupError('Fill all required fields.')
      return
    }

    setSetupError('')
    setIsConfigured(true)
  }

  const handleSetupChange = (field, value) => {
    setSetup((prev) => {
      const next = { ...prev, [field]: value }

      if (field === 'firstWeapon' && value && value === prev.secondWeapon) {
        next.secondWeapon = ''
      }

      if (field === 'secondWeapon' && value && value === prev.firstWeapon) {
        next.firstWeapon = ''
      }

      if (
        field === 'firstWeaponKeybind' &&
        value &&
        value === prev.secondWeaponKeybind
      ) {
        return prev
      }

      if (
        field === 'secondWeaponKeybind' &&
        value &&
        value === prev.firstWeaponKeybind
      ) {
        return prev
      }

      if (commanderBuffKeybindFields.includes(field) && value) {
        const hasDuplicate = commanderBuffKeybindFields.some(
          (keybindField) => keybindField !== field && prev[keybindField] === value
        )
        if (hasDuplicate) {
          return prev
        }
      }

      return next
    })
  }

  const resetSetup = () => {
    setSetup(defaultSetup)
    setSetupError('')
    setIsConfigured(false)
    setGvgRunning(false)
    setGvgScope(null)
    setTimers(initialTimers)
  }

  const requestImmediateStatusRefresh = useCallback(() => {
    setStatusRefreshSeq((prev) => prev + 1)
  }, [])

  return (
    <div className="w-screen h-screen overflow-hidden">
      <div
        style={{
          width: `${baseOverlayWidth}px`,
          transform: `scale(${overlayScale})`,
          transformOrigin: 'top left',
        }}
      >
        <div
          ref={overlayContentRef}
          className="w-full backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl text-white overflow-hidden flex flex-col"
          style={{
            backgroundColor: `rgba(0, 0, 0, ${transparencyRatio})`,
            '--overlay-panel-alpha': panelAlpha,
          }}
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
              onSetupChange={handleSetupChange}
              onSubmitSetup={submitSetup}
              onResetSetup={resetSetup}
            />
          ) : (
            <GvgStatusGate
              mode={setup.mode}
              serverUrl={serverUrl}
              postHeaders={postHeaders}
              refreshSeq={statusRefreshSeq}
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
                team={setup.team}
                userName={setup.userName}
                commanderTimersSize={setup.commanderTimersSize}
                showTeamExCooldowns={setup.showTeamExCooldowns}
                userCooldowns={statusUserCooldowns}
                commanderBuffKeybinds={{
                  healcut: setup.commanderHealcutKeybind,
                  sprint: setup.commanderSprintKeybind,
                  carrierdmg: setup.commanderCarrierDmgKeybind,
                }}
                exHotkeyActions={{
                  ex_weapon_1: {
                    weaponCode: setup.firstWeapon,
                    weaponCooldown: setup.firstWeaponCooldown,
                  },
                  ex_weapon_2: {
                    weaponCode: setup.secondWeapon,
                    weaponCooldown: setup.secondWeaponCooldown,
                  },
                }}
                localHotkeyBindings={localHotkeyBindings}
                onRequestStatusRefresh={requestImmediateStatusRefresh}
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
