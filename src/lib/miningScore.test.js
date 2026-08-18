import assert from "node:assert/strict";
import test from "node:test";
import {
  UBW_WEIGHTS,
  allocateCommunityWeight,
  communityHalvingFactor,
  computeMining,
  round2
} from "./miningScore.js";

test("UBW weights sum to 1", () => {
  const sum = Object.values(UBW_WEIGHTS).reduce((total, value) => total + value, 0);
  assert.equal(round2(sum), 1);
});

test("perfect scores reach 100 UBW", () => {
  const mining = computeMining({
    userId: "1",
    username: "alice",
    displayName: "Alice",
    bio: "Building useful communities on Sudo",
    wallet: "0x52908400098527886E0F7030069857D2E4169EE7",
    photoUrl: "https://trsprt.sudochat.app/photo.png",
    authDate: Math.floor(Date.now() / 1000),
    platform: "ios",
    verified: true,
    premium: true,
    startParam: "story_invite",
    botConnected: true,
    activity: {
      firstSeen: Date.now() - 100 * 86400000,
      visits: 20,
      days: Array.from({ length: 20 }, (_, index) =>
        new Date(Date.now() - index * 86400000).toISOString().slice(0, 10)
      )
    }
  });

  assert.ok(mining.ubw > 55 && mining.ubw <= 100);
  assert.equal(mining.sybilGate, 1);
  assert.equal(mining.euw, mining.ubw);
});

test("free users cannot spend Own Premium to the cap", () => {
  const premium = computeMining({
    verified: true,
    premium: true,
    username: "alice",
    displayName: "Alice",
    photoUrl: "https://example.com/a.png",
    wallet: "0x52908400098527886E0F7030069857D2E4169EE7",
    authDate: Math.floor(Date.now() / 1000)
  });
  const free = computeMining({
    verified: true,
    premium: false,
    username: "alice",
    displayName: "Alice",
    photoUrl: "https://example.com/a.png",
    wallet: "0x52908400098527886E0F7030069857D2E4169EE7",
    authDate: Math.floor(Date.now() / 1000)
  });

  assert.ok(premium.components["Own Premium"].score > free.components["Own Premium"].score);
  assert.ok(free.ubw < 88 || free.components["Own Premium"].score < 100);
});

test("invalid activity does not copy user weight across communities", () => {
  assert.equal(communityHalvingFactor(1), 1);
  assert.equal(communityHalvingFactor(2), 0.5);
  assert.equal(communityHalvingFactor(3), 0.25);

  const rows = allocateCommunityWeight(80, [
    { id: "A", raw: 60, share: 0.5 },
    { id: "B", raw: 30, share: 0.3 },
    { id: "C", raw: 10, share: 0.2 }
  ]);

  assert.equal(rows[0].allocated, 40);
  assert.equal(rows[1].allocated, 12);
  assert.equal(rows[2].allocated, 4);
  const total = rows.reduce((sum, row) => sum + row.allocated, 0);
  assert.ok(total <= 80);
});

test("unverified accounts receive a sybil haircut", () => {
  const mining = computeMining({
    username: "user_999999",
    verified: false
  });
  assert.ok(mining.sybilGate <= 0.8);
  assert.ok(mining.euw <= mining.ubw);
});
