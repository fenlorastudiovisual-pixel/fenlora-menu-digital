/* FENLORA · Service Worker del PANEL DEL DUEÑO (negocios sin POS).
   Registrado con scope propio (/<slug>/panel) para no chocar con el sw.js del
   cliente. Su trabajo: recibir el "timbre" cuando entra un pedido nuevo y
   mostrarlo, aunque el dueño tenga el panel cerrado o el celular con la
   pantalla apagada. Push sin payload → mensaje fijo "nuevo pedido". */

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (event) {
  event.waitUntil(self.registration.showNotification('🛎️ ¡Nuevo pedido!', {
    body: 'Entró un pedido a tu menú. Ábrelo en tu panel.',
    icon: '/logo.png',
    badge: '/logo.png',
    vibrate: [250, 120, 250, 120, 250],
    tag: 'panel-nuevo-pedido',
    renotify: true,
    requireInteraction: true
  }));
});

// Al tocar la notificación: enfoca el panel si está abierto, o lo abre.
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const scope = self.registration.scope; // .../<slug>/panel
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (lista) {
      for (const c of lista) { if (c.url && c.url.indexOf('/panel') !== -1 && 'focus' in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow(scope);
    })
  );
});
