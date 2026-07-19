import { Webhook } from "standardwebhooks";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf8");
const secret = env.match(/CLERK_WEBHOOK_SIGNING_SECRET="([^"]+)"/)?.[1];
if (!secret) throw new Error("Missing CLERK_WEBHOOK_SIGNING_SECRET");

const payload = {
  data: {
    id: "user_test_webhook_123",
    public_metadata: {},
    email_addresses: [{ email_address: "test@example.com" }],
  },
  object: "event",
  type: "user.created",
};

const body = JSON.stringify(payload);
const wh = new Webhook(secret);
const msgId = "msg_test_" + Date.now();
const timestamp = Math.floor(Date.now() / 1000).toString();
const signature = wh.sign(msgId, new Date(Number(timestamp) * 1000), body);

const response = await fetch("https://badel-group.vercel.app/api/webhooks/clerk", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "svix-id": msgId,
    "svix-timestamp": timestamp,
    "svix-signature": signature,
  },
  body,
});

console.log("Status:", response.status);
console.log("Body:", await response.text());
