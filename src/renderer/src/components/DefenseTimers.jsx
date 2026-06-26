import TimersScreen from './TimersScreen'
import JungleTimer from './JungleTimer'
import ExCooldownsGrid from './ExCooldownsGrid'
import CommanderHealcut from './CommanderHealcut'
import CommanderSprint from './CommanderSprint'
import CommanderCarrierDmg from './CommanderCarrierDmg'

function DefenseTimers(props) {
  const isSmall = props.commanderTimersSize === 'Small'
  const isOneRow = props.commanderTimersSize === 'One Row'

  return (
    <TimersScreen {...props} oneRowLayout={isOneRow}>
      <div className={isOneRow ? 'min-w-0 overflow-hidden flex items-center justify-center gap-1.5' : 'space-y-2'}>
      <JungleTimer
        gvgScope={props.gvgScope}
        ttsSettings={props.ttsSettings}
        oneRow={isOneRow}
      />
      <div className={isOneRow ? 'min-w-0 overflow-hidden flex items-center gap-1.5' : isSmall ? 'grid grid-cols-3 gap-2' : 'space-y-2'}>
        <CommanderHealcut
          gvgScope={props.gvgScope}
          serverUrl={props.serverUrl}
          postHeaders={props.postHeaders}
          ttsSettings={props.ttsSettings}
          canReset={props.isCommander}
          onResetSuccess={props.onRequestStatusRefresh}
          compact={isSmall}
          oneRow={isOneRow}
        />
        {isOneRow ? (
          <CommanderSprint
            gvgScope={props.gvgScope}
            serverUrl={props.serverUrl}
            postHeaders={props.postHeaders}
            canReset={props.isCommander}
            onResetSuccess={props.onRequestStatusRefresh}
            compact={isSmall}
            oneRow={isOneRow}
          />
        ) : null}
        <CommanderCarrierDmg
          gvgScope={props.gvgScope}
          serverUrl={props.serverUrl}
          postHeaders={props.postHeaders}
          canReset={props.isCommander}
          onResetSuccess={props.onRequestStatusRefresh}
          compact={isSmall}
          oneRow={isOneRow}
        />
      </div>
      </div>
      {!isOneRow ? (
        <ExCooldownsGrid
          userCooldowns={props.userCooldowns}
          team={props.team}
          visibleWeaponCodes={props.visibleExWeapons}
        />
      ) : null}
    </TimersScreen>
  )
}

export default DefenseTimers
