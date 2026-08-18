import { parseVerifiedUser } from "../../lib/sudoAuth.js";
import { computeMining } from "../../lib/miningScore.js";
import { recordVisit } from "../../lib/activityStore.js";
import { getMe, publicBotIdentity } from "../../lib/sudoBot.js";

export const prerender = false;

function miningInput(profile, extras = {}) {
  return {
    userId: profile.userId,
    username: profile.username,
    displayName: profile.displayName,
    bio: profile.bio,
    wallet: profile.wallet,
    photoUrl: profile.photoUrl || profile.photoThumb,
    photoThumb: profile.photoThumb,
    authDate: profile.authDate,
    platform: extras.platform || profile.platform || "",
    verified: Boolean(profile.verified),
    startParam: profile.startParam,
    premium: Boolean(profile.premium),
    activity: extras.activity,
    botConnected: Boolean(extras.botConnected)
  };
}

export async function POST({ request }) {
  try {
    const body = await request.json();
    const profile = parseVerifiedUser(
      body?.initData,
      process.env.SUDO_BOT_TOKEN,
      86400
    );

    const [activity, bot] = await Promise.all([
      recordVisit(profile.userId).catch(() => null),
      getMe().then(publicBotIdentity).catch(() => ({ connected: false }))
    ]);

    const mining = computeMining(
      miningInput(profile, {
        platform: body?.platform,
        activity,
        botConnected: bot.connected
      })
    );

    return new Response(
      JSON.stringify({
        ok: true,
        ...profile,
        platform: body?.platform || profile.platform || "",
        bot,
        mining
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "Unauthorized"
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
