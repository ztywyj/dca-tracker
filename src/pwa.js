export function registerPwa() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  if (!window.isSecureContext && !isLocalhost) {
    return
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error) => {
      console.warn('PWA service worker registration failed.', error)
    })
  })
}
