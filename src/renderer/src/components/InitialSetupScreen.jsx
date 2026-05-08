import { useEffect, useRef, useState } from 'react'

const roleOptions = ['Commander', 'Member']
const teamOptions = ['Offense', 'Defense']
const commanderTimerSizeOptions = ['Big', 'Small']
const settingsTabs = ['General', 'Keybinds', 'Display']
const gearOptions = [
  { label: 'Mo Blade (suck)', code: 'mo_blade' },
  { label: 'Ink Fan (wall)', code: 'ink_fan' },
  { label: 'Twin Blades', code: 'twin_blades' },
]
const commanderKeybindConfigs = [
  { field: 'commanderHealcutKeybind', label: 'Command: Healcut', fallback: 'Numpad1' },
  { field: 'commanderSprintKeybind', label: 'Command: Sprint', fallback: 'Numpad2' },
  { field: 'commanderCarrierDmgKeybind', label: 'Command: Carrier DMG', fallback: 'Numpad3' },
]
const exSkillKeybindConfigs = [
  { field: 'firstWeaponKeybind', weaponField: 'firstWeapon', fallbackLabel: 'Weapon 1 EX', fallback: 'Numpad8' },
  { field: 'secondWeaponKeybind', weaponField: 'secondWeapon', fallbackLabel: 'Weapon 2 EX', fallback: 'Numpad9' },
]
const bindableFields = [...exSkillKeybindConfigs.map((item) => item.field), ...commanderKeybindConfigs.map((item) => item.field)]
const sanitizeAlphaNum = (value) => value.replace(/[^a-zA-Z0-9]/g, '')
const normalizeCooldownInput = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return 0
  }

  return Math.max(0, Math.floor(parsed))
}

