export async function clearServiceWorkerCaches(): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) return;
  try {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((n) => n.includes("api") || n.includes("data") || n.includes("runtime") || n === "api-cache")
        .map((n) => caches.delete(n))
    );
  } catch {
    // Cache storage access blocked or unavailable
  }
}
