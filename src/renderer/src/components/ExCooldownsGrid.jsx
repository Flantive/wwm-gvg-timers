import { useEffect, useMemo, useState } from 'react'

const weaponLabelMap = {
  mo_blade: 'Mo Blade (suck)',
  ink_fan: 'Ink Fan (wall)',
  heal_fan: 'Heal Fan',
  twin_blades: 'Twin Blades',
}
const weaponOrder = ['mo_blade', 'heal_fan', 'ink_fan', 'twin_blades']
const weaponLabelColorMap = {
  mo_blade: 'text-orange-300',
  heal_fan: 'text-emerald-300',
  twin_blades: 'text-violet-300',
  ink_fan: 'text-sky-300',
}

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds))
  const min = Math.floor(safeSeconds / 60)
  const sec = safeSeconds % 60
  if (min === 0) {
    return `${sec}`
  }
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
    .sort((a, b) => {
      const aIndex = weaponOrder.indexOf(a.weaponCode)
      const bIndex = weaponOrder.indexOf(b.weaponCode)
      const safeA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex
      const safeB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex
      return safeA - safeB
    })
}

function ExCooldownsGrid({ userCooldowns, team, visibleWeaponCodes }) {
  const teamKey = typeof team === 'string' ? team.toLowerCase() : ''
  const teamCooldowns = userCooldowns?.[teamKey]
  const visibleSet = useMemo(
    () =>
      new Set(
        Array.isArray(visibleWeaponCodes)
          ? visibleWeaponCodes.map((item) => String(item))
          : weaponOrder
      ),
    [visibleWeaponCodes]
  )
  const parsedColumns = useMemo(
    () =>
      normalizeWeaponColumns(teamCooldowns).filter((column) =>
        visibleSet.has(column.weaponCode)
      ),
    [teamCooldowns, visibleSet]
  )
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
          <div
            className={`text-[11px] font-semibold truncate ${
              weaponLabelColorMap[column.weaponCode] ?? 'text-emerald-300'
            }`}
          >
            {column.label}
          </div>
          {column.players.map((player) => (
            <div key={`${column.weaponCode}-${player.playerName}`} className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-white/80 truncate">{player.playerName}</span>
              <span className={`text-[11px] font-mono tabular-nums ${player.cooldown <= 0 ? 'text-emerald-400' : 'text-white'}`}>
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
