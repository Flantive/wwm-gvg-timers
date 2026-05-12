import { app, BrowserWindow, globalShortcut, ipcMain, Menu, Tray, shell } from 'electron'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const remoteServerUrl = 'http://217.182.78.238:3333'
// const remoteServerUrl = 'http://localhost:3333'
const authServerUrl = 'https://videoalchemy.pl:3334'
const authLoginUrl = `${authServerUrl}/auth/discord/login`
const authCallbackHost = '127.0.0.1'
const authCallbackPort = 33331
const authCallbackPath = '/auth/discord/callback'

let overlayWindow
let tray
let commanderShortcutConfig = {}
const fallbackShortcutAccelerators = new Set()
let authCallbackServer = null
let pendingSessionToken = ''

function normalizeAcceleratorPart(part) {
  const normalized = String(part || '').trim()
  if (!normalized) {
    return null
  }

  const directMap = {
    ShiftLeft: 'Shift',
    ShiftRight: 'Shift',
    ControlLeft: 'Ctrl',
    ControlRight: 'Ctrl',
    AltLeft: 'Alt',
    AltRight: 'Alt',
    MetaLeft: 'Super',
    MetaRight: 'Super',
    Enter: 'Enter',
    Escape: 'Esc',
    Tab: 'Tab',
    Backspace: 'Backspace',
    Delete: 'Delete',
    Insert: 'Insert',
    Home: 'Home',
    End: 'End',
    PageUp: 'PageUp',
    PageDown: 'PageDown',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    Space: 'Space',
  }

  if (directMap[normalized]) {
    return [directMap[normalized]]
  }

  if (/^Key[A-Z]$/.test(normalized)) {
    return [normalized.slice(3)]
  }

  if (/^Digit[0-9]$/.test(normalized)) {
    return [normalized.slice(5)]
  }

  if (/^Numpad[0-9]$/.test(normalized)) {
    const digit = normalized.slice(6)
    // Keep numpad-only variants (no top-row or NumLock-off aliases).
    return [`num${digit}`, `Num${digit}`, `NUM${digit}`]
  }

  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(normalized)) {
    return [normalized]
  }

  return [normalized]
}

function isModifierAcceleratorToken(token) {
  return token === 'Ctrl' || token === 'Shift' || token === 'Alt' || token === 'Super'
}

function keybindToAccelerators(keybindValue) {
  if (typeof keybindValue !== 'string') {
    return []
  }

  const parts = keybindValue
    .split('+')
    .map((part) => normalizeAcceleratorPart(part) ?? [])
    .slice(0, 2)

  if (parts.length === 0 || parts.some((variants) => !Array.isArray(variants) || variants.length === 0)) {
    return []
  }

  let expanded = ['']
  for (const variants of parts) {
    const nextExpanded = []
    for (const prefix of expanded) {
      for (const variant of variants) {
        const token = String(variant).trim()
        if (!token) {
          continue
        }
        nextExpanded.push(prefix ? `${prefix}+${token}` : token)
      }
    }
    expanded = nextExpanded
  }

  const validAccelerators = expanded.filter((accelerator) => {
    const tokens = accelerator
      .split('+')
      .map((part) => part.trim())
      .filter(Boolean)

    const keyTokens = tokens.filter((token) => !isModifierAcceleratorToken(token))
    return keyTokens.length === 1
  })

  return Array.from(new Set(validAccelerators))
}

function unregisterFallbackCommanderHotkeys() {
  for (const accelerator of fallbackShortcutAccelerators) {
    globalShortcut.unregister(accelerator)
  }
  fallbackShortcutAccelerators.clear()
}

function registerFallbackCommanderHotkeys() {
  unregisterFallbackCommanderHotkeys()

  if (!overlayWindow || overlayWindow.isDestroyed()) {
    return
  }

  // Avoid stealing input while user is typing inside the overlay.
  if (overlayWindow.isFocused()) {
    return
  }

  for (const [field, keybindValue] of Object.entries(commanderShortcutConfig ?? {})) {
    const accelerators = keybindToAccelerators(keybindValue)
    if (accelerators.length === 0) {
      continue
    }

    for (const accelerator of accelerators) {
      if (accelerator === 'Ctrl+Shift+T') {
        continue
      }

      try {
        const registered = globalShortcut.register(accelerator, () => {
          if (!overlayWindow || overlayWindow.isDestroyed()) {
            return
          }
          overlayWindow.webContents.send('overlay:commander-hotkey', { field })
        })

        if (registered) {
          fallbackShortcutAccelerators.add(accelerator)
        }
      } catch {
        // Ignore invalid accelerators; continue with remaining variants.
      }
    }
  }
}

