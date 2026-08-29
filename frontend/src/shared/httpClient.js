// Cliente HTTP contra la API real del backend PomAss. Sin dependencias externas
// (fetch nativo). Lo comparten el checkout y el panel de administración: guarda
// tokens en localStorage, renueva el access token vencido y reintenta una vez.

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const STORAGE_KEYS = {
  access: 'pomass_access_token',
  refresh: 'pomass_refresh_token',
  user: 'pomass_user',
  guest: 'pomass_guest_id',
}

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export function getStoredUser() {
  const raw = localStorage.getItem(STORAGE_KEYS.user)
  return raw ? JSON.parse(raw) : null
}

export function getAccessToken() {
  return localStorage.getItem(STORAGE_KEYS.access)
}

export function getRefreshToken() {
  return localStorage.getItem(STORAGE_KEYS.refresh)
}

/** Guarda solo el par de tokens (lo que devuelve /auth/refresh). */
export function storeTokens(tokens) {
  localStorage.setItem(STORAGE_KEYS.access, tokens.accessToken)
  localStorage.setItem(STORAGE_KEYS.refresh, tokens.refreshToken)
}

export function storeSession({ user, tokens }) {
  storeTokens(tokens)
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.access)
  localStorage.removeItem(STORAGE_KEYS.refresh)
  localStorage.removeItem(STORAGE_KEYS.user)
}

// El carrito/checkout de invitado se identifica con este token (lo asigna el
// backend en la primera respuesta y se reenvía en `x-guest-id`).
export function getGuestId() {
  return localStorage.getItem(STORAGE_KEYS.guest)
}

export function setGuestId(id) {
  if (id) localStorage.setItem(STORAGE_KEYS.guest, id)
}

export function clearGuestId() {
  localStorage.removeItem(STORAGE_KEYS.guest)
}

// ---------------------------------------------------------------------------
// Renovación del access token
//
// El access token vive 15 minutos; el refresh token, 7 días. Sin renovación, la
// sesión se caía a los 15 minutos aunque el usuario siguiera comprando.
//
// El backend ROTA el refresh token en cada uso y RECHAZA reutilizar uno ya
// consumido (es su defensa contra robo de tokens). Por eso las renovaciones se
// deduplican: si dos peticiones caducan a la vez, ambas esperan la MISMA
// renovación en vuelo. Lanzar dos consumiría el token dos veces y la segunda
// invalidaría la sesión recién renovada.
// ---------------------------------------------------------------------------

let refreshInFlight = null

/** Aviso a la aplicación de que la sesión se perdió y no se pudo recuperar. */
let onSessionExpired = null

export function setOnSessionExpired(handler) {
  onSessionExpired = handler
}

async function doRefresh() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return false

    const data = await res.json()
    if (!data?.tokens?.accessToken) return false

    storeTokens(data.tokens)
    return true
  } catch {
    // Sin red: no es una sesión inválida, pero tampoco se pudo renovar.
    return false
  }
}

function refreshAccessToken() {
  // Una sola renovación a la vez; el resto se cuelga de la misma promesa.
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

async function attempt(path, { method, body, auth }) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getAccessToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  if (!headers.Authorization) {
    const guestId = getGuestId()
    if (guestId) headers['x-guest-id'] = guestId
  }

  try {
    return await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(
      `No se pudo conectar con la API (${BASE_URL}). ¿Está el backend corriendo?`,
      0,
    )
  }
}

export async function request(path, { method = 'GET', body, auth = true } = {}) {
  const options = { method, body, auth }
  let res = await attempt(path, options)

  // 401 con sesión iniciada = access token vencido. Se renueva y se reintenta
  // UNA vez. Si la renovación falla, el refresh token también caducó (o fue
  // revocado): la sesión se acabó de verdad.
  if (res.status === 401 && auth && getRefreshToken()) {
    const renovado = await refreshAccessToken()
    if (renovado) {
      res = await attempt(path, options)
    } else {
      clearSession()
      onSessionExpired?.()
    }
  }

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const message = data?.error?.message || `Error ${res.status}`
    throw new ApiError(message, res.status, data?.error)
  }
  if (data?.guestId) setGuestId(data.guestId)
  return data
}
