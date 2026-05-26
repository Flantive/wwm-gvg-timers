import { useEffect, useRef } from 'react'
import CommanderBuffTimer from './CommanderBuffTimer'
import { speakWithPreferredVoice } from '../services/tts'

function CommanderHealcut({
  gvgScope,
  serverUrl,
  postHeaders,
  canReset,
  onResetSuccess,
  compact,
  ttsSettings,
}) {
  const wasActiveRef = useRef(false)
  const initializedRef = useRef(false)

  const cooldownValue = Number(gvgScope?.commanderCooldownConfig?.healcut?.cooldown)
  const uptimeValue = Number(gvgScope?.commanderCooldownConfig?.healcut?.uptime)
  const remainingValue = Number(gvgScope?.commanderCooldowns?.healcut)
  const hasConfig = Number.isFinite(cooldownValue) && Number.isFinite(uptimeValue)
  const isActive =
    hasConfig &&
    Number.isFinite(remainingValue) &&
    remainingValue > cooldownValue - uptimeValue

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      wasActiveRef.current = isActive
      return
    }

    if (!wasActiveRef.current && isActive && ttsSettings?.healcutEnabled !== false) {
      speakWithPreferredVoice('Healcut enabled')
    }

    wasActiveRef.current = isActive
  }, [isActive, ttsSettings?.healcutEnabled])

  return (
    <CommanderBuffTimer
      gvgScope={gvgScope}
      serverUrl={serverUrl}
      postHeaders={postHeaders}
      buffField="healcut"
      label="Commander: Healcut"
      compactLabel="Healcut"
      compact={compact}
      canReset={canReset}
      onResetSuccess={onResetSuccess}
    />
  )
}

export default CommanderHealcut
