import { IntentStatus, PublicPayClient } from '@cross402/usdc/client';

const baseUrl =
  import.meta.env.VITE_PAY_BASE_URL ?? 'https://api-pay.agent.tech';

/** Browser-safe Cross402 client (no API secrets). */
export const publicClient = new PublicPayClient({ baseUrl });

export { IntentStatus, baseUrl };
