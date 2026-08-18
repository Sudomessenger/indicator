import { parseVerifiedUser } from "../../lib/sudoAuth.js";

export const prerender = false;

export async function POST({ request }) {
  try {
    const body = await request.json();
    const profile = parseVerifiedUser(
      body?.initData,
      process.env.SUDO_BOT_TOKEN,
      86400
    );

    return new Response(
      JSON.stringify({
        ok: true,
        ...profile
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
