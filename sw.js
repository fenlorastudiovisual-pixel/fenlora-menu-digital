/* FENLORA MENÚ · Service Worker del cliente.
   Su único trabajo hoy: recibir el "timbre" (Web Push sin payload) cuando el
   pedido del cliente queda listo y mostrar la notificación, aunque el menú
   esté cerrado o el celular con la pantalla apagada.
   El push viene SIN datos (payloadless), así que el mensaje es fijo: el único
   aviso que recibe un cliente por esta vía es "tu pedido está listo". */

self.addEventListener('install', function (e) { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (event) {
  const titulo = '🔔 ¡Tu pedido está listo!';
  const opciones = {
    body: 'Pásalo a recoger. ¡Buen provecho! 🎉',
    icon: '/logo.png',
    badge: '/logo.png',
    vibrate: [300, 120, 300, 120, 300],
    tag: 'pedido-listo',
    renotify: true,
    requireInteraction: true,
    silent: false
  };
  event.waitUntil(self.registration.showNotification(titulo, opciones));
});

// Al tocar la notificación: enfoca una pestaña del menú si hay alguna abierta,
// o abre una nueva.
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (lista) {
      for (const c of lista) { if ('focus' in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});
