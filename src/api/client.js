let _onUnauthorized = null;
export function setUnauthorizedHandler(fn) { _onUnauthorized = fn; }

let _onWriteError = null;
export function setWriteErrorHandler(fn) { _onWriteError = fn; }

export function getWriteErrorHandler() { return _onWriteError; }

// Returns null on 401 (triggers logout) or on network failure (server down).
// Callers should treat null as "no response — skip update".
export async function apiFetch(url, options) {
  try {
    const r = await fetch(url, options);
    if (r.status === 401) { _onUnauthorized?.(); return null; }
    return r;
  } catch {
    // Network error / ECONNREFUSED — server is down or not yet started
    return null;
  }
}
