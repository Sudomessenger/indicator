const SUDO_GET_IMAGE = "https://trsprt.sudochat.app/api/user/get-image";

function normalizePhotoUrl(raw) {
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

function avatarSrc(photoUrl) {
  const normalized = normalizePhotoUrl(photoUrl);
  if (!normalized) return "";
  if (normalized.startsWith("data:")) return normalized;

  try {
    const { hostname, protocol } = new URL(normalized);
    if (protocol === "https:" && (hostname.endsWith(".sudochat.app") || hostname === "sdo.to")) {
      return new URL(`./api/avatar?u=${encodeURIComponent(normalized)}`, location.href).href;
    }
  } catch {}

  return normalized;
}

function initDataFromHash() {
  const hash = location.hash.replace(/^#/, "");
  const params = new URLSearchParams(hash);
  return decodeURIComponent(params.get("sudoWebAppData") || params.get("tgWebAppData") || "");
}

function readHostPhoto() {
  return window.__SUDO_USER_PHOTO_DATA_URL__ || window.__SUDO_USER_PHOTO_URL__ || "";
}

function readPlatform() {
  const hash = location.hash.replace(/^#/, "");
  const params = new URLSearchParams(hash);
  const raw =
    window.Sudo?.WebApp?.platform ||
    window.Telegram?.WebApp?.platform ||
    params.get("sudoWebAppPlatform") ||
    "";
  const platform = String(raw).trim();
  if (!platform) return "";
  return platform.charAt(0).toUpperCase() + platform.slice(1);
}

function readStartParam() {
  const unsafe =
    window.Sudo?.WebApp?.initDataUnsafe ||
    window.Telegram?.WebApp?.initDataUnsafe ||
    {};
  return unsafe.start_param || null;
}

function readAuthDate() {
  const unsafe =
    window.Sudo?.WebApp?.initDataUnsafe ||
    window.Telegram?.WebApp?.initDataUnsafe ||
    {};
  const value = Number(unsafe.auth_date);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function publishProfile(profile) {
  if (!profile) return;
  window.__SUDO_PROFILE__ = profile;
  window.dispatchEvent(new CustomEvent("sudo-profile", { detail: profile }));
}

function readSudoUserPreview() {
  const user = window.Sudo?.WebApp?.initDataUnsafe?.user;
  if (!user) return null;

  const hostPhoto = readHostPhoto();
  const photoUrl = normalizePhotoUrl(hostPhoto || user.photo_url || "");
  const photoThumb = normalizePhotoUrl(hostPhoto || user.photo_url_small || user.photo_url || "");

  return {
    userId: String(user.user_id || user.id || ""),
    username: user.username || "",
    displayName: user.display_name || user.first_name || user.username || "",
    firstName: user.first_name || "",
    bio: user.bio || "",
    wallet: String(user.wallet_address || "").toLowerCase(),
    photoUrl,
    photoThumb,
    authDate: readAuthDate(),
    startParam: readStartParam(),
    platform: readPlatform(),
    verified: false
  };
}

function initialsFrom(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "SU";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function applyProfile(profile) {
  if (!profile) return;

  const merged = {
    platform: readPlatform(),
    startParam: readStartParam(),
    authDate: profile.authDate || readAuthDate(),
    ...profile
  };

  const usernameEl = document.querySelector("[data-username]");
  const nameEl = document.querySelector("[data-display-name]");
  const initialsEl = document.querySelector("[data-avatar-initials]");
  const imgEl = document.querySelector("[data-avatar-img]");

  const username = merged.username ? `@${merged.username}` : "@user";
  const displayName = merged.displayName || merged.username || "Sudo user";

  if (usernameEl) usernameEl.textContent = username;
  if (nameEl) nameEl.textContent = displayName;
  if (initialsEl) initialsEl.textContent = initialsFrom(displayName);

  const src = avatarSrc(merged.photoThumb || merged.photoUrl);
  if (imgEl && src) {
    imgEl.onload = () => {
      imgEl.hidden = false;
      if (initialsEl) initialsEl.hidden = true;
    };
    imgEl.onerror = () => {
      imgEl.hidden = true;
      if (initialsEl) initialsEl.hidden = false;
    };
    imgEl.alt = displayName;
    imgEl.src = src;
  }

  publishProfile(merged);
}

async function loadVerifiedProfile() {
  const initData = window.Sudo?.WebApp?.initData || initDataFromHash();
  if (!initData) return null;

  const res = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData })
  });

  if (!res.ok) return null;
  const session = await res.json();
  if (!session?.ok) return null;
  return session;
}

async function bootSudoUser() {
  applyProfile(readSudoUserPreview());

  const hostPhoto = readHostPhoto();
  if (hostPhoto) {
    applyProfile({
      ...(readSudoUserPreview() || {}),
      photoUrl: hostPhoto,
      photoThumb: hostPhoto
    });
  }

  try {
    const verified = await loadVerifiedProfile();
    if (verified) applyProfile(verified);
  } catch {}
}

bootSudoUser();
window.addEventListener("sudo-user-ready", () => {
  const preview = readSudoUserPreview() || {};
  const hostPhoto = readHostPhoto();
  applyProfile({
    ...preview,
    photoUrl: hostPhoto || preview.photoUrl,
    photoThumb: hostPhoto || preview.photoThumb
  });
});
window.addEventListener("sudo-mini-app-bridge-ready", bootSudoUser);
