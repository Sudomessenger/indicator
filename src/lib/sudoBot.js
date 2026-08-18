const API_ROOT = process.env.SUDO_BOT_API_ROOT || "https://trsprt.sudochat.app";

let cachedMe = { at: 0, value: null, error: null };
const ME_TTL_MS = 10 * 60 * 1000;

export function botApiUrl(method) {
  return `${API_ROOT.replace(/\/$/, "")}/api/bot-api/${method}`;
}

export async function callBotApi(method, body = {}) {
  const token = process.env.SUDO_BOT_TOKEN;
  if (!token) {
    throw new Error("missing bot token");
  }

  const res = await fetch(botApiUrl(method), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  const data = await res.json().catch(() => ({}));
  if (!data?.ok) {
    const error = new Error(data?.description || res.statusText || "bot api error");
    error.status = data?.error_code || res.status;
    throw error;
  }

  return data.result;
}

export async function getMe(force = false) {
  const now = Date.now();
  if (!force && cachedMe.value && now - cachedMe.at < ME_TTL_MS) {
    return cachedMe.value;
  }

  try {
    const result = await callBotApi("getMe");
    cachedMe = { at: now, value: result, error: null };
    return result;
  } catch (error) {
    cachedMe = {
      at: now,
      value: null,
      error: error instanceof Error ? error.message : "bot api error"
    };
    throw error;
  }
}

export function publicBotIdentity(me) {
  if (!me || typeof me !== "object") {
    return { connected: false };
  }

  return {
    connected: true,
    id: me.id ?? me.user_id ?? null,
    username: me.username || "",
    firstName: me.first_name || me.display_name || ""
  };
}
