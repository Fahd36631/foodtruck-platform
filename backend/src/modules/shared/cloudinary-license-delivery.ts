/**
 * Derive delivery metadata from stored Cloudinary HTTPS URLs (no extra DB columns).
 * Used for admin pending truck diagnostics + normalizing PDF Raw URLs for clients.
 */

export type CloudinaryLicenseDerived = {
  license_file_public_id: string | null;
  license_file_resource_type: "raw" | "image" | "video" | null;
  license_file_format: string | null;
};

const RESOURCE_IN_PATH = /^\/[^/]+\/(raw|image|video)\/upload\/(.+)$/i;

const inferFormatFromPublicIdTail = (publicId: string | null): string | null => {
  if (!publicId?.trim()) return null;
  const last = publicId.split("/").filter(Boolean).pop() ?? "";
  const m = last.match(/\.([a-z0-9]{1,24})$/i);
  return m?.[1] ? m[1].toLowerCase() : null;
};

/**
 * After `/upload/`, strip known transform segments, then strip an optional `v123` version prefix.
 */
const extractPublicIdFromUploadTail = (uploadTail: string): string => {
  const parts = uploadTail.split("/").filter(Boolean);
  let i = 0;
  while (i < parts.length) {
    const s = parts[i] ?? "";
    if (s.includes(",")) {
      i += 1;
      continue;
    }
    if (/^fl_attachment(?:[:/]|$)/i.test(s)) {
      i += 1;
      continue;
    }
    break;
  }
  const rest = parts.slice(i);
  if (rest.length === 0) return uploadTail.trim();
  if (/^v\d+$/i.test(rest[0] ?? "")) {
    return rest.slice(1).join("/");
  }
  return rest.join("/");
};

export const deriveCloudinaryLicenseFields = (storedUrl: string | null | undefined): CloudinaryLicenseDerived => {
  const empty: CloudinaryLicenseDerived = {
    license_file_public_id: null,
    license_file_resource_type: null,
    license_file_format: null
  };

  const raw = storedUrl?.trim();
  if (!raw || !raw.includes("cloudinary.com")) {
    return empty;
  }

  try {
    const u = new URL(raw);
    const m = u.pathname.match(RESOURCE_IN_PATH);
    if (!m?.[1] || !m[2]) return empty;

    const resource = m[1].toLowerCase() as "raw" | "image" | "video";
    const publicId = extractPublicIdFromUploadTail(m[2]);
    const extFmt = inferFormatFromPublicIdTail(publicId);
    const lastSeg = publicId.split("/").filter(Boolean).pop() ?? "";
    const hasExtension = /\.[a-z0-9]{2,24}$/i.test(lastSeg);
    const formatGuess = extFmt ?? (resource === "raw" && !hasExtension ? "pdf" : null);

    return {
      license_file_public_id: publicId.trim().length ? publicId : null,
      license_file_resource_type: resource,
      license_file_format: formatGuess
    };
  } catch {
    return empty;
  }
};

/** Append `.pdf` for Cloudinary raw delivery URLs that have no explicit extension (iOS MIME). */
export const finalizePdfRawHttpsUrlIfNeeded = (url: string): string => {
  const t = url.trim();
  if (!t.includes("cloudinary.com")) return t;

  const pathOnly = t.split(/[?#]/)[0] ?? t;
  const lowerPath = pathOnly.toLowerCase();
  if (!lowerPath.includes("/raw/upload/")) return t;

  if (lowerPath.endsWith(".pdf")) return t;
  if (/\.[a-z0-9]{2,12}$/.test(lowerPath.split("/").pop() ?? "")) return t;

  return `${t}.pdf`;
};

export const effectiveLicenseFileUrl = (storedUrl: string | null | undefined): string | null => {
  const s = storedUrl?.trim() ?? "";
  if (!s) return null;
  return finalizePdfRawHttpsUrlIfNeeded(s);
};
