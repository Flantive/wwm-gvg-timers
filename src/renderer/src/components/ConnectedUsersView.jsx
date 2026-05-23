const weaponMeta = {
  mo_blade: { label: 'Mo Blade (suck)', color: 'text-orange-300' },
  heal_fan: { label: 'Heal Fan', color: 'text-emerald-300' },
  twin_blades: { label: 'Twin Blades', color: 'text-violet-300' },
  ink_fan: { label: 'Ink Fan (wall)', color: 'text-sky-300' },
}

function normalizeConnectedUsers(gvgScope) {
  const source = gvgScope?.connectedUsers
  const entries = Array.isArray(source)
    ? source
    : source && typeof source === 'object'
      ? Object.values(source)
      : []

  const normalized = entries
    .map((entry) => {
      const userName =
        typeof entry?.userName === 'string' && entry.userName.trim()
          ? entry.userName.trim()
          : 'Unknown user'
      const teamValue =
        typeof entry?.team === 'string' ? entry.team.trim().toLowerCase() : ''
      const team = teamValue === 'defense' ? 'defense' : 'offense'
      const weapons = [entry?.weapon1, entry?.weapon2]
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean)
      const uniqueWeapons = Array.from(new Set(weapons))

      return {
        userName,
        team,
        weapons: uniqueWeapons,
      }
    })
    .filter((item) => item.userName)

  normalized.sort((left, right) => {
    if (right.weapons.length !== left.weapons.length) {
      return right.weapons.length - left.weapons.length
    }
    return left.userName.localeCompare(right.userName, undefined, { sensitivity: 'base' })
  })

  return {
    offense: normalized.filter((item) => item.team === 'offense'),
    defense: normalized.filter((item) => item.team === 'defense'),
  }
}

function WeaponIcon({ weaponCode }) {
  const meta = weaponMeta[weaponCode]
  if (!meta) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded border border-white/20 text-white/65">
        {weaponCode}
      </span>
    )
  }

  if (weaponCode === 'mo_blade') {
    return (
      <span title={meta.label} className={`inline-flex ${meta.color}`}>
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
          <path d="M12 2l7 3v6c0 5.2-3.3 9.3-7 11-3.7-1.7-7-5.8-7-11V5l7-3z" />
        </svg>
      </span>
    )
  }

  if (weaponCode === 'heal_fan') {
    return (
      <span title={meta.label} className={`inline-flex ${meta.color}`}>
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
          <path d="M12 3c2.3 1.4 4.2 3.2 5.5 5.5C19 11.2 19 14 17.5 16.3 15.8 19 13.2 20.5 12 21c-1.2-.5-3.8-2-5.5-4.7C5 14 5 11.2 6.5 8.5 7.8 6.2 9.7 4.4 12 3z" />
          <path d="M9 12h6v1.8H9zM11.1 9.9h1.8v6h-1.8z" fill="black" fillOpacity=".2" />
        </svg>
      </span>
    )
  }

  if (weaponCode === 'twin_blades') {
    return (
      <span title={meta.label} className={`inline-flex ${meta.color}`}>
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
          <path d="M6 2.2L4 4.2l2.4 2.4 2-2zM8.6 7.2l2.2 2.2-6.1 6.1V18h2.5l6.1-6.1 2.2 2.2 1.6-1.6L10.2 5.6z" />
          <path d="M18 2.2l2 2-2.4 2.4-2-2zM15.4 7.2l-2.2 2.2 6.1 6.1V18h-2.5l-6.1-6.1-2.2 2.2-1.6-1.6 6.9-6.9z" />
        </svg>
      </span>
    )
  }

  return (
    <span title={meta.label} className={`inline-flex ${meta.color}`}>
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
        <path d="M4 17v-2.6c0-4.3 3.5-7.8 7.8-7.8h8.2v10.4z" />
        <path d="M4 17h16v2.4H4z" />
        <path d="M10.3 9.2l2.2 2.2M8.8 11.1l2.2 2.2M7.4 13l2.2 2.2" stroke="black" strokeOpacity=".2" strokeWidth="1" fill="none" />
      </svg>
    </span>
  )
}

function TeamSection({ title, users }) {
  return (
    <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10 space-y-2">
      <div className="text-xs font-semibold text-white/75 text-center">{title}</div>
      {users.length ? (
        <div className="space-y-1.5">
          {users.map((user) => (
            <div key={`${title}-${user.userName}`} className="flex items-center justify-between gap-2">
              <span className="text-sm text-white/85 truncate">{user.userName}</span>
              <div className="flex items-center gap-1.5 min-h-4">
                {user.weapons.length ? (
                  user.weapons.map((weaponCode) => (
                    <WeaponIcon key={`${user.userName}-${weaponCode}`} weaponCode={weaponCode} />
                  ))
                ) : (
                  <span className="text-[10px] text-white/40">no weapons</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-white/45">No connected users.</div>
      )}
    </div>
  )
}

function ConnectedUsersView({ gvgScope }) {
  const grouped = normalizeConnectedUsers(gvgScope)

  return (
    <div className="space-y-2">
      <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/10">
        <div className="text-sm font-semibold text-white text-center">Conected Users</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <TeamSection title="Offense" users={grouped.offense} />
        <TeamSection title="Defense" users={grouped.defense} />
      </div>
    </div>
  )
}

export default ConnectedUsersView
