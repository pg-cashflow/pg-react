import { API_BASE } from "@/lib/constants";
import { getToken } from "@/auth/storage";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push notifications are not supported by this browser");
  }

  const token = getToken();
  if (!token) {
    throw new Error("Must be logged in to subscribe to push notifications");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission denied");
  }

  const reg = await navigator.serviceWorker.ready;

  const vapidRes = await fetch(`${API_BASE}/push/vapid-public-key`);
  if (!vapidRes.ok) {
    throw new Error("Failed to fetch VAPID public key from backend");
  }
  const { public_key: vapidKey } = (await vapidRes.json()) as { public_key: string };
  if (!vapidKey) {
    throw new Error("VAPID public key missing from backend response");
  }

  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
  });

  const body = subscription.toJSON();
  const res = await fetch(`${API_BASE}/tenant/push/subscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      endpoint: body.endpoint,
      keys: {
        p256dh: body.keys?.p256dh,
        auth: body.keys?.auth,
      },
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to register subscription with server");
  }

  return true;
}
