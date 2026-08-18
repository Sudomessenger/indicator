export const SUDO_GET_IMAGE = "https://trsprt.sudochat.app/api/user/get-image";

export function normalizePhotoUrl(raw) {
  if (!raw || typeof raw !== "string") return "";
  const url = raw.trim();
  if (!url) return "";
  if (url.startsWith("data:")) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("uploads/")) {
    return `${SUDO_GET_IMAGE}?imageKey=${encodeURIComponent(url)}`;
  }
  if (url.startsWith("/api/image-proxy")) {
    return `https://server.sudochat.app${url}`;
  }
  return url;
}

export function isAllowedAvatarHost(hostname) {
  return hostname === "sdo.to" || hostname.endsWith(".sudochat.app");
}

export function extractPhotoFields(user) {
  const raw =
    user.photo_url ||
    user.photoUrl ||
    user.avatar_url ||
    user.profile_photo ||
    "";
  const thumb =
    user.photo_url_small ||
    user.photoUrlSmall ||
    user.avatar_url_small ||
    raw;

  return {
    photoUrl: normalizePhotoUrl(raw),
    photoThumb: normalizePhotoUrl(thumb) || normalizePhotoUrl(raw)
  };
}
