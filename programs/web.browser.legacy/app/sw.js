var pages = ['/offline.js', '']
const RE = {
  method: /GET/i,
  static: /\.(?:png|jpe?g|css|js|gif|webm|webp|eot|svg|ttf|woff|woff2)(?:\?[a-zA-Z0-9-._~:/#\[\]@!$&'()*+,;=]*)?$|(?:fonts\.googleapis\.com|gstatic\.com)/i, // '
  sockjs: /\/sockjs\//
}

self.addEventListener('install', event => {
  self.skipWaiting()
  event.waitUntil(caches.open('v2').then(cache => cache.addAll(pages)))
})

self.addEventListener('fetch', evt => {
  // Go through all the clients and attempt to have the currently executing
  // service worker take control
  self.clients.claim()

  // In case it's a GET request or a websocket, skip
  if (!RE.method.test(evt.request.method) || RE.sockjs.test(evt.request.url)) {
    return
  }

  // Otherwise, process request
  const req = evt.request.clone()
  const uri = evt.request.url.replace(origin, '')

  evt.respondWith(
    fetch(req)
      .then(response => {
        if (pages.indexOf(uri) !== -1 || RE.static.test(evt.request.url)) {
          const resp = response.clone()
          caches.open('static-v1').then(cache => {
            if (req.url.indexOf('chrome-extension://') == -1) {
              cache.put(req, resp)
            }
          })
        }
        return response
      })
      .catch(() =>
        caches
          .match(req)
          .then(cached => cached || caches.match('/').catch(() => fetch(req)))
          .catch(() => caches.match('/').catch(() => fetch(req)))
      )
  )
})

self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches
      .keys()
      .then(cacheNames =>
        Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName).catch(() => { }))
        )
      )
  )
})
