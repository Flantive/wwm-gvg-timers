import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  getServerUrl() {
    return ipcRenderer.invoke('overlay:get-server-url')
  },
  hideOverlay() {
    ipcRenderer.send('overlay:hide')
  },
  onResetAllTimers(callback) {
    const listener = () => callback()
    ipcRenderer.on('reset-all-timers', listener)
    return () => ipcRenderer.removeListener('reset-all-timers', listener)
  },
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
