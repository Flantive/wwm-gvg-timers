import { app, BrowserWindow, globalShortcut, ipcMain, Menu, Tray } from 'electron'
import fs from 'node:fs'
import path from 'path'

const remoteServerUrl = 'http://217.182.78.238:3333'

let overlayWindow
let tray

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

function resolveRendererPath() {
  const candidates = [
    path.join(__dirname, '../renderer/index.html'),
    path.join(__dirname, '../dist/index.html'),
    path.join(app.getAppPath(), 'out/renderer/index.html'),
    path.join(process.cwd(), 'out/renderer/index.html'),
    path.join(app.getAppPath(), 'src/renderer/index.html'),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  return candidates[0]
}

function resolveTrayIconPath() {
  const candidates = [
    path.join(process.resourcesPath, 'app.asar.unpacked/resources/icon.png'),
    path.join(process.resourcesPath, 'app.asar.unpacked/build/icon.png'),
    path.join(app.getAppPath(), 'resources/icon.png'),
    path.join(process.cwd(), 'resources/icon.png'),
    path.join(process.cwd(), 'build/icon.png'),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  return candidates[candidates.length - 1]
}

function toggleOverlayVisibility() {
  if (!overlayWindow) {
    return
  }

  if (overlayWindow.isVisible()) {
    overlayWindow.hide()
  } else {
    overlayWindow.show()
    overlayWindow.focus()
  }
}

function createWindow() {
  const preloadPath = resolvePreloadPath()
  const rendererPath = resolveRendererPath()
  console.log(`[wwm] using preload: ${preloadPath}`)
  console.log(`[wwm] using renderer: ${rendererPath}`)

  overlayWindow = new BrowserWindow({
    width: 380,
    height: 630,
    x: 1400,
    y: 100,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: true,
    minWidth: 260,
    minHeight: 630,
    maxHeight: 630,
    skipTaskbar: !app.isPackaged,
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
    overlayWindow.loadFile(rendererPath)
  }

  overlayWindow.on('will-resize', (event, _newBounds, details) => {
    if (details?.edge !== 'right') {
      event.preventDefault()
    }
  })

  overlayWindow.setAlwaysOnTop(true, 'screen-saver')
  overlayWindow.setVisibleOnAllWorkspaces(true)
  overlayWindow.setIgnoreMouseEvents(false)
}

function createTray() {
  const trayIconPath = resolveTrayIconPath()
  tray = new Tray(trayIconPath)
  tray.setToolTip('WWM GvG Timers')
  tray.on('click', () => toggleOverlayVisibility())

  const menu = Menu.buildFromTemplate([
    {
      label: 'Show/Hide Overlay',
      click: () => toggleOverlayVisibility(),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit(),
    },
  ])

  tray.setContextMenu(menu)
}

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
ipcMain.handle('overlay:get-server-url', () => remoteServerUrl)

ipcMain.on('overlay:hide', () => {
  overlayWindow?.hide()
})

app.whenReady().then(() => {
  createWindow()
  createTray()

  globalShortcut.register('Ctrl+Shift+T', () => {
    toggleOverlayVisibility()
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
