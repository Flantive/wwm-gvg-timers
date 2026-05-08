import { useEffect, useMemo, useState } from 'react'

const weaponLabelMap = {
  mo_blade: 'Mo Blade (suck)',
  ink_fan: 'Ink Fan (wall)',
  twin_blades: 'Twin Blades',
}

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds))
  const min = Math.floor(safeSeconds / 60)
  const sec = safeSeconds % 60
  return `${min}:${sec < 10 ? '0' : ''}${sec}`
}

function normalizeWeaponColumns(teamCooldowns) {
  if (!teamCooldowns || typeof teamCooldowns !== 'object') {
    return []
  }

  return Object.entries(teamCooldowns)
    .map(([weaponCode, players]) => {
      if (!players || typeof players !== 'object') {
        return null
      }

      const playerRows = Object.entries(players).map(([playerName, cooldownValue]) => ({
        playerName,
        cooldown: Math.max(0, Math.floor(Number(cooldownValue) || 0)),
      }))

      if (playerRows.length === 0) {
        return null
      }

      playerRows.sort((a, b) => a.cooldown - b.cooldown)
      return {
        weaponCode,
        label: weaponLabelMap[weaponCode] ?? weaponCode,
        players: playerRows,
      }
    })
    .filter(Boolean)
}

function ExCooldownsGrid({ userCooldowns, team }) {
  const teamKey = typeof team === 'string' ? team.toLowerCase() : ''
  const teamCooldowns = userCooldowns?.[teamKey]
  const parsedColumns = useMemo(() => normalizeWeaponColumns(teamCooldowns), [teamCooldowns])
  const [columns, setColumns] = useState([])

  useEffect(() => {
    setColumns(parsedColumns)
  }, [parsedColumns])

  useEffect(() => {
    if (!columns.length) {
      return undefined
    }

    const id = setInterval(() => {
      setColumns((prev) =>
        prev.map((column) => ({
          ...column,
          players: column.players.map((player) => ({
            ...player,
            cooldown: Math.max(0, player.cooldown - 1),
          })),
        }))
      )
    }, 1000)

    return () => clearInterval(id)
  }, [columns.length])

  if (!columns.length) {
    return null
  }

  const maxColumns = Math.min(3, columns.length)

  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${maxColumns}, minmax(0, 1fr))`, WebkitAppRegion: 'no-drag' }}
    >
      {columns.map((column) => (
        <div key={column.weaponCode} className="bg-white/5 rounded-lg border border-white/10 p-2 space-y-1">
          <div className="text-[11px] text-emerald-300 font-semibold truncate">{column.label}</div>
          {column.players.map((player) => (
            <div key={`${column.weaponCode}-${player.playerName}`} className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-white/80 truncate">{player.playerName}</span>
              <span className={`text-[11px] font-mono tabular-nums ${player.cooldown <= 0 ? 'text-emerald-400' : 'text-sky-300'}`}>
                {player.cooldown <= 0 ? 'READY' : formatTime(player.cooldown)}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default ExCooldownsGrid
