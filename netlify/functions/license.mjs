// OptHelper lifetime license, paid once through Razorpay. A license belongs to one Mac: the app makes a random
// device id, sends it to /buy, and the payment is recorded against it, so there is no key to type.
//
//   POST /api/license/checkout  {device}                      -> creates a Razorpay order (INR in India, USD elsewhere)
//   POST /api/license/verify    {order_id,payment_id,signature} -> checks the checkout result and unlocks the device
//   POST /api/license/webhook   Razorpay payment.captured     -> unlocks the device too (covers a closed tab)
//   GET  /api/license/status?d=<device>                       -> {paid}
//   POST /api/license/transfer  {device,email,paymentId}      -> moves a paid license to a new Mac
//
// Env vars (Netlify): RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET.
import { createHmac, timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";

export const PRICES = { INR: 17900, USD: 299 }; // paise / cents: ₹179 and $2.99

const json = (body, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });
const store = () => getStore({ name: "licenses", consistency: "strong" });
const validDevice = (d) => typeof d === "string" && /^[A-Za-z0-9-]{16,64}$/.test(d);

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};
const hmac = (secret, text) => createHmac("sha256", secret).update(text).digest("hex");

async function razorpay(path, init = {}) {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: { authorization: `Basic ${auth}`, "content-type": "application/json" },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.description || `Razorpay ${res.status}`);
  return data;
}

/** Records the payment as the license of `device`. Safe to call twice for the same payment. */
async function grant(device, payment) {
  const s = store();
  if (await s.get(`pay:${payment.id}`)) return;
  const record = {
    device,
    paymentId: payment.id,
    orderId: payment.order_id || "",
    email: String(payment.email || "").toLowerCase(),
    amount: payment.amount,
    currency: payment.currency,
    paidAt: new Date().toISOString(),
  };
  await s.setJSON(`dev:${device}`, record);
  await s.setJSON(`pay:${payment.id}`, record);
}

async function checkout(req, context) {
  const { device } = await req.json().catch(() => ({}));
  if (!validDevice(device)) return json({ error: "Bad request." }, 400);
  if (await store().get(`dev:${device}`)) return json({ error: "This Mac already has lifetime access." }, 409);
  const country = context?.geo?.country?.code || "";
  const currency = country === "IN" ? "INR" : "USD";
  const order = await razorpay("/orders", {
    method: "POST",
    body: JSON.stringify({ amount: PRICES[currency], currency, receipt: `opt-${Date.now()}`, notes: { device, product: "OptHelper lifetime" } }),
  });
  await store().setJSON(`order:${order.id}`, { device, currency });
  return json({ keyId: process.env.RAZORPAY_KEY_ID, orderId: order.id, amount: order.amount, currency });
}

async function verify(req) {
  const { order_id, payment_id, signature } = await req.json().catch(() => ({}));
  if (!order_id || !payment_id || !signature) return json({ error: "Bad request." }, 400);
  if (!safeEqual(signature, hmac(process.env.RAZORPAY_KEY_SECRET, `${order_id}|${payment_id}`))) {
    return json({ error: "Payment could not be verified." }, 400);
  }
  const order = await store().get(`order:${order_id}`, { type: "json" });
  if (!order) return json({ error: "Unknown order." }, 404);
  const payment = await razorpay(`/payments/${payment_id}`);
  if (payment.order_id !== order_id || !["captured", "authorized"].includes(payment.status)) {
    return json({ error: "Payment is not complete." }, 402);
  }
  await grant(order.device, payment);
  return json({ ok: true });
}

async function webhook(req) {
  const raw = await req.text();
  const sig = req.headers.get("x-razorpay-signature") || "";
  if (!process.env.RAZORPAY_WEBHOOK_SECRET || !safeEqual(sig, hmac(process.env.RAZORPAY_WEBHOOK_SECRET, raw))) {
    return json({ error: "Bad signature." }, 400);
  }
  const event = JSON.parse(raw);
  if (event.event === "payment.captured") {
    const p = event.payload.payment.entity;
    const order = p.order_id ? await store().get(`order:${p.order_id}`, { type: "json" }) : null;
    const device = order?.device || p.notes?.device;
    if (validDevice(device)) await grant(device, p);
  }
  return json({ ok: true });
}

async function status(req) {
  const d = new URL(req.url).searchParams.get("d");
  if (!validDevice(d)) return json({ error: "Bad request." }, 400);
  return json({ paid: !!(await store().get(`dev:${d}`)) });
}

/** Moves a license to a new Mac. The payment id is on Razorpay's receipt email, so only the buyer has it. */
async function transfer(req) {
  const { device, email, paymentId } = await req.json().catch(() => ({}));
  if (!validDevice(device) || !email || !/^pay_\w+$/.test(String(paymentId || ""))) return json({ error: "Bad request." }, 400);
  const s = store();
  const rec = await s.get(`pay:${paymentId}`, { type: "json" });
  if (!rec || rec.email !== String(email).trim().toLowerCase()) {
    return json({ error: "That email and payment ID don't match a purchase." }, 404);
  }
  if (rec.device !== device) await s.delete(`dev:${rec.device}`);
  const moved = { ...rec, device, movedAt: new Date().toISOString() };
  await s.setJSON(`dev:${device}`, moved);
  await s.setJSON(`pay:${paymentId}`, moved);
  return json({ ok: true });
}

export default async (req, context) => {
  const route = new URL(req.url).pathname.replace(/^\/api\/license\/?/, "");
  try {
    if (route === "status" && req.method === "GET") return await status(req);
    if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
    if (route === "checkout") return await checkout(req, context);
    if (route === "verify") return await verify(req);
    if (route === "webhook") return await webhook(req);
    if (route === "transfer") return await transfer(req);
    return json({ error: "Not found." }, 404);
  } catch (err) {
    console.error("license:", route, err);
    return json({ error: "Something went wrong. Try again in a minute." }, 502);
  }
};

export const config = { path: "/api/license/*" };
