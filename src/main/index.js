import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron'
import fs from 'node:fs'
import path from 'path'

const remoteServerUrl = 'http://1.1.1.1/wwmapi'

let overlayWindow

function resolvePreloadPath() {
  const candidates = [
    path.join(__dirname, '../preload/index.js'),
    path.join(app.getAppPath(), 'out/preload/index.js'),
    path.join(process.cwd(), 'out/preload/index.js'),
    path.join(app.getAppPath(), 'src/preload/index.js'),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  return candidates[0]
}

function createWindow() {
  const preloadPath = resolvePreloadPath()
  console.log(`[wwm] using preload: ${preloadPath}`)

  overlayWindow = new BrowserWindow({
    width: 380,
    height: 630,
    x: 1400,
    y: 100,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  })

  if (process.env.NODE_ENV === 'development') {
    overlayWindow.loadURL('http://localhost:5173')
  } else {
    overlayWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  overlayWindow.setAlwaysOnTop(true, 'screen-saver')
  overlayWindow.setVisibleOnAllWorkspaces(true)
  overlayWindow.setIgnoreMouseEvents(false)
}

ipcMain.handle('overlay:get-server-url', () => remoteServerUrl)
ipcMain.handle('overlay:http-request', async (_event, requestConfig) => {
  const config = requestConfig ?? {}
  const response = await fetch(config.url, {
    method: config.method ?? 'GET',
    headers: config.headers ?? {},
    body: config.body,
  })

  const bodyText = await response.text()
  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    bodyText,
  }
})

ipcMain.on('overlay:hide', () => {
  overlayWindow?.hide()
})

app.whenReady().then(() => {
  createWindow()

  globalShortcut.register('Ctrl+Shift+T', () => {
    if (overlayWindow) {
      overlayWindow.isVisible() ? overlayWindow.hide() : overlayWindow.show()
    }
  })

  globalShortcut.register('Ctrl+Shift+R', () => {
    overlayWindow?.webContents.send('reset-all-timers')
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
