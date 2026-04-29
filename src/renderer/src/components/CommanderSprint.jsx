import CommanderBuffTimer from './CommanderBuffTimer'

function CommanderSprint({ gvgScope, serverUrl, postHeaders, canReset }) {
  return (
    <CommanderBuffTimer
      gvgScope={gvgScope}
      serverUrl={serverUrl}
      postHeaders={postHeaders}
      buffField="sprint"
      label="Commander: Sprint"
      canReset={canReset}
    />
  )
}

export default CommanderSprint
