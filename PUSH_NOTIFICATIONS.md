# Push notifications

The app exposes push actions through `usePushNotifications` from
`src/contexts/PushNotificationContext.jsx`:

```jsx
const { enablePushNotifications, sendPushNotification } = usePushNotifications();
```

Call `enablePushNotifications()` from a user click to request permission and
subscribe that device. Send a notification with:

```js
await sendPushNotification({
  recipientEmails: ["person@example.org"],
  title: "Event update",
  body: "The event details have changed.",
  url: "/events",
});
```

All signed-in users can send to up to 20 registered users in their own
organization. Recipients receive notifications only on devices where they have
enabled notifications. The `url` must be a path on this site.

## Server setup

1. Apply `../activeteamsbackend/migration_web_push_subscriptions.sql` to the
   Supabase database.
2. Generate a VAPID key pair with `npx web-push generate-vapid-keys`.
3. Configure these backend environment variables with the matching pair:
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT` (a contact URI, for example `mailto:admin@example.org`)
4. Install the updated backend dependencies and deploy the API.

Push delivery requires HTTPS (localhost is suitable for development) and a
browser that supports service workers and Web Push.
