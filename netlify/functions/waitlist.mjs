// POST /api/waitlist {email}: saves the address in the "waitlist" Netlify Blobs store, one entry per email
// (the key), holding when they joined. List them with: netlify blobs:list waitlist
import { getStore } from "@netlify/blobs";

const json = (body, status = 200) => Response.json(body, { status });

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Bad request." }, 400);
  }
  // Bots fill in the hidden "company" field; pretend it worked.
  if (body.company) return json({ ok: true });
  const email = String(body.email || "").trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(email)) {
    return json({ error: "Enter a valid email address." }, 400);
  }

  try {
    const store = getStore({ name: "waitlist", consistency: "strong" });
    if (await store.getMetadata(email)) return json({ ok: true, duplicate: true });
    const joinedAt = new Date().toISOString();
    await store.setJSON(email, { email, joinedAt, userAgent: req.headers.get("user-agent") || "" }, { metadata: { joinedAt } });
    return json({ ok: true });
  } catch (err) {
    console.error("waitlist:", err);
    return json({ error: "Couldn't add you right now. Try again in a minute." }, 502);
  }
};

export const config = { path: "/api/waitlist" };
