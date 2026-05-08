import CommanderBuffTimer from './CommanderBuffTimer'

function CommanderCarrierDmg({ gvgScope, serverUrl, postHeaders, canReset, onResetSuccess, compact }) {
  return (
    <CommanderBuffTimer
      gvgScope={gvgScope}
      serverUrl={serverUrl}
      postHeaders={postHeaders}
      buffField="carrierdmg"
      label="Commander: Carrier DMG"
      compactLabel="Carrier DMG"
      compact={compact}
      canReset={canReset}
      onResetSuccess={onResetSuccess}
    />
  )
}

export default CommanderCarrierDmg