function refreshCommanderHotkeys() {
  registerFallbackCommanderHotkeys()
}

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
    center: true,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: true,
    minWidth: 260,
    minHeight: 240,
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

  overlayWindow.setAlwaysOnTop(true, 'screen-saver')
  overlayWindow.setVisibleOnAllWorkspaces(true)
  overlayWindow.setIgnoreMouseEvents(false)

  overlayWindow.on('focus', () => {
    refreshCommanderHotkeys()
  })

  overlayWindow.on('blur', () => {
    refreshCommanderHotkeys()
  })
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

function getLocalAuthCallbackUrl() {
  return `http://${authCallbackHost}:${authCallbackPort}${authCallbackPath}`
}

function sendAuthTokenToRenderer(sessionToken) {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    return
  }

  overlayWindow.webContents.send('overlay:auth-callback', { sessionToken })
}

function startAuthCallbackServer() {
  if (authCallbackServer) {
    return
  }

  authCallbackServer = http.createServer((req, res) => {
    const requestUrl = new URL(req.url || '/', getLocalAuthCallbackUrl())

    if (requestUrl.pathname !== authCallbackPath) {
      res.statusCode = 404
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.end('Not found')
      return
    }

    const sessionToken = requestUrl.searchParams.get('sessionToken')?.trim() ?? ''
    if (!sessionToken) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.end('<h3>Login failed</h3><p>Missing session token.</p>')
      return
    }

    pendingSessionToken = sessionToken
    sendAuthTokenToRenderer(sessionToken)

    res.statusCode = 200
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end('<h3>Login successful</h3><p>You can now return to the app.</p>')
  })

  authCallbackServer.listen(authCallbackPort, authCallbackHost)
}

function stopAuthCallbackServer() {
  if (!authCallbackServer) {
    return
  }

  authCallbackServer.close()
  authCallbackServer = null
}

function normalizeRequestUrl(rawUrl) {
  const value = String(rawUrl ?? '').trim()
  if (!value) {
    return remoteServerUrl
  }

  try {
    return new URL(value).toString()
  } catch {
    const base = remoteServerUrl.endsWith('/') ? remoteServerUrl.slice(0, -1) : remoteServerUrl
    const endpoint = value.startsWith('/') ? value : `/${value}`
    return `${base}${endpoint}`
  }
}

ipcMain.handle('overlay:http-request', async (_event, requestConfig) => {
  const config = requestConfig ?? {}
  const resolvedUrl = normalizeRequestUrl(config.url)
  const response = await fetch(resolvedUrl, {
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
ipcMain.handle('overlay:get-auth-server-url', () => authServerUrl)
ipcMain.handle('overlay:get-auth-login-url', () => authLoginUrl)
ipcMain.handle('overlay:get-auth-callback-url', () => getLocalAuthCallbackUrl())
ipcMain.handle('overlay:get-pending-session-token', () => {
  const token = pendingSessionToken
  pendingSessionToken = ''
  return token
})
ipcMain.handle('overlay:open-external', async (_event, rawUrl) => {
  const urlValue = String(rawUrl ?? '').trim()
  if (!urlValue) {
    return false
  }

  await shell.openExternal(urlValue)
  return true
})

ipcMain.on('overlay:set-height', (_event, nextHeight) => {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    return
  }

  const parsedHeight = Number(nextHeight)
  if (!Number.isFinite(parsedHeight)) {
    return
  }

  const clampedHeight = Math.max(240, Math.min(Math.ceil(parsedHeight), 2000))
  const [currentWidth] = overlayWindow.getSize()
  overlayWindow.setSize(currentWidth, clampedHeight, false)
})

ipcMain.on('overlay:hide', () => {
  overlayWindow?.hide()
})

ipcMain.on('overlay:set-commander-hotkeys', (_event, shortcutConfig) => {
  commanderShortcutConfig = shortcutConfig && typeof shortcutConfig === 'object' ? shortcutConfig : {}
  refreshCommanderHotkeys()
})

app.whenReady().then(() => {
  createWindow()
  createTray()
  startAuthCallbackServer()

  globalShortcut.register('Ctrl+Shift+T', () => {
    toggleOverlayVisibility()
  })

  refreshCommanderHotkeys()
})

app.on('will-quit', () => {
  stopAuthCallbackServer()
  unregisterFallbackCommanderHotkeys()
  globalShortcut.unregisterAll()
})
