export async function clearServiceWorkerCaches(): Promise<void> {
  if (!("caches" in window)) return;
  const names = await caches.keys();
  await Promise.all(
    names
      .filter((n) => n === "api-cache" || n.startsWith("workbox-"))
      .map((n) => caches.delete(n))
  );
}
