// Server-side URL liveness verification for product purchase links.

const PRIVATE_HOST = /^(localhost|.*\.local|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|::1|\[::1\]|0\.0\.0\.0)/i;

function isSafePublicUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  if (PRIVATE_HOST.test(parsed.hostname)) return false;
  return true;
}

const UA = "Mozilla/5.0 (compatible; BeautyApp-LinkCheck/1.0)";

export async function verifyUrl(url: string | undefined): Promise<boolean> {
  if (!url || !isSafePublicUrl(url)) return false;

  const attempt = async (method: "HEAD" | "GET"): Promise<Response | null> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      return await fetch(url, {
        method,
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": UA, Accept: "*/*" },
      });
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

  const head = await attempt("HEAD");
  if (head?.ok) return true;
  // Some servers reject HEAD (405/501) or fail it; retry with GET.
  if (!head || head.status === 405 || head.status === 501) {
    const get = await attempt("GET");
    return !!get?.ok;
  }
  return false;
}

export async function verifyUrls(urls: (string | undefined)[]): Promise<boolean[]> {
  return Promise.all(urls.map(verifyUrl));
}
