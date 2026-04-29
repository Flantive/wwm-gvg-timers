import { useEffect, useRef, useState } from 'react'

const roleOptions = ['Commander', 'Member']
const teamOptions = ['Offense', 'Defense']
const gearOptions = [
  { label: 'Mo blade', code: 'mo_blade' },
  { label: 'Ink Fan', code: 'ink_fan' },
  { label: 'Heal Umbrella', code: 'heal_umbrella' },
  { label: 'Twin Blades', code: 'twin_blades' },
]
const sanitizeAlphaNum = (value) => value.replace(/[^a-zA-Z0-9]/g, '')

function InitialSetupScreen({
  setup,
  setupError,
  onSetupChange,
  onSubmitSetup,
  onResetSetup,
}) {
  const isCommander = setup.mode === 'Commander'
  const [bindingTarget, setBindingTarget] = useState(null)
  const [keybindError, setKeybindError] = useState('')
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
          const siblingKeybind =
            bindingTarget === 'firstWeaponKeybind'
              ? setup.secondWeaponKeybind
              : setup.firstWeaponKeybind

          if (siblingKeybind && nextKeybind === siblingKeybind) {
            setKeybindError('This keybind is already used by the other weapon.')
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
  }, [bindingTarget, onSetupChange, setup.firstWeaponKeybind, setup.secondWeaponKeybind])

  const startBinding = (targetField) => {
    pressedKeysRef.current.clear()
    pendingComboRef.current = []
    setKeybindError('')
    setBindingTarget(targetField)
  }

  const bindButtonLabel = (targetField, value) =>
    bindingTarget === targetField ? 'Press key(s)...' : value || 'Bind key'

  return (
    <div className="p-4 space-y-2" style={{ WebkitAppRegion: 'no-drag' }}>
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

      <div className="hidden bg-white/5 rounded-xl px-3 py-2 border border-white/10 space-y-2">
        <div className="text-xs text-white/70">Important EX skills</div>
        <div className="space-y-2">
          <div className="grid grid-cols-[14px_1fr_120px] gap-2 text-[11px] text-white/60">
            <span />
            <span>Weapon selection</span>
            <span className="text-right">Keybind selection</span>
          </div>

          <div className="space-y-1">
            <div className="grid grid-cols-[14px_1fr_120px] gap-2 items-center">
              <span className="text-[11px] text-white/60 text-left">1.</span>
              <div className="relative">
                <select
                  value={setup.firstWeapon}
                  onChange={(event) => onSetupChange('firstWeapon', event.target.value)}
                  className="w-full appearance-none px-3 pr-8 py-2 text-sm text-white bg-white/10 border border-white/20 rounded-lg outline-none focus:border-sky-400/70"
                >
                  <option value="" className="text-black bg-white">
                    Not selected
                  </option>
                  {gearOptions.map((gear) => (
                    <option
                      key={gear.code}
                      value={gear.code}
                      disabled={gear.code === setup.secondWeapon}
                      className="text-black bg-white"
                    >
                      {gear.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/70 text-[10px]">
                  ▼
                </span>
              </div>
              <button
                onClick={() => startBinding('firstWeaponKeybind')}
                className={`w-full px-2 py-2 text-[11px] font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                  bindingTarget === 'firstWeaponKeybind'
                    ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                    : 'border-white/20 text-white/80 bg-white/10 hover:bg-white/15'
                }`}
              >
                {bindButtonLabel('firstWeaponKeybind', setup.firstWeaponKeybind)}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <div className="grid grid-cols-[14px_1fr_120px] gap-2 items-center">
              <span className="text-[11px] text-white/60 text-left">2.</span>
              <div className="relative">
                <select
                  value={setup.secondWeapon}
                  onChange={(event) => onSetupChange('secondWeapon', event.target.value)}
                  className="w-full appearance-none px-3 pr-8 py-2 text-sm text-white bg-white/10 border border-white/20 rounded-lg outline-none focus:border-sky-400/70"
                >
                  <option value="" className="text-black bg-white">
                    Not selected
                  </option>
                  {gearOptions.map((gear) => (
                    <option
                      key={gear.code}
                      value={gear.code}
                      disabled={gear.code === setup.firstWeapon}
                      className="text-black bg-white"
                    >
                      {gear.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/70 text-[10px]">
                  ▼
                </span>
              </div>
              <button
                onClick={() => startBinding('secondWeaponKeybind')}
                className={`w-full px-2 py-2 text-[11px] font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                  bindingTarget === 'secondWeaponKeybind'
                    ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                    : 'border-white/20 text-white/80 bg-white/10 hover:bg-white/15'
                }`}
              >
                {bindButtonLabel('secondWeaponKeybind', setup.secondWeaponKeybind)}
              </button>
            </div>
          </div>

          {keybindError ? (
            <div className="text-[11px] text-red-300">{keybindError}</div>
          ) : null}
        </div>
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

      {setupError ? (
        <div className="bg-white/5 rounded-xl px-3 py-2 border border-red-500/40 text-[11px] text-red-300">
          {setupError}
        </div>
      ) : null}

      <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10 flex items-center justify-between">
        <button
          onClick={onResetSetup}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-500/50 text-red-300 hover:bg-red-500/10 transition-colors"
        >
          Reset Settings
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
