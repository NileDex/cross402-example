import type { PaymentRequirements } from '@cross402/usdc/client';
import { ethers, type Signer } from 'ethers';

const TWA_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
};

interface X402PaymentRequirements extends PaymentRequirements {
  amount: string;
  payTo: string;
  asset: string;
  maxTimeoutSeconds: number;
  extra: { decimals: number; name: string; version: string };
}

export async function buildSettleProof(
  signer: Signer,
  paymentRequirements: PaymentRequirements,
): Promise<string> {
  const req = paymentRequirements as X402PaymentRequirements;
  const { scheme, network, amount, payTo, asset, maxTimeoutSeconds, extra } = req;

  // Parse chainId from "eip155:8453"
  const chainId = parseInt(network.split(':')[1], 10);
  if (isNaN(chainId)) throw new Error(`Cannot parse chainId from network: "${network}"`);

  const from = await signer.getAddress();
  const nowSecs = Math.floor(Date.now() / 1000);
  const validAfter = 0;
  const validBefore = nowSecs + (maxTimeoutSeconds ?? 600);
  const nonce = ethers.hexlify(ethers.randomBytes(32));

  const domain = {
    name: extra.name,
    version: extra.version,
    chainId,
    verifyingContract: asset,
  };

  const message = {
    from,
    to: payTo,
    value: BigInt(amount),
    validAfter: BigInt(validAfter),
    validBefore: BigInt(validBefore),
    nonce,
  };

  const signature = await signer.signTypedData(domain, TWA_TYPES, message);

  const proofPayload = {
    x402Version: 2,
    resource: {
      url: '/api/intents',
      description: 'X402 payment',
      mimeType: 'application/json',
    },
    accepted: {
      scheme,
      network,
      amount,
      asset,
      payTo,
      maxTimeoutSeconds,
      extra: extra ?? {},
    },
    payload: {
      signature,
      authorization: {
        from,
        to: payTo,
        value: amount,
        validAfter: String(validAfter),
        validBefore: String(validBefore),
        nonce,
      },
    },
  };

  return btoa(JSON.stringify(proofPayload));
}
