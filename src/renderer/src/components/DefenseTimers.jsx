import TimersScreen from './TimersScreen'
import JungleTimer from './JungleTimer'
import CommanderHealcut from './CommanderHealcut'

function DefenseTimers(props) {
  return (
    <TimersScreen {...props}>
      <JungleTimer gvgScope={props.gvgScope} />
      <CommanderHealcut
        gvgScope={props.gvgScope}
        serverUrl={props.serverUrl}
        postHeaders={props.postHeaders}
      />
    </TimersScreen>
  )
}

export default DefenseTimers
