function UpdateAvailableNotice({ updateAvailable, latestVersion, onOpenUpdate }) {
  if (!updateAvailable) {
    return null
  }

  return (
    <div className="bg-amber-500/10 rounded-xl px-3 py-2 border border-amber-400/40 flex items-center justify-between gap-2">
      <div className="text-[11px] text-amber-200">
        Update available: {latestVersion || 'new version'}
      </div>
      <button
        onClick={onOpenUpdate}
        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-amber-300/60 text-amber-100 hover:bg-amber-400/15 transition-colors"
      >
        Update
      </button>
    </div>
  )
}

export default UpdateAvailableNotice
