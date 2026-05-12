import { useCallback, useEffect, useRef, useState } from 'react'
import InitialSetupScreen from './components/InitialSetupScreen'
import OffenseTimers from './components/OffenseTimers'
import DefenseTimers from './components/DefenseTimers'
import GvgStatusGate from './components/GvgStatusGate'
import WelcomeScreen from './components/WelcomeScreen'
import { fetchAuthMe, logoutAuth } from './services/serverApi'

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
  { label: 'Heal Fan', code: 'heal_fan' },
  { label: 'Twin Blades', code: 'twin_blades' },
]
const validWeaponCodes = new Set(weaponOptions.map((item) => item.code))
const legacyWeaponCodeMap = {
  'Mo Blade (suck)': 'mo_blade',
  'Mo blade': 'mo_blade',
  'Ink Fan (wall)': 'ink_fan',
  'Ink Fan': 'ink_fan',
  'Heal Fan': 'heal_fan',
  'Twin Blades': 'twin_blades',
}
const authWeaponCodeMap = {
  'Inkwell Fan': 'ink_fan',
  'Panacea Fan': 'heal_fan',
  'Thundercry Blade': 'mo_blade',
  'Infernal Twinblades': 'twin_blades',
}

const setupStorageKey = 'wwm-overlay-setup'
const authStorageKey = 'wwm-overlay-auth'
const commanderRoleId = '1459682165863219333'
const guildWarRoleId = '1498694492507734056'
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
  discordUserName: '',
  team: 'Offense',
  commanderTimersSize: 'Small',
  showTeamExCooldowns: true,
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