function InitialSetupScreen({
  setup,
  setupError,
  onSetupChange,
  onSubmitSetup,
  onResetSetup,
}) {
  const isCommander = setup.mode === 'Commander'
  const [activeTab, setActiveTab] = useState('General')
  const [bindingTarget, setBindingTarget] = useState(null)
  const [keybindError, setKeybindError] = useState('')
  const [resetPhase, setResetPhase] = useState('idle')
  const [resetCountdown, setResetCountdown] = useState(3)
  const pressedKeysRef = useRef(new Set())
  const pendingComboRef = useRef([])
  const finalizeTimerRef = useRef(null)

  useEffect(() => {
    if (!bindingTarget) {
      return undefined
    }

    const clearFinalizeTimer = () => {
      if (finalizeTimerRef.current) {
        clearTimeout(finalizeTimerRef.current)
        finalizeTimerRef.current = null
      }
    }

    const onKeyDown = (event) => {
      event.preventDefault()

      if (event.code === 'Escape') {
        clearFinalizeTimer()
        setBindingTarget(null)
        return
      }

      if (!event.repeat) {
        pressedKeysRef.current.add(event.code)
      }

      pendingComboRef.current = Array.from(pressedKeysRef.current).slice(0, 2)
      clearFinalizeTimer()
      finalizeTimerRef.current = setTimeout(() => {
        const combo = pendingComboRef.current
        if (combo.length > 0) {
          const nextKeybind = combo.join('+')
          const hasDuplicate = bindableFields.some(
            (field) => field !== bindingTarget && setup[field] === nextKeybind
          )

          if (hasDuplicate) {
            setKeybindError('This keybind is already used by another action.')
          } else {
            setKeybindError('')
            onSetupChange(bindingTarget, nextKeybind)
          }
        }
        setBindingTarget(null)
      }, 250)
    }

    const onKeyUp = (event) => {
      pressedKeysRef.current.delete(event.code)
    }

    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp, true)

    return () => {
      clearFinalizeTimer()
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup', onKeyUp, true)
      pressedKeysRef.current.clear()
      pendingComboRef.current = []
    }
  }, [bindingTarget, onSetupChange, setup])

  useEffect(() => {
    if (resetPhase !== 'countdown') {
      return undefined
    }

    const id = setTimeout(() => {
      if (resetCountdown <= 1) {
        setResetPhase('confirm')
        return
      }

      setResetCountdown((prev) => prev - 1)
    }, 1000)

    return () => clearTimeout(id)
  }, [resetCountdown, resetPhase])

  useEffect(() => {
    if (resetPhase !== 'confirm') {
      return undefined
    }

    const id = setTimeout(() => {
      setResetPhase('idle')
      setResetCountdown(3)
    }, 5000)

    return () => clearTimeout(id)
  }, [resetPhase])

  const startBinding = (targetField) => {
    pressedKeysRef.current.clear()
    pendingComboRef.current = []
    setKeybindError('')
    setBindingTarget(targetField)
  }

  const bindButtonLabel = (targetField, value, fallback = 'Bind key') =>
    bindingTarget === targetField ? 'Press key(s)...' : value || fallback

  const getExKeybindLabel = (config) => {
    const selectedWeaponCode = setup?.[config.weaponField]
    const selectedWeapon = gearOptions.find((gear) => gear.code === selectedWeaponCode)
    if (!selectedWeapon) {
      return config.fallbackLabel
    }

    return `${selectedWeapon.label} EX`
  }

  const handleResetSettings = () => {
    if (resetPhase === 'idle') {
      setResetCountdown(3)
      setResetPhase('countdown')
      return
    }

    if (resetPhase === 'countdown') {
      return
    }

    onResetSetup()
    setResetPhase('idle')
    setResetCountdown(3)
  }

  return (
    <div className="space-y-0" style={{ WebkitAppRegion: 'no-drag' }}>
      <div className="p-4 space-y-2">
      <div className="px-1 pt-1">
        <div className="flex items-end gap-5">
          {settingsTabs.map((tabName) => {
            const selected = activeTab === tabName
            return (
              <button
                key={tabName}
                onClick={() => {
                  setActiveTab(tabName)
                  setKeybindError('')
                  setBindingTarget(null)
                }}
                className={`px-0 pb-1.5 text-xs font-semibold border-b-2 transition-colors ${
                  selected
                    ? 'border-emerald-400 text-emerald-300'
                    : 'border-transparent text-white/65 hover:text-white/85 hover:border-white/35'
                }`}
              >
                {tabName}
              </button>
            )
          })}
        </div>
      </div>

      {activeTab === 'General' ? (
        <>
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10 space-y-2">
            <label className="text-xs text-white/70 block">User Name</label>
            <input
              type="text"
              value={setup.userName}
              onChange={(event) => onSetupChange('userName', sanitizeAlphaNum(event.target.value))}
              pattern="[A-Za-z0-9]*"
              autoComplete="off"
              className="w-full px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-lg outline-none focus:border-sky-400/70"
              placeholder="Enter your name"
            />
          </div>

          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10 space-y-2">
            <div className="text-xs text-white/70">Mode</div>
            <div className="flex gap-2">
              {roleOptions.map((mode) => {
                const selected = setup.mode === mode
                return (
                  <button
                    key={mode}
                    onClick={() => onSetupChange('mode', mode)}
                    className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                      selected
                        ? '!border-emerald-400 !text-emerald-300'
                        : 'bg-white/10 border-white/20 text-white/80 hover:bg-white/15'
                    }`}
                  >
                    {mode}
                  </button>
                )
              })}
            </div>
          </div>

          {isCommander ? (
            <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10 space-y-2">
              <label className="text-xs text-white/70 block">Commander API Key</label>
              <input
                type="text"
                value={setup.apiKey}
                onChange={(event) => onSetupChange('apiKey', sanitizeAlphaNum(event.target.value))}
                pattern="[A-Za-z0-9]*"
                autoComplete="off"
                className="w-full px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-lg outline-none focus:border-sky-400/70"
                placeholder="Paste API key for POST requests"
              />
            </div>
          ) : null}

          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10 space-y-2">
            <div className="text-xs text-white/70">Team</div>
            <div className="flex gap-2">
              {teamOptions.map((team) => {
                const selected = setup.team === team
                return (
                  <button
                    key={team}
                    onClick={() => onSetupChange('team', team)}
                    className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                      selected
                        ? '!border-emerald-400 !text-emerald-300'
                        : 'bg-white/10 border-white/20 text-white/80 hover:bg-white/15'
                    }`}
                  >
                    {team}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs text-white/70">
              <span>Important EX skills</span>
              <span>Cooldown</span>
            </div>
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="grid grid-cols-[14px_1fr_76px] gap-2 items-center">
                  <span className="text-[11px] text-white/60 text-left">1.</span>
                  <div className="relative">
                    <select
                      value={setup.firstWeapon}
                      onChange={(event) => onSetupChange('firstWeapon', event.target.value)}
                      className="w-full appearance-none px-3 pr-8 py-2 text-sm text-white bg-white/10 border border-white/20 rounded-lg outline-none focus:border-sky-400/70"
                    >
                      <option value="" className="text-white bg-zinc-900">
                        Not selected
                      </option>
                      {gearOptions.map((gear) => (
                        <option
                          key={gear.code}
                          value={gear.code}
                          disabled={gear.code === setup.secondWeapon}
                          className={
                            gear.code === setup.secondWeapon
                              ? 'text-zinc-500 bg-zinc-800'
                              : 'text-white bg-zinc-900'
                          }
                        >
                          {gear.label}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/70 text-[10px]">
                      v
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={setup.firstWeaponCooldown}
                    onChange={(event) =>
                      onSetupChange('firstWeaponCooldown', normalizeCooldownInput(event.target.value))
                    }
                    className="w-full px-2 py-2 text-xs text-white bg-white/10 border border-white/20 rounded-lg outline-none focus:border-sky-400/70"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="grid grid-cols-[14px_1fr_76px] gap-2 items-center">
                  <span className="text-[11px] text-white/60 text-left">2.</span>
                  <div className="relative">
                    <select
                      value={setup.secondWeapon}
                      onChange={(event) => onSetupChange('secondWeapon', event.target.value)}
                      className="w-full appearance-none px-3 pr-8 py-2 text-sm text-white bg-white/10 border border-white/20 rounded-lg outline-none focus:border-sky-400/70"
                    >
                      <option value="" className="text-white bg-zinc-900">
                        Not selected
                      </option>
                      {gearOptions.map((gear) => (
                        <option
                          key={gear.code}
                          value={gear.code}
                          disabled={gear.code === setup.firstWeapon}
                          className={
                            gear.code === setup.firstWeapon
                              ? 'text-zinc-500 bg-zinc-800'
                              : 'text-white bg-zinc-900'
                          }
                        >
                          {gear.label}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/70 text-[10px]">
                      v
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={setup.secondWeaponCooldown}
                    onChange={(event) =>
                      onSetupChange('secondWeaponCooldown', normalizeCooldownInput(event.target.value))
                    }
                    className="w-full px-2 py-2 text-xs text-white bg-white/10 border border-white/20 rounded-lg outline-none focus:border-sky-400/70"
                  />
                </div>
              </div>
            </div>
          </div>

        </>
      ) : activeTab === 'Keybinds' ? (
        <div className="space-y-2">
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10 space-y-2">
            <div className="grid grid-cols-[1fr_140px] gap-2 text-[11px] text-white/60">
              <span>Action</span>
              <span className="text-right">Keybind</span>
            </div>
            <div className="space-y-1">
              {commanderKeybindConfigs.map((config) => (
                <div key={config.field} className="grid grid-cols-[1fr_140px] gap-2 items-center">
                  <span className="text-sm text-white">{config.label}</span>
                  <button
                    onClick={() => startBinding(config.field)}
                    className={`w-full px-2 py-2 text-[11px] font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                      bindingTarget === config.field
                        ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                        : 'border-white/20 text-white/80 bg-white/10 hover:bg-white/15'
                    }`}
                  >
                    {bindButtonLabel(config.field, setup[config.field], config.fallback)}
                  </button>
                </div>
              ))}
              {exSkillKeybindConfigs.map((config) => (
                <div key={config.field} className="grid grid-cols-[1fr_140px] gap-2 items-center">
                  <span className="text-sm text-white">{getExKeybindLabel(config)}</span>
                  <button
                    onClick={() => startBinding(config.field)}
                    className={`w-full px-2 py-2 text-[11px] font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                      bindingTarget === config.field
                        ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                        : 'border-white/20 text-white/80 bg-white/10 hover:bg-white/15'
                    }`}
                  >
                    {bindButtonLabel(config.field, setup[config.field], config.fallback)}
                  </button>
                </div>
              ))}
            </div>
            {keybindError ? <div className="text-[11px] text-red-300">{keybindError}</div> : null}
          </div>
          <div className="text-[11px] text-amber-200 border border-amber-400/40 rounded-lg px-2.5 py-2 bg-amber-500/10">
            While this app is running, keys assigned to keybinds are reserved and will not work in
            other windows. Close the app to restore normal key behavior.
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10 space-y-2">
            <div className="text-xs text-white/70">Commander Timers</div>
            <div className="flex gap-2">
              {commanderTimerSizeOptions.map((sizeOption) => {
                const selected = setup.commanderTimersSize === sizeOption
                return (
                  <button
                    key={sizeOption}
                    onClick={() => onSetupChange('commanderTimersSize', sizeOption)}
                    className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                      selected
                        ? '!border-emerald-400 !text-emerald-300'
                        : 'bg-white/10 border-white/20 text-white/80 hover:bg-white/15'
                    }`}
                  >
                    {sizeOption}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10">
            <label className="flex items-center gap-2 text-xs text-white/80">
              <input
                type="checkbox"
                checked={Boolean(setup.showTeamExCooldowns)}
                onChange={(event) => onSetupChange('showTeamExCooldowns', event.target.checked)}
                className="h-4 w-4 accent-emerald-400"
              />
              <span>Show EX cooldowns of your team</span>
            </label>
          </div>

          <div className="bg-zinc-900 rounded-xl px-3 py-2 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs text-white/70">
              <span>App Transparency</span>
              <span>{setup.transparency}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={setup.transparency}
              onChange={(event) => onSetupChange('transparency', Number(event.target.value))}
              className="w-full accent-emerald-400"
            />
          </div>
        </div>
      )}

      {setupError ? (
        <div className="bg-white/5 rounded-xl px-3 py-2 border border-red-500/40 text-[11px] text-red-300">
          {setupError}
        </div>
      ) : null}
      </div>

      <div
        className="p-3 border-t border-white/10 flex items-center justify-between"
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        <button
          onClick={handleResetSettings}
          disabled={resetPhase === 'countdown'}
          className={`px-3 py-1.5 text-xs font-semibold bg-transparent border rounded-lg transition-colors ${
            resetPhase === 'confirm'
              ? 'border-red-400 text-red-200 hover:bg-red-500/20'
              : 'border-red-500/50 text-red-300 hover:bg-red-500/10'
          } ${resetPhase === 'countdown' ? 'opacity-80 cursor-not-allowed' : ''}`}
        >
          {resetPhase === 'countdown'
            ? `Confirm in ${resetCountdown}...`
            : resetPhase === 'confirm'
              ? 'Confirm Reset'
              : 'Reset Settings'}
        </button>
        <button
          onClick={onSubmitSetup}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-400/70 text-emerald-200 hover:bg-emerald-500/20 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

export default InitialSetupScreen
