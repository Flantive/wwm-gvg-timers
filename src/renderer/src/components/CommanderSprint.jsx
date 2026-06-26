import CommanderBuffTimer from './CommanderBuffTimer'
import sprintIcon from '../assets/sprint.png'

function CommanderSprint({ gvgScope, serverUrl, postHeaders, canReset, onResetSuccess, compact, oneRow }) {
  return (
    <CommanderBuffTimer
      gvgScope={gvgScope}
      serverUrl={serverUrl}
      postHeaders={postHeaders}
      buffField="sprint"
      label="Commander: Sprint"
      compactLabel="Sprint"
      compact={compact}
      oneRow={oneRow}
      iconSrc={sprintIcon}
      canReset={canReset}
      onResetSuccess={onResetSuccess}
    />
  )
}

export default CommanderSprint
