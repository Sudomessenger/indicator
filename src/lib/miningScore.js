/** SUDO Economic Design — user-layer mining score (eq. 4–10). */

export const UBW_WEIGHTS = {
  trust: 0.2,
  premium: 0.12,
  premiumNetwork: 0.12,
  web3: 0.36,
  referrals: 0.1,
  consistency: 0.1
};

export const FILTER_SCHEMA = {
  Trust: [
    { key: "A", label: "Account age", weight: 0.15 },
    { key: "D", label: "Device", weight: 0.2 },
    { key: "H", label: "Human confidence", weight: 0.15 },
    { key: "WR", label: "Wallet reputation", weight: 0.15 },
    { key: "BR", label: "Behaviour", weight: 0.15 },
    { key: "SR", label: "Successful record", weight: 0.1 },
    { key: "SF", label: "Spam-free", weight: 0.1 }
  ],
  "Own Premium": [
    { key: "AS", label: "Active status", weight: 0.55 },
    { key: "PT", label: "Tenure", weight: 0.2 },
    { key: "RN", label: "Renewals", weight: 0.15 },
    { key: "PU", label: "Feature use", weight: 0.1 }
  ],
  "Premium network": [
    { key: "PP", label: "Unique Premium peers", weight: 0.35 },
    { key: "PG", label: "Premium groups", weight: 0.3 },
    { key: "PC", label: "Premium channels", weight: 0.15 },
    { key: "PQ", label: "Quality", weight: 0.1 },
    { key: "PD", label: "Diversity", weight: 0.1 }
  ],
  "Web3 utility": [
    { key: "F", label: "Frequency", weight: 0.15 },
    { key: "Div", label: "Diversity", weight: 0.15 },
    { key: "Val", label: "Value", weight: 0.15 },
    { key: "Rec", label: "Recency", weight: 0.15 },
    { key: "Uniq", label: "Uniqueness", weight: 0.15 },
    { key: "Set", label: "Settlement", weight: 0.15 },
    { key: "Imp", label: "Importance", weight: 0.1 }
  ],
  "Mature referrals": [
    { key: "RU", label: "Uniqueness", weight: 0.3 },
    { key: "RM", label: "Maturity", weight: 0.25 },
    { key: "RA", label: "Activity", weight: 0.2 },
    { key: "RT", label: "Trust", weight: 0.15 },
    { key: "RD", label: "Diversity", weight: 0.1 }
  ],
  Consistency: [
    { key: "CD", label: "Active days", weight: 0.25 },
    { key: "CR", label: "Regularity", weight: 0.2 },
    { key: "CC", label: "Chat", weight: 0.15 },
    { key: "CG", label: "Groups", weight: 0.15 },
    { key: "CO", label: "Content", weight: 0.1 },
    { key: "CW", label: "Web3 regularity", weight: 0.1 },
    { key: "CS", label: "Spam-free", weight: 0.05 }
  ]
};

export const FILTER_CHIPS = Object.keys(FILTER_SCHEMA);

const NEUTRAL = 32;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export function round2(value) {
  return Math.round(Number(value) * 100) / 100;
}

export function logCap(count, cap = 8) {
  const n = Math.min(Math.max(Number(count) || 0, 0), cap);
  if (n <= 0) return 0;
  return 100 * Math.log1p(n) / Math.log1p(cap);
}

export function parseWallet(raw) {
  const value = String(raw || "").trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
    return { ok: false, address: "", mixed: false, zero: false };
  }

  const address = value.toLowerCase();
  const zero = address === ZERO_ADDRESS;
  const body = value.slice(2);
  const mixed = /[a-f]/.test(body) && /[A-F]/.test(body);

  return { ok: !zero, address, mixed, zero };
}

export function looksLikeFarmUsername(username) {
  const value = String(username || "").trim();
  if (!value) return false;
  if (/^(user|guest|sudo|wallet|anon|0x)[_-]?\d{3,}$/i.test(value)) return true;
  if (/^[0-9]{6,}$/.test(value)) return true;
  return false;
}

function utcDay(ms = Date.now()) {
  return new Date(ms).toISOString().slice(0, 10);
}

function daysBetween(fromMs, toMs = Date.now()) {
  if (!fromMs) return 0;
  return Math.max(0, (toMs - fromMs) / 86400000);
}

