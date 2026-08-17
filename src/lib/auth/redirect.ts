export function safeInternalPath(value: FormDataEntryValue | string | null | undefined, fallback = "/workspace"): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;

  try {
    const parsed = new URL(raw, "https://lojasaph.invalid");
    if (parsed.origin !== "https://lojasaph.invalid") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function urlWithMessage(path: string, key: "error" | "message", message: string): string {
  const url = new URL(path, "https://lojasaph.invalid");
  url.searchParams.set(key, message);
  return `${url.pathname}${url.search}`;
}
