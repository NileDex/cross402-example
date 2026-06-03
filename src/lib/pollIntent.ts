import type { GetIntentResponse } from '@cross402/usdc/client';
import { IntentStatus, publicClient } from './publicClient.js';

const TERMINAL_FAILURE = new Set<string>([
  IntentStatus.Expired,
  IntentStatus.VerificationFailed,
  IntentStatus.PartialSettlement,
]);

export async function pollUntilTerminal(
  intentId: string,
  onStatus?: (status: string) => void,
  maxAttempts = 40,
  intervalMs = 3000,
): Promise<GetIntentResponse> {
  for (let i = 0; i < maxAttempts; i++) {
    const intent = await publicClient.getIntent(intentId);
    onStatus?.(intent.status);

    if (intent.status === IntentStatus.TargetSettled) {
      return intent;
    }

    if (TERMINAL_FAILURE.has(intent.status)) {
      throw new Error(`Payment ended with status: ${intent.status}`);
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error('Timed out waiting for payment settlement.');
}
