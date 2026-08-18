import { isAllowedAvatarHost, normalizePhotoUrl } from "../../lib/sudoPhoto.js";

export const prerender = false;

function reject(status, message) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

export async function GET({ request }) {
  const incoming = new URL(request.url);
  const raw = incoming.searchParams.get("u") || "";
  const normalized = normalizePhotoUrl(raw);

  if (!normalized || normalized.startsWith("data:")) {
    return reject(400, "invalid avatar url");
  }

  let target;
  try {
    target = new URL(normalized);
  } catch {
    return reject(400, "invalid avatar url");
  }

  if (target.protocol !== "https:" || !isAllowedAvatarHost(target.hostname)) {
    return reject(400, "host not allowed");
  }

  const imageKey = target.searchParams.get("imageKey") || "";
  const headers = { Accept: "image/*" };
  if (imageKey) headers.imageKey = imageKey;

  const upstream = await fetch(target.href, { headers });
  if (!upstream.ok) {
    return new Response(null, { status: upstream.status });
  }

  const contentType = upstream.headers.get("content-type") || "image/jpeg";
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=300"
    }
  });
}
