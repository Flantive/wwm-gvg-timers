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

export async function fetchGvgStatus(serverUrl, headers) {
  const endpoint = '/wwmapi/status'
  const response = await requestThroughBridge({
    url: `${serverUrl}${endpoint}`,
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    throw new Error(buildHttpError(response, endpoint))
  }

  const payload = parseJsonBody(response, endpoint)
  return {
    gvgRunning: Boolean(payload?.gvgRunning),
    gvgScope: payload?.gvgScope ?? null,
    timers: Array.isArray(payload?.timers) ? payload.timers : null,
    userCooldowns: payload?.userCooldowns ?? payload?.gvgScope?.userCooldowns ?? null,
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

export async function resetGvg(serverUrl, headers) {
  const endpoint = '/wwmapi/resetGvg'
  const response = await requestThroughBridge({
    url: `${serverUrl}${endpoint}`,
    method: 'POST',
    headers,
  })

  if (!response.ok) {
    throw new Error(buildHttpError(response, endpoint))
  }
}

export async function submitExCooldown(serverUrl, payload, headers) {
  const endpoint = '/wwmapi/exCooldown'
  const response = await requestThroughBridge({
    url: `${serverUrl}${endpoint}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(buildHttpError(response, endpoint))
  }
}

export async function fetchAuthMe(authServerUrl, headers) {
  const endpoint = '/auth/me'
  const response = await requestThroughBridge({
    url: `${authServerUrl}${endpoint}`,
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    throw new Error(buildHttpError(response, endpoint))
  }

  return parseJsonBody(response, endpoint)
}

export async function logoutAuth(authServerUrl, headers) {
  const endpoint = '/auth/logout'
  const response = await requestThroughBridge({
    url: `${authServerUrl}${endpoint}`,
    method: 'POST',
    headers,
  })

  if (!response.ok) {
    throw new Error(buildHttpError(response, endpoint))
  }
}
