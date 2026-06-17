// SERVER-ONLY — never import this file in browser/frontend code.
// PAY_API_KEY and PAY_SECRET_KEY must never reach the browser bundle.
import { PayClient } from '@cross402/usdc';

const baseUrl = process.env.PAY_BASE_URL ?? 'https://api-pay.agent.tech';
const apiKey = process.env.PAY_API_KEY;
const secretKey = process.env.PAY_SECRET_KEY;

function requireEnv(name: string, value: string | undefined): string {
  if (!value?.trim()) {
    throw new Error(
      `Missing ${name}. Add it to .env (get keys from https://agent.tech/dashboard).`,
    );
  }
  return value.trim();
}

/** Authenticated PayClient — use only in Node/server code, not in the browser bundle. */
export const cross402Client = new PayClient({
  baseUrl: requireEnv('PAY_BASE_URL', baseUrl),
  auth: {
    apiKey: requireEnv('PAY_API_KEY', apiKey),
    secretKey: requireEnv('PAY_SECRET_KEY', secretKey),
  },
});

export { baseUrl };
