import TimersScreen from './TimersScreen'
import JungleTimer from './JungleTimer'
import ExCooldownsGrid from './ExCooldownsGrid'
import CommanderHealcut from './CommanderHealcut'
import CommanderSprint from './CommanderSprint'
import CommanderCarrierDmg from './CommanderCarrierDmg'

function OffenseTimers(props) {
  const isSmall = props.commanderTimersSize === 'Small'

  return (
    <TimersScreen {...props}>
      <JungleTimer gvgScope={props.gvgScope} />
      <div className={isSmall ? 'grid grid-cols-3 gap-2' : 'space-y-2'}>
        <CommanderHealcut
          gvgScope={props.gvgScope}
          serverUrl={props.serverUrl}
          postHeaders={props.postHeaders}
          canReset={props.isCommander}
          onResetSuccess={props.onRequestStatusRefresh}
          compact={isSmall}
        />
        <CommanderSprint
          gvgScope={props.gvgScope}
          serverUrl={props.serverUrl}
          postHeaders={props.postHeaders}
          canReset={props.isCommander}
          onResetSuccess={props.onRequestStatusRefresh}
          compact={isSmall}
        />
        <CommanderCarrierDmg
          gvgScope={props.gvgScope}
          serverUrl={props.serverUrl}
          postHeaders={props.postHeaders}
          canReset={props.isCommander}
          onResetSuccess={props.onRequestStatusRefresh}
          compact={isSmall}
        />
      </div>
      <ExCooldownsGrid
        userCooldowns={props.userCooldowns}
        team={props.team}
        visibleWeaponCodes={props.visibleExWeapons}
      />
    </TimersScreen>
  )
}

export default OffenseTimers
