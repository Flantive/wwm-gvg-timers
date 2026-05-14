import UpdateAvailableNotice from './UpdateAvailableNotice'

function WelcomeScreen({ loginError, loginBusy, onLogin, updateAvailable, latestVersion, onOpenUpdate }) {
  return (
    <div className="p-4 space-y-3" style={{ WebkitAppRegion: 'no-drag' }}>
      <UpdateAvailableNotice
        updateAvailable={updateAvailable}
        latestVersion={latestVersion}
        onOpenUpdate={onOpenUpdate}
      />

      <div className="bg-white/5 rounded-xl px-3 py-3 border border-white/10 space-y-2">
        <div className="text-sm font-semibold text-white">Welcome</div>
        <div className="text-xs text-white/70">
          Sign in with Discord to continue.
        </div>
        <button
          onClick={onLogin}
          disabled={loginBusy}
          className="w-full px-3 py-2 text-sm font-semibold rounded-lg border border-indigo-400/70 text-indigo-200 hover:bg-indigo-500/20 disabled:opacity-60 transition-colors"
        >
          Login with Discord
        </button>
      </div>

      {loginError ? (
        <div className="bg-white/5 rounded-xl px-3 py-2 border border-red-500/40 text-[11px] text-red-300">
          {loginError}
        </div>
      ) : null}
    </div>
  )
}

export default WelcomeScreen
