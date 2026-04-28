import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron'
import http from 'node:http'
import path from 'path'

const timerDefinitions = [
  { id: 1, name: 'GvG Boss Spawn', duration: 300 },
  { id: 2, name: 'Objective Capture', duration: 180 },
  { id: 3, name: 'Buff / Buff Cooldown', duration: 90 },
  { id: 4, name: 'Tower Push Timer', duration: 240 },
]

const timerStore = timerDefinitions.map((timer) => ({
  ...timer,
  remaining: timer.duration,
  isRunning: false,
  startedAt: null,
}))

let overlayWindow
let timerServer
let timerServerUrl = ''

function updateTimer(timer) {
  if (!timer.isRunning || timer.startedAt === null) {
    return
  }

  const elapsedSeconds = Math.floor((Date.now() - timer.startedAt) / 1000)
  const nextRemaining = Math.max(timer.duration - elapsedSeconds, 0)
  timer.remaining = nextRemaining

  if (nextRemaining === 0) {
    timer.isRunning = false
    timer.startedAt = null
  }
}

function timerPayload(timer) {
  updateTimer(timer)
  return {
    id: timer.id,
    name: timer.name,
    duration: timer.duration,
    remaining: timer.remaining,
    isRunning: timer.isRunning,
  }
}

function getTimersPayload() {
  return {
    timers: timerStore.map((timer) => timerPayload(timer)),
    serverTime: Date.now(),
  }
}

function resetTimerAndStart(timerId) {
  const timer = timerStore.find((item) => item.id === timerId)
  if (!timer) {
    return null
  }

  timer.remaining = timer.duration
  timer.isRunning = true
  timer.startedAt = Date.now()
  return timerPayload(timer)
}

function resetAllTimers() {
  for (const timer of timerStore) {
    timer.remaining = timer.duration
    timer.isRunning = false
    timer.startedAt = null
  }
}

function writeJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
  })
  response.end(JSON.stringify(data))
}

function requestHandler(request, response) {
  const url = new URL(request.url || '/', 'http://127.0.0.1')
  const pathName = url.pathname

  if (request.method === 'OPTIONS') {
    writeJson(response, 204, {})
    return
  }

  if (request.method === 'GET' && pathName === '/timers') {
    writeJson(response, 200, getTimersPayload())
    return
  }

  if (request.method === 'POST' && pathName === '/timers/reset-all') {
    resetAllTimers()
    writeJson(response, 200, getTimersPayload())
    return
  }

  if (request.method === 'POST' && pathName.startsWith('/timers/')) {
    const [, resource, idPart, action] = pathName.split('/')

    if (resource !== 'timers' || action !== 'reset') {
      writeJson(response, 404, { error: 'Not found' })
      return
    }

    const timerId = Number(idPart)
    if (!Number.isInteger(timerId)) {
      writeJson(response, 400, { error: 'Invalid timer id' })
      return
    }

    const timer = resetTimerAndStart(timerId)
    if (!timer) {
      writeJson(response, 404, { error: 'Timer not found' })
      return
    }

    writeJson(response, 200, { timer })
    return
  }

  writeJson(response, 404, { error: 'Not found' })
}

function startTimerServer() {
  return new Promise((resolve, reject) => {
    timerServer = http.createServer(requestHandler)

    timerServer.once('error', (error) => {
      reject(error)
    })

    timerServer.listen(0, '127.0.0.1', () => {
      const address = timerServer.address()
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to resolve timer server address'))
        return
      }

      timerServerUrl = `http://127.0.0.1:${address.port}`
      resolve()
    })
  })
}

function stopTimerServer() {
  return new Promise((resolve) => {
    if (!timerServer) {
      resolve()
      return
    }

    timerServer.close(() => {
      timerServer = null
      timerServerUrl = ''
      resolve()
    })
  })
}

function createWindow() {
  overlayWindow = new BrowserWindow({
    width: 380,
    height: 520,
    x: 1400,
    y: 100,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
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

ipcMain.handle('overlay:get-server-url', () => timerServerUrl)

ipcMain.on('overlay:hide', () => {
  overlayWindow?.hide()
})

app.whenReady().then(async () => {
  await startTimerServer()
  createWindow()

  globalShortcut.register('Ctrl+Shift+T', () => {
    if (overlayWindow) {
      overlayWindow.isVisible() ? overlayWindow.hide() : overlayWindow.show()
    }
  })

  globalShortcut.register('Ctrl+Shift+R', () => {
    resetAllTimers()
    overlayWindow?.webContents.send('reset-all-timers')
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  void stopTimerServer()
})
