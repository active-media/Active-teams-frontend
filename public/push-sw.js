self.addEventListener('push', (event) => {
  if (!event.data) return;

  const notification = event.data.json();
  const title = notification.title || 'Active Teams';
  const options = {
    body: notification.body || '',
    data: { url: notification.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const path = event.notification.data?.url || '/';
  const targetUrl = new URL(path, self.location.origin).href;
  if (new URL(targetUrl).origin !== self.location.origin) return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find(
        (client) => new URL(client.url).origin === self.location.origin,
      );
      if (existingClient) {
        return existingClient.navigate(targetUrl).then(() => existingClient.focus());
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
