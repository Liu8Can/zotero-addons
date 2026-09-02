import type { XpiDownloadUrls } from "../types";

export const XPI_PROXY_BASE_URLS = {
  ghProxy: "https://gh-proxy.org/",
  ghFast: "https://ghfast.top/",
  ghProxyNet: "https://ghproxy.net/",
} as const;

const LOCAL_XPI_MIRROR_KEYS = ["ghFast", "ghProxyNet"] as const;

/**
 * Check whether a URL can be used as a remote XPI download URL.
 */
export function isUsableXpiDownloadUrl(url?: unknown): url is string {
  if (typeof url !== "string" || !url.trim()) {
    return false;
  }
  try {
    const parsed = new URL(url.trim());
    return (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      (parsed.pathname !== "/" || !!parsed.search)
    );
  } catch {
    return false;
  }
}

/**
 * Build the locally-known mirrors for an original GitHub XPI URL.
 */
export function buildXpiDownloadUrlsFromGitHub(
  githubUrl: string,
): XpiDownloadUrls {
  const normalizedUrl = githubUrl.trim();
  if (!isUsableXpiDownloadUrl(normalizedUrl)) {
    return { github: "" };
  }

  let hostname: string;
  try {
    hostname = new URL(normalizedUrl).hostname.toLowerCase();
  } catch {
    return { github: normalizedUrl };
  }
  if (hostname !== "github.com") {
    return { github: normalizedUrl };
  }

  return {
    github: normalizedUrl,
    ghProxy: `${XPI_PROXY_BASE_URLS.ghProxy}${normalizedUrl}`,
    kgithub: normalizedUrl.replace(
      /^(https?:\/\/)github\.com(?=\/)/i,
      "$1kkgithub.com",
    ),
    ghFast: `${XPI_PROXY_BASE_URLS.ghFast}${normalizedUrl}`,
    ghProxyNet: `${XPI_PROXY_BASE_URLS.ghProxyNet}${normalizedUrl}`,
  };
}

/**
 * Keep every usable URL supplied by addonInfo and append the locally configured
 * GitHub mirrors. Explicit addonInfo URLs win over generated fallbacks.
 */
export function completeXpiDownloadUrls(
  downloadUrls: XpiDownloadUrls,
): XpiDownloadUrls {
  const generated = buildXpiDownloadUrlsFromGitHub(downloadUrls.github);
  const completed: XpiDownloadUrls = {
    ...downloadUrls,
    github: downloadUrls.github.trim(),
  };
  for (const source of LOCAL_XPI_MIRROR_KEYS) {
    const url = generated[source];
    if (
      !isUsableXpiDownloadUrl(completed[source]) &&
      isUsableXpiDownloadUrl(url)
    ) {
      completed[source] = url;
    }
  }
  return completed;
}

/**
 * Return usable, de-duplicated download candidates in object insertion order.
 */
export function xpiDownloadUrlList(downloadUrls: XpiDownloadUrls): string[] {
  return Array.from(
    new Set(
      Object.values(downloadUrls).filter((url): url is string =>
        isUsableXpiDownloadUrl(url),
      ),
    ),
  );
}
