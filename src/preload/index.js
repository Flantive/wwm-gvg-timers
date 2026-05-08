import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  getServerUrl() {
    return ipcRenderer.invoke('overlay:get-server-url')
  },
  httpRequest(config) {
    return ipcRenderer.invoke('overlay:http-request', config)
  },
  setOverlayHeight(height) {
    ipcRenderer.send('overlay:set-height', height)
  },
  hideOverlay() {
    ipcRenderer.send('overlay:hide')
  },
  setCommanderHotkeys(shortcutConfig) {
    ipcRenderer.send('overlay:set-commander-hotkeys', shortcutConfig)
  },
  onCommanderHotkey(callback) {
    if (typeof callback !== 'function') {
      return () => {}
    }

    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('overlay:commander-hotkey', listener)
    return () => {
      ipcRenderer.removeListener('overlay:commander-hotkey', listener)
    }
  },
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
  } catch (error) {
    console.error(error)
  }

  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }

  try {
    contextBridge.exposeInMainWorld('wwmBridge', {
      httpRequest: api.httpRequest,
    })
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
  window.wwmBridge = {
    httpRequest: api.httpRequest,
  }
}
