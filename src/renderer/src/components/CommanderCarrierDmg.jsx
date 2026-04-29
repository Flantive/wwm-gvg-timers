import CommanderBuffTimer from './CommanderBuffTimer'

function CommanderCarrierDmg({ gvgScope, serverUrl, postHeaders, canReset }) {
  return (
    <CommanderBuffTimer
      gvgScope={gvgScope}
      serverUrl={serverUrl}
      postHeaders={postHeaders}
      buffField="carrierdmg"
      label="Commander: Carrier DMG"
      canReset={canReset}
    />
  )
}

export default CommanderCarrierDmg