function loadSavedAuth() {
  if (typeof window === 'undefined') {
    return { sessionToken: '', authUserName: '', authIgn: '' }
  }

  try {
    const raw = window.localStorage.getItem(authStorageKey)
    if (!raw) {
      return { sessionToken: '', authUserName: '', authIgn: '' }
    }

    const parsed = JSON.parse(raw)
    return {
      sessionToken:
        typeof parsed?.sessionToken === 'string' ? parsed.sessionToken : '',
      authUserName:
        typeof parsed?.authUserName === 'string' ? parsed.authUserName : '',
      authIgn: typeof parsed?.authIgn === 'string' ? parsed.authIgn : '',
    }
  } catch {
    return { sessionToken: '', authUserName: '', authIgn: '' }
  }
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
    const team = parsed?.setup?.team === 'Defense' ? 'Defense' : 'Offense'
    const commanderTimersSize = parsed?.setup?.commanderTimersSize === 'Big' ? 'Big' : 'Small'
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
        discordUserName:
          typeof parsed?.setup?.discordUserName === 'string'
            ? parsed.setup.discordUserName
            : '',
        team,
        commanderTimersSize,
        showTeamExCooldowns,
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
  const savedAuth = loadSavedAuth()
  const [timers, setTimers] = useState(initialTimers)
  const [, setGvgRunning] = useState(false)
  const [gvgScope, setGvgScope] = useState(null)
  const [statusUserCooldowns, setStatusUserCooldowns] = useState(null)
  const [serverUrl, setServerUrl] = useState('')
  const [authServerUrl, setAuthServerUrl] = useState('')
  const [authLoginUrl, setAuthLoginUrl] = useState('')
  const [sessionToken, setSessionToken] = useState(savedAuth.sessionToken)
  const [authUserName, setAuthUserName] = useState(savedAuth.authUserName)
  const [authIgn, setAuthIgn] = useState(savedAuth.authIgn)
  const [authRoles, setAuthRoles] = useState([])
  const [loginBusy, setLoginBusy] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [logoutBusy, setLogoutBusy] = useState(false)
  const [authChecking, setAuthChecking] = useState(Boolean(savedAuth.sessionToken))
  const [overlayScale, setOverlayScale] = useState(1)
  const [contentHeight, setContentHeight] = useState(420)
  const [isConfigured, setIsConfigured] = useState(() => loadSavedSetup().isConfigured)
  const [setupError, setSetupError] = useState('')
  const [setup, setSetup] = useState(() => loadSavedSetup().setup)
  const [statusRefreshSeq, setStatusRefreshSeq] = useState(0)
  const overlayContentRef = useRef(null)
  const transparencyRatio = clampTransparency(setup.transparency) / 100
  const panelAlpha = 0.05 * transparencyRatio

  const isCommander = authRoles.includes(commanderRoleId)
  const hasGuildWarRole = authRoles.includes(guildWarRoleId)
  const normalizedIgnForRequests = typeof authIgn === 'string' ? authIgn.trim() : ''
  const hasUsableIgnForRequests =
    Boolean(normalizedIgnForRequests) &&
    normalizedIgnForRequests.toLowerCase() !== 'null'
  const requestUserName = hasUsableIgnForRequests
    ? normalizedIgnForRequests
    : authUserName.trim()
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
  const canContinue = true

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
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(
      authStorageKey,
      JSON.stringify({
        sessionToken,
        authUserName,
        authIgn,
      })
    )
  }, [authIgn, authUserName, sessionToken])

  useEffect(() => {
    let active = true

    Promise.all([
      window.api?.getServerUrl?.(),
      window.api?.getAuthServerUrl?.(),
      window.api?.getAuthLoginUrl?.(),
      window.api?.getPendingSessionToken?.(),
    ])
      .then(([mainServer, authServer, loginUrl, pendingToken]) => {
        if (!active) {
          return
        }

        if (typeof mainServer === 'string' && mainServer.trim()) {
          setServerUrl(mainServer)
        }

        if (typeof authServer === 'string' && authServer.trim()) {
          setAuthServerUrl(authServer)
        }

        if (typeof loginUrl === 'string' && loginUrl.trim()) {
          setAuthLoginUrl(loginUrl)
        }

        if (typeof pendingToken === 'string' && pendingToken.trim()) {
          setSessionToken(pendingToken.trim())
          setAuthChecking(true)
          setLoginError('')
        }
      })
      .catch(() => {})

    const unsubscribeAuthCallback = window.api?.onAuthCallback?.((payload) => {
      const callbackToken =
        typeof payload?.sessionToken === 'string' ? payload.sessionToken.trim() : ''
      if (!callbackToken) {
        return
      }

      setSessionToken(callbackToken)
      setAuthChecking(true)
      setLoginError('')
    })

    return () => {
      active = false
      if (typeof unsubscribeAuthCallback === 'function') {
        unsubscribeAuthCallback()
      }
    }
  }, [])

  useEffect(() => {
    if (!sessionToken) {
      setAuthChecking(false)
      setAuthUserName('')
      setAuthIgn('')
      return
    }

    if (!authServerUrl) {
      return
    }

    let active = true
    setAuthChecking(true)

    fetchAuthMe(authServerUrl, { 'X-Session-Token': sessionToken })
      .then((payload) => {
        if (!active) {
          return
        }

        const identity = payload?.user ?? payload ?? {}
        const resolvedUserName = identity?.username ?? payload?.username ?? ''
        const resolvedIgn = identity?.ign ?? payload?.ign ?? ''
        const resolvedWeaponsRaw =
          identity?.weapons ??
          payload?.weapons ??
          null
        const resolvedRolesRaw =
          payload?.guildMember?.roles ??
          identity?.guildMember?.roles ??
          []
        const resolvedRoles = Array.isArray(resolvedRolesRaw)
          ? resolvedRolesRaw.map((item) => String(item))
          : []
        let mappedWeapons = null
        if (Array.isArray(resolvedWeaponsRaw)) {
          const trimmedWeapons = resolvedWeaponsRaw
            .slice(0, 2)
            .map((item) => (typeof item === 'string' ? item.trim() : ''))

          const hasUnknownWeapon = trimmedWeapons.some(
            (weaponName) => weaponName && !authWeaponCodeMap[weaponName]
          )

          if (hasUnknownWeapon) {
            mappedWeapons = ['', '']
          } else {
            const [firstMapped = '', secondMapped = ''] = trimmedWeapons.map(
              (weaponName) => authWeaponCodeMap[weaponName] ?? ''
            )
            mappedWeapons =
              firstMapped && secondMapped === firstMapped
                ? [firstMapped, '']
                : [firstMapped, secondMapped]
          }
        } else if (resolvedWeaponsRaw == null) {
          mappedWeapons = ['', '']
        }

        if (typeof resolvedUserName === 'string' && resolvedUserName.trim()) {
          const trimmed = resolvedUserName.trim()
          setAuthUserName(trimmed)
          setAuthIgn(typeof resolvedIgn === 'string' ? resolvedIgn.trim() : '')
          setAuthRoles(resolvedRoles)
          setSetup((prev) => {
            const nextSetup = {
              ...prev,
              discordUserName: trimmed,
            }
            if (mappedWeapons) {
              nextSetup.firstWeapon = mappedWeapons[0]
              nextSetup.secondWeapon = mappedWeapons[1]
            }
            return nextSetup
          })
        } else {
          setAuthUserName('')
          setAuthIgn('')
          setAuthRoles(resolvedRoles)
          if (mappedWeapons) {
            setSetup((prev) => ({
              ...prev,
              firstWeapon: mappedWeapons[0],
              secondWeapon: mappedWeapons[1],
            }))
          }
        }

        setLoginError('')
      })
      .catch((error) => {
        console.error('[auth/me] request failed:', error)
        if (!active) {
          return
        }

        setSessionToken('')
        setAuthUserName('')
        setAuthIgn('')
        setAuthRoles([])
        setIsConfigured(false)
        setLoginError('')
      })
      .finally(() => {
        if (active) {
          setAuthChecking(false)
        }
      })

    return () => {
      active = false
    }
  }, [authServerUrl, sessionToken])

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

    if (requestUserName) {
      headers.userName = requestUserName
    }

    headers.team = setup.team

    if (sessionToken) {
      headers['X-Session-Token'] = sessionToken
    }

    return headers
  }, [requestUserName, sessionToken, setup.team])

  const submitSetup = () => {
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
    setSetup((prev) => ({
      ...defaultSetup,
      discordUserName: prev.discordUserName || authUserName,
    }))
    setSetupError('')
    setIsConfigured(false)
    setGvgRunning(false)
    setGvgScope(null)
    setTimers(initialTimers)
  }

  const openDiscordLogin = async () => {
    const loginLink = authLoginUrl || 'https://videoalchemy.pl:3334/auth/discord/login'

    try {
      setLoginBusy(true)
      setLoginError('')
      await window.api?.openExternal?.(loginLink)
    } catch (error) {
      setLoginError(
        error instanceof Error ? error.message : 'Failed to open Discord login in browser.'
      )
    } finally {
      setLoginBusy(false)
    }
  }

  const handleLogout = async () => {
    try {
      setLogoutBusy(true)
      setSetupError('')
      if (authServerUrl && sessionToken) {
        await logoutAuth(authServerUrl, { 'X-Session-Token': sessionToken })
      }
    } catch {
      // Session may already be invalid server-side; continue local logout.
    } finally {
      setLogoutBusy(false)
      setSessionToken('')
      setAuthUserName('')
      setAuthIgn('')
      setAuthRoles([])
      setIsConfigured(false)
      setGvgRunning(false)
      setGvgScope(null)
      setStatusUserCooldowns(null)
      setSetup((prev) => ({
        ...prev,
        discordUserName: '',
      }))
    }
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

          {!sessionToken || authChecking ? (
            <WelcomeScreen
              loginError={loginError}
              loginBusy={loginBusy}
              onLogin={openDiscordLogin}
            />
          ) : !isConfigured ? (
            <InitialSetupScreen
              setup={setup}
              setupError={setupError}
              authUserName={setup.discordUserName || authUserName}
              authIgn={authIgn}
              isCommanderRole={isCommander}
              hasGuildWarRole={hasGuildWarRole}
              logoutBusy={logoutBusy}
              onLogout={handleLogout}
              onSetupChange={handleSetupChange}
              onSubmitSetup={submitSetup}
              onResetSetup={resetSetup}
            />
          ) : (
            <GvgStatusGate
              mode={isCommander ? 'Commander' : 'Member'}
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
                userName={requestUserName}
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
