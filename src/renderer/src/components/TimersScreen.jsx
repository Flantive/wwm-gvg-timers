import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { resetCommanderBuff, resetGvg, submitExCooldown } from '../services/serverApi'

function TimersScreen({
  gvgScope,
  serverUrl,
  postHeaders,
  isCommander,
  team,
  userName,
  commanderBuffKeybinds,
  exHotkeyActions,
  localHotkeyBindings,
  onRequestStatusRefresh,
  onOpenSettings,
  children,
}) {
  const [syncError, setSyncError] = useState('')
  const [resetPhase, setResetPhase] = useState('idle')
  const [countdownValue, setCountdownValue] = useState(3)
  const inFlightFieldsRef = useRef(new Set())
  const enabledCommanderFields = useMemo(
    () =>
      new Set(
        Object.entries({
          healcut: commanderBuffKeybinds?.healcut,
          sprint: commanderBuffKeybinds?.sprint,
          carrierdmg: commanderBuffKeybinds?.carrierdmg,
        })
          .filter(([, keybind]) => typeof keybind === 'string' && keybind.trim().length > 0)
          .map(([field]) => field)
      ),
    [commanderBuffKeybinds]
  )
  const enabledExActionFields = useMemo(
    () =>
      new Set(
        Object.entries(exHotkeyActions ?? {})
          .filter(([, action]) => {
            const weaponCode = action?.weaponCode
            return typeof weaponCode === 'string' && weaponCode.trim().length > 0
          })
          .map(([field]) => field)
      ),
    [exHotkeyActions]
  )
  const normalizedHotkeyBindings = useMemo(() => {
    const entries = Object.entries(localHotkeyBindings ?? {})
      .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
      .map(([field, value]) => {
        const parts = value
          .split('+')
          .map((part) => part.trim())
          .filter(Boolean)
          .slice(0, 2)
        return [field, Array.from(new Set(parts))]
      })
      .filter(([, parts]) => parts.length > 0)

    return Object.fromEntries(entries)
  }, [localHotkeyBindings])

  const executeHotkeyField = useCallback(
    (field) => {
      if (!field || inFlightFieldsRef.current.has(field)) {
        return
      }

      // Commander buff reset actions.
      if (enabledCommanderFields.has(field) && isCommander) {
        const remaining = Number(gvgScope?.commanderCooldowns?.[field])
        const isReady = Number.isFinite(remaining) && remaining <= 0
        if (!isReady) {
          return
        }

        inFlightFieldsRef.current.add(field)
        void resetCommanderBuff(serverUrl, field, postHeaders?.() ?? {})
          .then(() => {
            setSyncError('')
            onRequestStatusRefresh?.()
          })
          .catch(() => {
            setSyncError(`Syncing error: failed to reset commander buff (${field}).`)
          })
          .finally(() => {
            inFlightFieldsRef.current.delete(field)
          })
        return
      }

      // EX cooldown submit actions.
      if (enabledExActionFields.has(field)) {
        const selectedAction = exHotkeyActions?.[field]
        const weaponCode = selectedAction?.weaponCode
        const weaponCooldown = Number(selectedAction?.weaponCooldown)
        const trimmedUserName = typeof userName === 'string' ? userName.trim() : ''
        const teamLower = typeof team === 'string' ? team.toLowerCase() : ''

        if (
          !weaponCode ||
          !trimmedUserName ||
          (teamLower !== 'offense' && teamLower !== 'defense') ||
          !Number.isFinite(weaponCooldown)
        ) {
          return
        }

        inFlightFieldsRef.current.add(field)
        void submitExCooldown(
          serverUrl,
          {
            team: teamLower,
            userName: trimmedUserName,
            weaponCode,
            weaponCooldown: Math.max(0, Math.floor(weaponCooldown)),
          },
          postHeaders?.() ?? {}
        )
          .then(() => {
            setSyncError('')
            onRequestStatusRefresh?.()
          })
          .catch(() => {
            setSyncError('Syncing error: failed to submit EX cooldown.')
          })
          .finally(() => {
            inFlightFieldsRef.current.delete(field)
          })
      }
    },
    [
      enabledCommanderFields,
      enabledExActionFields,
      exHotkeyActions,
      gvgScope,
      isCommander,
      onRequestStatusRefresh,
      postHeaders,
      serverUrl,
      team,
      userName,
    ]
  )

  useEffect(() => {
    if (resetPhase !== 'countdown') {
      return undefined
    }

    const id = setTimeout(() => {
      if (countdownValue <= 1) {
        setResetPhase('confirm')
      } else {
        setCountdownValue((prev) => prev - 1)
      }
    }, 1000)

    return () => clearTimeout(id)
  }, [countdownValue, resetPhase])

  useEffect(() => {
    if (resetPhase !== 'confirm') {
      return undefined
    }

    const id = setTimeout(() => {
      setResetPhase('idle')
    }, 5000)

    return () => clearTimeout(id)
  }, [resetPhase])

  useEffect(() => {
    const hasCommanderActions = isCommander && enabledCommanderFields.size > 0
    const hasExActions = enabledExActionFields.size > 0

    if (!hasCommanderActions && !hasExActions) {
      return undefined
    }

    if (!window.api?.onCommanderHotkey) {
      return undefined
    }

    const onCommanderHotkey = (payload) => {
      const field = typeof payload?.field === 'string' ? payload.field : ''
      executeHotkeyField(field)
    }

    const unsubscribe = window.api.onCommanderHotkey(onCommanderHotkey)
    return () => {
      inFlightFieldsRef.current.clear()
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [
    enabledCommanderFields,
    enabledExActionFields,
    executeHotkeyField,
  ])

  useEffect(() => {
    const hasCommanderActions = isCommander && enabledCommanderFields.size > 0
    const hasExActions = enabledExActionFields.size > 0

    if (!hasCommanderActions && !hasExActions) {
      return undefined
    }

    const pressedCodes = new Set()
    const activeLocalFields = new Set()

    const isTypingTarget = (target) => {
      if (!target || !(target instanceof HTMLElement)) {
        return false
      }
      const tagName = target.tagName
      return (
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT' ||
        target.isContentEditable
      )
    }

    const onKeyDown = (event) => {
      if (isTypingTarget(event.target)) {
        return
      }

      const code = String(event.code || '')
      if (!code) {
        return
      }

      pressedCodes.add(code)

      for (const [field, parts] of Object.entries(normalizedHotkeyBindings)) {
        if (!Array.isArray(parts) || parts.length === 0) {
          continue
        }

        const matches = parts.every((part) => pressedCodes.has(part))
        if (!matches) {
          continue
        }

        if (activeLocalFields.has(field)) {
          continue
        }

        activeLocalFields.add(field)
        executeHotkeyField(field)
      }
    }

    const onKeyUp = (event) => {
      const code = String(event.code || '')
      if (code) {
        pressedCodes.delete(code)
      }

      for (const [field, parts] of Object.entries(normalizedHotkeyBindings)) {
        if (!Array.isArray(parts) || parts.length === 0) {
          continue
        }

        const stillActive = parts.every((part) => pressedCodes.has(part))
        if (!stillActive) {
          activeLocalFields.delete(field)
        }
      }
    }

    const onWindowBlur = () => {
      pressedCodes.clear()
      activeLocalFields.clear()
    }

    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp, true)
    window.addEventListener('blur', onWindowBlur)

    return () => {
      pressedCodes.clear()
      activeLocalFields.clear()
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup', onKeyUp, true)
      window.removeEventListener('blur', onWindowBlur)
    }
  }, [
    enabledCommanderFields,
    enabledExActionFields,
    executeHotkeyField,
    isCommander,
    normalizedHotkeyBindings,
  ])

  const resetGvgFromServer = async () => {
    if (resetPhase === 'idle') {
      setCountdownValue(3)
      setResetPhase('countdown')
      return
    }

    if (resetPhase !== 'confirm') {
      return
    }

    try {
      await resetGvg(serverUrl, postHeaders?.() ?? {})
      setSyncError('')
      setResetPhase('idle')
      onRequestStatusRefresh?.()
    } catch {
      setSyncError('Syncing error: failed to reset GvG.')
      setResetPhase('idle')
    }
  }

  return (
    <>
      {syncError ? (
        <div className="px-3 py-1 text-[11px] text-red-300 bg-red-950/30 border-b border-red-500/40">
          {syncError}
        </div>
      ) : null}

      <div className="p-4 space-y-2 max-h-[420px] overflow-y-auto">
        {children}
      </div>

      <div
        className={`p-3 border-t border-white/10 flex items-center ${isCommander ? 'justify-between' : 'justify-start'}`}
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        <button
          onClick={onOpenSettings}
          className="w-10 h-10 p-1.5 flex items-center justify-center text-white/70 border border-white/20 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Open settings"
          title="Settings"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10.6 3.6h2.8l.5 2a6.8 6.8 0 0 1 1.7.7l1.8-1 2 2-1 1.8c.3.5.5 1.1.7 1.7l2 .5v2.8l-2 .5a6.8 6.8 0 0 1-.7 1.7l1 1.8-2 2-1.8-1a6.8 6.8 0 0 1-1.7.7l-.5 2h-2.8l-.5-2a6.8 6.8 0 0 1-1.7-.7l-1.8 1-2-2 1-1.8a6.8 6.8 0 0 1-.7-1.7l-2-.5v-2.8l2-.5a6.8 6.8 0 0 1 .7-1.7l-1-1.8 2-2 1.8 1c.5-.3 1.1-.5 1.7-.7z" />
            <circle cx="12" cy="12" r="2.6" />
          </svg>
        </button>
        {isCommander ? (
          <button
            onClick={resetGvgFromServer}
            className={`px-3 py-1.5 text-xs font-semibold bg-transparent border rounded-lg transition-colors ${
              resetPhase === 'confirm'
                ? 'text-red-200 border-red-400 hover:bg-red-500/20'
                : 'text-red-400 border-red-500/50 hover:bg-red-500/10'
            }`}
          >
            {resetPhase === 'countdown'
              ? `Confirm in ${countdownValue}`
              : resetPhase === 'confirm'
                ? 'Confirm Reset'
                : 'Reset GvG'}
          </button>
        ) : null}
      </div>
    </>
  )
}

export default TimersScreen
