import CommanderBuffTimer from './CommanderBuffTimer'

function CommanderSprint({ gvgScope, serverUrl, postHeaders, canReset, onResetSuccess, compact }) {
  return (
    <CommanderBuffTimer
      gvgScope={gvgScope}
      serverUrl={serverUrl}
      postHeaders={postHeaders}
      buffField="sprint"
      label="Commander: Sprint"
      compactLabel="Sprint"
      compact={compact}
      canReset={canReset}
      onResetSuccess={onResetSuccess}
    />
  )
}

export default CommanderSprint