function recencyScore(authDate) {
  const ts = Number(authDate);
  if (!Number.isFinite(ts) || ts <= 0) return NEUTRAL;
  const hours = (Date.now() / 1000 - ts) / 3600;
  if (hours < 1) return 96;
  if (hours < 6) return 88;
  if (hours < 24) return 78;
  if (hours < 72) return 60;
  if (hours < 168) return 45;
  return 28;
}

function accountAgeScore(userId, firstSeen) {
  const id = Number(userId);
  let fromId = NEUTRAL;
  if (Number.isFinite(id) && id > 0) {
    fromId = clamp(100 - Math.log10(id + 1) * 22, 22, 94);
  }

  const tenureDays = daysBetween(firstSeen);
  const fromTenure = firstSeen ? clamp(NEUTRAL + tenureDays * 0.7, NEUTRAL, 90) : NEUTRAL;
  return round2(Math.max(fromId, fromTenure));
}

function deviceScore(platform) {
  const value = String(platform || "").toLowerCase();
  if (!value) return { score: NEUTRAL, signal: "Unknown device" };
  if (/(iphone|ipad|ios|android)/.test(value)) {
    return { score: 82, signal: platform };
  }
  if (/(macos|tdesktop|desktop|win|linux)/.test(value)) {
    return { score: 58, signal: platform };
  }
  if (/(web|unknown)/.test(value)) {
    return { score: 46, signal: platform };
  }
  return { score: 52, signal: platform };
}

function weighted(parts, schema) {
  return round2(
    schema.reduce((sum, item) => sum + (Number(parts[item.key]) || 0) * item.weight, 0)
  );
}

function partList(schema, parts, signals = {}) {
  return schema.map((item) => ({
    key: item.key,
    label: item.label,
    weight: item.weight,
    score: round2(parts[item.key] ?? NEUTRAL),
    signal: signals[item.key] || ""
  }));
}

export function communityHalvingFactor(rank) {
  return 1 / 2 ** (rank - 1);
}

export function allocateCommunityWeight(effectiveUserWeight, shares) {
  const ranked = [...shares].sort((a, b) => b.raw - a.raw);
  return ranked.map((item, index) => {
    const rank = index + 1;
    const factor = communityHalvingFactor(rank);
    const allocated = effectiveUserWeight * item.share * factor;
    return {
      ...item,
      rank,
      factor,
      allocated: round2(allocated)
    };
  });
}

