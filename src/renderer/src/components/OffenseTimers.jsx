import TimersScreen from './TimersScreen'
import JungleTimer from './JungleTimer'
import CommanderHealcut from './CommanderHealcut'
import CommanderSprint from './CommanderSprint'
import CommanderCarrierDmg from './CommanderCarrierDmg'

function OffenseTimers(props) {
  return (
    <TimersScreen {...props}>
      <JungleTimer gvgScope={props.gvgScope} />
      <CommanderHealcut
        gvgScope={props.gvgScope}
        serverUrl={props.serverUrl}
        postHeaders={props.postHeaders}
        canReset={props.isCommander}
      />
      <CommanderSprint
        gvgScope={props.gvgScope}
        serverUrl={props.serverUrl}
        postHeaders={props.postHeaders}
        canReset={props.isCommander}
      />
      <CommanderCarrierDmg
        gvgScope={props.gvgScope}
        serverUrl={props.serverUrl}
        postHeaders={props.postHeaders}
        canReset={props.isCommander}
      />
    </TimersScreen>
  )
}

export default OffenseTimers
