import { createHmac, timingSafeEqual } from "node:crypto";
import { extractPhotoFields } from "./sudoPhoto.js";

export function verifyInitData(initData, botToken, maxAgeSec = 86400) {
  if (!initData || typeof initData !== "string") {
    return { ok: false, error: "missing initData" };
  }

  if (!botToken) {
    return { ok: false, error: "missing bot token" };
  }

  const params = new URLSearchParams(initData.trim());
  const hash = params.get("hash");
  if (!hash) return { ok: false, error: "missing hash" };

  const fields = {};
  for (const [key, value] of params.entries()) {
    if (key !== "hash") fields[key] = value;
  }

  const dataCheckString = Object.keys(fields)
    .sort()
    .map((key) => `${key}=${fields[key]}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expected = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, error: "invalid hash" };
  }

  const authDate = parseInt(fields.auth_date, 10);
  if (!Number.isFinite(authDate)) {
    return { ok: false, error: "missing auth_date" };
  }
  if (maxAgeSec > 0 && Math.floor(Date.now() / 1000) - authDate > maxAgeSec) {
    return { ok: false, error: "initData expired" };
  }

  return { ok: true, data: fields };
}

export function parseVerifiedUser(initData, botToken, maxAgeSec = 86400) {
  const result = verifyInitData(initData, botToken, maxAgeSec);
  if (!result.ok) throw new Error(result.error);

  const user = JSON.parse(result.data.user || "{}");
  const photos = extractPhotoFields(user);
  const premiumUntil = Number(user.premium_until || user.premiumUntil || 0);
  const premium = Boolean(
    user.premium ||
      user.is_premium ||
      user.isPremium ||
      (Number.isFinite(premiumUntil) && premiumUntil > Date.now() / 1000)
  );

  return {
    userId: String(user.user_id || user.id || ""),
    username: user.username || "",
    displayName: user.display_name || user.first_name || user.username || "",
    firstName: user.first_name || "",
    bio: user.bio || "",
    wallet: String(user.wallet_address || "").toLowerCase(),
    photoUrl: photos.photoUrl,
    photoThumb: photos.photoThumb,
    authDate: Number(result.data.auth_date),
    startParam: result.data.start_param || result.data.startParam || null,
    platform: result.data.platform || "",
    premium,
    premiumUntil: Number.isFinite(premiumUntil) && premiumUntil > 0 ? premiumUntil : null,
    verified: true
  };
}