export function computeMining(input = {}) {
  const wallet = parseWallet(input.wallet);
  const username = String(input.username || "").trim();
  const displayName = String(input.displayName || "").trim();
  const bio = String(input.bio || "").trim();
  const photo = Boolean(String(input.photoUrl || input.photoThumb || "").trim());
  const verified = Boolean(input.verified);
  const premium = Boolean(input.premium);
  const startParam = String(input.startParam || "").trim();
  const platform = String(input.platform || "").trim();
  const activity = input.activity || {};
  const days = Array.isArray(activity.days) ? activity.days : [];
  const recentDays = days.filter((day) => daysBetween(Date.parse(`${day}T00:00:00Z`)) <= 30);
  const visits = Number(activity.visits) || recentDays.length || (verified ? 1 : 0);
  const farm = looksLikeFarmUsername(username);
  const device = deviceScore(platform);

  const trustParts = {
    A: accountAgeScore(input.userId, activity.firstSeen),
    D: device.score,
    H: clamp((verified ? 78 : 38) + (photo ? 8 : 0) + (displayName ? 4 : 0)),
    WR: wallet.ok ? (wallet.mixed ? 78 : 64) : wallet.zero ? 8 : 28,
    BR: clamp(
      18 +
        (displayName ? 18 : 0) +
        (username && !farm ? 22 : username ? 8 : 0) +
        (bio.length > 8 ? 18 : bio ? 8 : 0) +
        (photo ? 16 : 0)
    ),
    SR: clamp(
      20 +
        (wallet.ok ? 22 : 0) +
        (username ? 12 : 0) +
        (photo ? 10 : 0) +
        (input.botConnected ? 12 : 0) +
        (verified ? 10 : 0)
    ),
    SF: clamp((verified ? 80 : 42) - (farm ? 24 : 0) + (bio.length > 120 ? -8 : 0))
  };

  const tenure = clamp(NEUTRAL + daysBetween(activity.firstSeen) * 0.55, NEUTRAL, 88);
  const premiumParts = {
    AS: premium ? clamp(70 + recencyScore(input.authDate) * 0.2) : clamp(18 + recencyScore(input.authDate) * 0.18),
    PT: premium ? clamp(tenure + 12) : clamp(tenure * 0.45, 18, 36),
    RN: premium ? 58 : 20,
    PU: clamp(22 + (verified ? 14 : 0) + (photo ? 8 : 0) + (wallet.ok ? 8 : 0) + (startParam ? 6 : 0), 18, premium ? 86 : 52)
  };

  const networkParts = {
    PP: startParam ? 44 : username ? 28 : 22,
    PG: premium ? 40 : 22,
    PC: premium ? 36 : 22,
    PQ: clamp(24 + (photo ? 12 : 0) + (bio.length > 8 ? 14 : 0) + (verified ? 10 : 0)),
    PD: clamp(20 + (wallet.ok ? 14 : 0) + (username ? 10 : 0) + (photo ? 8 : 0) + (startParam ? 10 : 0))
  };

  const validity = wallet.ok ? 1 : 0.45;
  const web3Raw = {
    F: logCap(Math.max(visits, recentDays.length), 8),
    Div: clamp((wallet.ok ? 34 : 12) + (verified ? 18 : 0) + (startParam ? 12 : 0) + (premium ? 10 : 0)),
    Val: wallet.ok ? 28 : 16,
    Rec: recencyScore(input.authDate),
    Uniq: wallet.ok ? (wallet.mixed ? 74 : 62) : 24,
    Set: wallet.ok ? 70 : 24,
    Imp: wallet.ok ? 68 : 30
  };
  const web3Parts = Object.fromEntries(
    Object.entries(web3Raw).map(([key, value]) => [key, round2(value * validity)])
  );

  const referralParts = {
    RU: startParam ? 48 : username && wallet.ok ? 34 : 22,
    RM: clamp(18 + Math.min(daysBetween(activity.firstSeen), 90) * 0.2),
    RA: clamp(20 + Math.min(recentDays.length, 12) * 3 + (verified ? 8 : 0)),
    RT: clamp((trustParts.H + trustParts.SF) / 2),
    RD: startParam ? 36 : 20
  };

  const regularity =
    recentDays.length >= 8
      ? 72
      : recentDays.length >= 4
        ? 58
        : recentDays.length >= 2
          ? 44
          : visits > 0
            ? 36
            : NEUTRAL;

  const consistencyParts = {
    CD: clamp(logCap(recentDays.length || (verified ? 1 : 0), 12) + (verified ? 8 : 0)),
    CR: regularity,
    CC: clamp(22 + (displayName ? 14 : 0) + (bio ? 16 : 0) + (verified ? 12 : 0)),
    CG: startParam ? 46 : username ? 34 : 24,
    CO: clamp(20 + (photo ? 18 : 0) + (bio.length > 8 ? 16 : 0) + (displayName ? 10 : 0)),
    CW: clamp((wallet.ok ? 40 : 18) + logCap(recentDays.length, 10) * 0.4),
    CS: trustParts.SF
  };

  const T = weighted(trustParts, FILTER_SCHEMA.Trust);
  const P = weighted(premiumParts, FILTER_SCHEMA["Own Premium"]);
  const PN = weighted(networkParts, FILTER_SCHEMA["Premium network"]);
  const W = weighted(web3Parts, FILTER_SCHEMA["Web3 utility"]);
  const R = weighted(referralParts, FILTER_SCHEMA["Mature referrals"]);
  const C = weighted(consistencyParts, FILTER_SCHEMA.Consistency);

  const ubw = round2(
    UBW_WEIGHTS.trust * T +
      UBW_WEIGHTS.premium * P +
      UBW_WEIGHTS.premiumNetwork * PN +
      UBW_WEIGHTS.web3 * W +
      UBW_WEIGHTS.referrals * R +
      UBW_WEIGHTS.consistency * C
  );

  let sybilGate = 1;
  let sybilLabel = "Low risk";
  const sybilReasons = [];

  if (!verified) {
    sybilGate = Math.min(sybilGate, 0.8);
    sybilReasons.push("Unverified session");
  }
  if (!wallet.ok) {
    sybilGate = Math.min(sybilGate, 0.8);
    sybilReasons.push("No settled wallet");
  }
  if (farm && !wallet.ok && !photo) {
    sybilGate = 0.4;
    sybilReasons.push("Farm-like identity");
    sybilLabel = "High risk";
  } else if (sybilGate < 1) {
    sybilLabel = "Moderate risk";
  }
  if (verified && wallet.ok && username && photo) {
    sybilGate = 1;
    sybilLabel = "Low risk";
    sybilReasons.length = 0;
  }

  const euw = round2(ubw * sybilGate);
  const workpower = round2(euw / 100);

  const signals = {
    Trust: {
      A: input.userId ? `ID ${input.userId}` : "Partial age",
      D: device.signal,
      H: verified ? "Verified session" : "Preview only",
      WR: wallet.ok ? (wallet.mixed ? "Checksum wallet" : "Wallet linked") : "No wallet",
      BR: bio || displayName || "Limited profile",
      SR: input.botConnected ? "Bot API live" : username ? `@${username}` : "Partial record",
      SF: farm ? "Farm-like username" : verified ? "Clean session" : "Unverified"
    },
    "Own Premium": {
      AS: premium ? "Premium active" : "Free user",
      PT: activity.firstSeen ? `${Math.floor(daysBetween(activity.firstSeen))}d seen` : "New to indicator",
      RN: premium ? "Subscriber" : "No renewals",
      PU: verified ? "Mini app open" : "Preview use"
    },
    "Premium network": {
      PP: startParam ? "Story / start param" : "No peer graph yet",
      PG: "Awaiting community feed",
      PC: "Awaiting community feed",
      PQ: photo || bio ? "Profile quality" : "Sparse profile",
      PD: [wallet.ok && "wallet", username && "username", photo && "photo"].filter(Boolean).join(" · ") || "Narrow"
    },
    "Web3 utility": {
      F: `${recentDays.length || visits} day${(recentDays.length || visits) === 1 ? "" : "s"}`,
      Div: wallet.ok ? "Wallet utility" : "Identity only",
      Val: "Volume not exposed",
      Rec: input.authDate ? utcDay(Number(input.authDate) * 1000) : "No auth date",
      Uniq: wallet.ok ? wallet.address.slice(0, 6) + "…" + wallet.address.slice(-4) : "No counterparty",
      Set: wallet.ok ? "Valid address" : "Unset",
      Imp: wallet.ok ? "Wallet bind" : "Session only"
    },
    "Mature referrals": {
      RU: startParam ? "Inbound start param" : "No referral object",
      RM: "Matures over 90 days",
      RA: `${recentDays.length} active days`,
      RT: verified ? "Trusted session" : "Preview trust",
      RD: startParam ? "Story route" : "Single path"
    },
    Consistency: {
      CD: `${recentDays.length}/30 days`,
      CR: `${visits} visit${visits === 1 ? "" : "s"}`,
      CC: displayName || "No chat handle",
      CG: startParam ? "Community entry" : "No group feed",
      CO: photo ? "Photo present" : "No media",
      CW: wallet.ok ? "Wallet regular" : "No Web3 cadence",
      CS: verified ? "Clean" : "Unverified"
    }
  };

  const components = {
    Trust: { score: T, weight: UBW_WEIGHTS.trust, parts: partList(FILTER_SCHEMA.Trust, trustParts, signals.Trust) },
    "Own Premium": {
      score: P,
      weight: UBW_WEIGHTS.premium,
      parts: partList(FILTER_SCHEMA["Own Premium"], premiumParts, signals["Own Premium"])
    },
    "Premium network": {
      score: PN,
      weight: UBW_WEIGHTS.premiumNetwork,
      parts: partList(FILTER_SCHEMA["Premium network"], networkParts, signals["Premium network"])
    },
    "Web3 utility": {
      score: W,
      weight: UBW_WEIGHTS.web3,
      parts: partList(FILTER_SCHEMA["Web3 utility"], web3Parts, signals["Web3 utility"])
    },
    "Mature referrals": {
      score: R,
      weight: UBW_WEIGHTS.referrals,
      parts: partList(FILTER_SCHEMA["Mature referrals"], referralParts, signals["Mature referrals"])
    },
    Consistency: {
      score: C,
      weight: UBW_WEIGHTS.consistency,
      parts: partList(FILTER_SCHEMA.Consistency, consistencyParts, signals.Consistency)
    }
  };

  return {
    ubw,
    euw,
    workpower,
    sybilGate,
    sybilLabel,
    sybilReasons,
    premium,
    validity,
    components,
    shortcuts: [
      { id: "Trust", label: "Trust", score: T },
      { id: "Own Premium", label: "Premium", score: P },
      { id: "Web3 utility", label: "Web3", score: W },
      { id: "Consistency", label: "Consistency", score: C }
    ]
  };
}

export function emptyMining() {
  return computeMining({});
}
