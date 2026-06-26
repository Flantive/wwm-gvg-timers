import CommanderBuffTimer from './CommanderBuffTimer'
import siegeIcon from '../assets/siege.png'

function CommanderCarrierDmg({ gvgScope, serverUrl, postHeaders, canReset, onResetSuccess, compact, oneRow }) {
  return (
    <CommanderBuffTimer
      gvgScope={gvgScope}
      serverUrl={serverUrl}
      postHeaders={postHeaders}
      buffField="carrierdmg"
      label="Commander: Siege DMG"
      compactLabel="Siege DMG"
      compact={compact}
      oneRow={oneRow}
      iconSrc={siegeIcon}
      canReset={canReset}
      onResetSuccess={onResetSuccess}
    />
  )
}

export default CommanderCarrierDmg
