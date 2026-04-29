const roleOptions = ['Commander', 'Member']
const teamOptions = ['Offense', 'Defense']
const gearOptions = ['Mo blade', 'Ink Fan', 'Heal Umbrella', 'Twin Blades']

function InitialSetupScreen({
  setup,
  setupError,
  onSetupChange,
  onToggleGear,
  onSubmitSetup,
  onResetSetup,
}) {
  const isCommander = setup.mode === 'Commander'

  return (
    <div className="p-4 space-y-2" style={{ WebkitAppRegion: 'no-drag' }}>
      <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10 space-y-2">
        <label className="text-xs text-white/70 block">User Name</label>
        <input
          type="text"
          value={setup.userName}
          onChange={(event) => onSetupChange('userName', event.target.value)}
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
            onChange={(event) => onSetupChange('apiKey', event.target.value)}
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
        <div className="text-xs text-white/70">Pick 2 options</div>
        <div className="grid grid-cols-3 gap-2">
          {gearOptions.map((gear) => {
            const selected = setup.selectedGear.includes(gear)
            const blocked = !selected && setup.selectedGear.length >= 2
            return (
              <button
                key={gear}
                onClick={() => onToggleGear(gear)}
                disabled={blocked}
                className={`px-2 py-2 text-[11px] font-semibold rounded-lg border transition-colors ${
                  selected
                    ? '!border-emerald-400 !text-emerald-300'
                    : 'bg-white/10 border-white/20 text-white/80 hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
              >
                {gear}
              </button>
            )
          })}
        </div>
        <div className={`text-[11px] ${setup.selectedGear.length === 2 ? 'text-emerald-300' : 'text-white/60'}`}>
          {setup.selectedGear.length}/2 selected
        </div>
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
