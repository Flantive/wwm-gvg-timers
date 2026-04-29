function buildHttpError(response, endpoint) {
  let message = `${endpoint}: HTTP ${response.status}`
  if (response.statusText) {
    message += ` ${response.statusText}`
  }

  if (response.bodyText) {
    message += ` | ${response.bodyText.slice(0, 300)}`
  }

  return message
}

function parseJsonBody(response, endpoint) {
  try {
    return JSON.parse(response.bodyText || '{}')
  } catch {
    throw new Error(`${endpoint}: invalid JSON response`)
  }
}

export async function requestThroughBridge(config) {
  const dedicatedBridgeRequest = window.wwmBridge?.httpRequest
  if (typeof dedicatedBridgeRequest === 'function') {
    return dedicatedBridgeRequest(config)
  }

  const customBridgeRequest = window.api?.httpRequest
  if (typeof customBridgeRequest === 'function') {
    return customBridgeRequest(config)
  }

  const toolkitInvoke = window.electron?.ipcRenderer?.invoke
  if (typeof toolkitInvoke === 'function') {
    return toolkitInvoke('overlay:http-request', config)
  }

  throw new Error(
    `IPC bridge unavailable. Restart the Electron app to reload preload/main changes. ` +
      `(wwmBridge=${typeof window.wwmBridge}, api=${typeof window.api}, electron=${typeof window.electron})`
  )
}

export async function fetchTimers(serverUrl) {
  const endpoint = '/timers'
  const response = await requestThroughBridge({
    url: `${serverUrl}${endpoint}`,
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(buildHttpError(response, endpoint))
  }

  const payload = parseJsonBody(response, endpoint)
  if (!payload || !Array.isArray(payload.timers)) {
    throw new Error('Invalid timer payload')
  }

  return payload.timers
}

export async function resetTimer(serverUrl, timerId, headers) {
  const endpoint = `/timers/${timerId}/reset`
  const response = await requestThroughBridge({
    url: `${serverUrl}${endpoint}`,
    method: 'POST',
    headers,
  })

  if (!response.ok) {
    throw new Error(buildHttpError(response, endpoint))
  }
}

export async function resetAllTimers(serverUrl, headers) {
  const endpoint = '/timers/reset-all'
  const response = await requestThroughBridge({
    url: `${serverUrl}${endpoint}`,
    method: 'POST',
    headers,
  })

  if (!response.ok) {
    throw new Error(buildHttpError(response, endpoint))
  }

  const payload = parseJsonBody(response, endpoint)
  if (!payload || !Array.isArray(payload.timers)) {
    throw new Error('Invalid reset-all payload')
  }

  return payload.timers
}

export async function fetchGvgStatus(serverUrl) {
  const endpoint = '/wwmapi/status'
  const response = await requestThroughBridge({
    url: `${serverUrl}${endpoint}`,
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(buildHttpError(response, endpoint))
  }

  const payload = parseJsonBody(response, endpoint)
  return {
    gvgRunning: Boolean(payload?.gvgRunning),
    gvgScope: payload?.gvgScope ?? null,
    timers: Array.isArray(payload?.timers) ? payload.timers : null,
    raw: payload ?? null,
  }
}

export async function startGvg(serverUrl, additionalTime, headers) {
  const endpoint = '/wwmapi/startgvg'
  const response = await requestThroughBridge({
    url: `${serverUrl}${endpoint}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({ additionalTime }),
  })

  if (!response.ok) {
    throw new Error(buildHttpError(response, endpoint))
  }
}

export async function resetCommanderBuff(serverUrl, field, headers) {
  const endpoint = '/wwmapi/resetCommanderBuff'
  const response = await requestThroughBridge({
    url: `${serverUrl}${endpoint}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({ field }),
  })

  if (!response.ok) {
    throw new Error(buildHttpError(response, endpoint))
  }
}
