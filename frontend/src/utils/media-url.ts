import { appConfig } from "@/config/app-config";

const isPrivateOrLocalHost = (hostname: string) => {
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower === "127.0.0.1") return true;
  if (lower.startsWith("10.")) return true;
  if (lower.startsWith("192.168.")) return true;
  const match172 = lower.match(/^172\.(\d{1,3})\./);
  if (match172) {
    const segment = Number(match172[1]);
    return Number.isFinite(segment) && segment >= 16 && segment <= 31;
  }
  return false;
};

export const resolveMediaUrl = (url: string | null | undefined) => {
  if (!url) return null;

  const apiOrigin = appConfig.apiBaseUrl.replace(/\/api\/v1\/?$/, "");

  if (!url.startsWith("http")) {
    return `${apiOrigin}${url.startsWith("/") ? "" : "/"}${url}`;
  }

  try {
    const parsed = new URL(url);
    if (parsed.pathname.startsWith("/uploads/") && isPrivateOrLocalHost(parsed.hostname)) {
      const currentApi = new URL(apiOrigin);
      parsed.protocol = currentApi.protocol;
      parsed.host = currentApi.host;
      return parsed.toString();
    }
    return url;
  } catch {
    return url;
  }
};
