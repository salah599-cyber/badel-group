import { createClerkClient } from "@clerk/backend";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf8");
const secretKey = env.match(/CLERK_SECRET_KEY="([^"]+)"/)?.[1];
if (!secretKey) throw new Error("Missing CLERK_SECRET_KEY");

const client = createClerkClient({ secretKey });

async function run() {
  try {
    const app = await client.webhooks.createSvixApp();
    console.log("createSvixApp:", JSON.stringify(app));
  } catch (error) {
    console.log("createSvixApp error:", error.status, error.errors ?? error.message);
  }

  try {
    const auth = await client.webhooks.generateSvixAuthURL();
    console.log("generateSvixAuthURL:", JSON.stringify(auth));
  } catch (error) {
    console.log(
      "generateSvixAuthURL error:",
      error.status,
      error.errors ?? error.message,
    );
  }
}

run();
