import { useState } from 'react';
import './Docs.css';

function CodeBlock({ code, lang = 'ts', file }: { code: string; lang?: string; file?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="code-block">
      {file && <div className="file-path">{file}</div>}
      <span className="lang-tag" style={file ? { top: '2.6rem' } : undefined}>{lang}</span>
      <button className={`copy-btn${copied ? ' copied' : ''}`} style={file ? { top: '2.4rem' } : undefined} onClick={copy}>
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <pre style={file ? { paddingTop: '0.75rem' } : undefined}><code>{code.trim()}</code></pre>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="step">
      <div className="step-num">{n}</div>
      <div className="step-body">
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}

// ─── Code Snippets ────────────────────────────────────────────────────────────

const INSTALL_BROWSER = `npm install @cross402/usdc ethers`;

const INSTALL_SERVER = `npm install @cross402/usdc`;

const BROWSER_INIT = `
import { PublicPayClient } from '@cross402/usdc/client';

// No API keys needed — safe to use in the browser
const client = new PublicPayClient({
  baseUrl: 'https://api-pay.agent.tech',
});

export { client };
`;

const BROWSER_CREATE_INTENT = `
import { client } from './lib/publicClient';

const intent = await client.createIntent({
  recipient: '0xRecipientWalletAddress',  // EVM address (must match target chain)
  amount: '10.00',                         // USD string — min 0.02, max 1,000,000
  payerChain: 'base',                      // chain the user pays FROM
  targetChain: 'ethereum',                 // chain the recipient receives ON
});

// intent.intentId            — use this to track / poll
// intent.paymentRequirements — signing data for the next step
console.log(intent.intentId);
`;

const CHAIN_SWITCH = `
// Chain hex IDs for wallet_switchEthereumChain
export const CHAIN_IDS: Record<string, string> = {
  base:           '0x2105',
  ethereum:       '0x1',
  arbitrum:       '0xa4b1',
  polygon:        '0x89',
  bsc:            '0x38',
  'base-sepolia': '0x14a34',
};

export async function switchToChain(payerChain: string) {
  const hexId = CHAIN_IDS[payerChain];
  if (!hexId || !window.ethereum) throw new Error(\`No chain mapping for "\${payerChain}"\`);

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: hexId }],
    });
  } catch (err: any) {
    if (err.code === 4902) throw new Error(\`"\${payerChain}" not added to your wallet. Add it manually.\`);
    throw err;
  }
}
`;

const SIGN_PROOF = `
import { ethers, type Signer } from 'ethers';
import type { PaymentRequirements } from '@cross402/usdc/client';

const TWA_TYPES = {
  TransferWithAuthorization: [
    { name: 'from',        type: 'address' },
    { name: 'to',          type: 'address' },
    { name: 'value',       type: 'uint256' },
    { name: 'validAfter',  type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce',       type: 'bytes32' },
  ],
};

export async function buildSettleProof(
  signer: Signer,
  paymentRequirements: PaymentRequirements,
): Promise<string> {
  const req = paymentRequirements as any;
  const { scheme, network, amount, payTo, asset, maxTimeoutSeconds, extra } = req;

  // Parse chainId from "eip155:8453" format
  const chainId    = parseInt(network.split(':')[1], 10);
  const from       = await signer.getAddress();
  const nowSecs    = Math.floor(Date.now() / 1000);
  const validAfter  = 0;
  const validBefore = nowSecs + (maxTimeoutSeconds ?? 600);
  const nonce       = ethers.hexlify(ethers.randomBytes(32));

  // EIP-712 domain — name & version come from paymentRequirements.extra
  const domain = {
    name: extra.name,           // e.g. "USD Coin"
    version: extra.version,     // e.g. "2"
    chainId,
    verifyingContract: asset,   // USDC contract on the payer chain
  };

  const message = {
    from,
    to:          payTo,
    value:       BigInt(amount),
    validAfter:  BigInt(validAfter),
    validBefore: BigInt(validBefore),
    nonce,
  };

  // MetaMask pops up here asking the user to sign
  const signature = await signer.signTypedData(domain, TWA_TYPES, message);

  // Build X402 v2 proof and base64-encode it
  const proof = {
    x402Version: 2,
    scheme,
    network,
    accepted: { amount },
    payload: {
      authorization: {
        from, to: payTo, value: amount,
        validAfter:  String(validAfter),
        validBefore: String(validBefore),
        nonce,
      },
      signature,
    },
  };

  return btoa(JSON.stringify(proof));
}
`;

const POLL_HELPER = `
import type { PublicPayClient } from '@cross402/usdc/client';

const TERMINAL_FAIL = new Set(['EXPIRED', 'VERIFICATION_FAILED', 'PARTIAL_SETTLEMENT']);

export async function pollUntilSettled(
  client: PublicPayClient,
  intentId: string,
  onStatus?: (status: string) => void,
  maxAttempts = 40,
  intervalMs = 3000,
) {
  for (let i = 0; i < maxAttempts; i++) {
    const intent = await client.getIntent(intentId);
    onStatus?.(intent.status);

    if (intent.status === 'TARGET_SETTLED') return intent;
    if (TERMINAL_FAIL.has(intent.status)) {
      throw new Error(\`Payment failed: \${intent.status}\`);
    }

    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error('Timed out waiting for settlement');
}
`;

const SUBMIT_AND_POLL = `
import { BrowserProvider } from 'ethers';
import { client } from './lib/publicClient';
import { switchToChain } from './lib/chains';
import { buildSettleProof } from './lib/signSettleProof';
import { pollUntilSettled } from './lib/pollIntent';

// Switch MetaMask to the correct chain first
await switchToChain(payerChain);

// Get signer from MetaMask
const provider = new BrowserProvider(window.ethereum);
await provider.send('eth_requestAccounts', []);
const signer = await provider.getSigner();

// Sign locally — no private key is ever sent anywhere
const settleProof = await buildSettleProof(signer, intent.paymentRequirements);

// Submit signed proof to Cross402
await client.submitProof(intent.intentId, settleProof);

// Poll until settled or failed
const result = await pollUntilSettled(client, intent.intentId, (status) => {
  console.log('Status:', status);
});

if (result.status === 'TARGET_SETTLED') {
  console.log('Payment complete! Tx:', result.targetPayment?.txHash);
}
`;

const FULL_BROWSER_EXAMPLE = `
import { PublicPayClient } from '@cross402/usdc/client';
import { BrowserProvider, ethers } from 'ethers';

const client = new PublicPayClient({ baseUrl: 'https://api-pay.agent.tech' });

const CHAIN_IDS: Record<string, string> = {
  base: '0x2105', ethereum: '0x1', arbitrum: '0xa4b1', polygon: '0x89', bsc: '0x38',
};

async function sendPayment(
  recipient: string,
  amount: string,
  payerChain: string,
  targetChain: string,
) {
  // 1. Create intent
  const intent = await client.createIntent({ recipient, amount, payerChain, targetChain });

  // 2. Switch MetaMask to payer chain
  await window.ethereum.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: CHAIN_IDS[payerChain] }],
  });

  // 3. Get signer
  const provider = new BrowserProvider(window.ethereum);
  await provider.send('eth_requestAccounts', []);
  const signer = await provider.getSigner();

  // 4. Sign & submit proof
  const proof = await buildSettleProof(signer, intent.paymentRequirements);
  await client.submitProof(intent.intentId, proof);

  // 5. Poll until done
  for (let i = 0; i < 40; i++) {
    const result = await client.getIntent(intent.intentId);
    if (result.status === 'TARGET_SETTLED') {
      console.log('Done! Tx hash:', result.targetPayment?.txHash);
      return result;
    }
    if (['EXPIRED', 'VERIFICATION_FAILED', 'PARTIAL_SETTLEMENT'].includes(result.status)) {
      throw new Error('Payment failed: ' + result.status);
    }
    await new Promise(r => setTimeout(r, 3000));
  }
}
`;

const SERVER_ENV = `
PAY_API_KEY=ap_key_xxxxx
PAY_SECRET_KEY=ap_secret_xxxxx
PAY_BASE_URL=https://api-pay.agent.tech
`;

const SERVER_INIT = `
import { PayClient } from '@cross402/usdc';

export const client = new PayClient({
  baseUrl: process.env.PAY_BASE_URL ?? 'https://api-pay.agent.tech',
  auth: {
    apiKey:    process.env.PAY_API_KEY!,
    secretKey: process.env.PAY_SECRET_KEY!,
  },
});
`;

const SERVER_CREATE = `
import { client } from './cross402';

// Create intent — use recipient address or email
const intent = await client.createIntent({
  recipient: '0xRecipientAddress',   // or: email: 'user@example.com'
  amount: '25.00',                    // USD string
  payerChain: 'base',
  targetChain: 'ethereum',            // omit to default to 'base'
});

console.log(intent.intentId);
`;

const SERVER_EXECUTE = `
import { client } from './cross402';

// Your agent wallet signs & broadcasts automatically — no user needed
await client.executeIntent(intent.intentId);

// Poll until settled
for (let i = 0; i < 40; i++) {
  const result = await client.getIntent(intent.intentId);
  console.log('Status:', result.status);

  if (result.status === 'TARGET_SETTLED') {
    console.log('Settled! Tx:', result.targetPayment?.txHash);
    break;
  }
  if (['EXPIRED', 'VERIFICATION_FAILED', 'PARTIAL_SETTLEMENT'].includes(result.status)) {
    throw new Error('Payment failed: ' + result.status);
  }
  await new Promise(r => setTimeout(r, 3000));
}
`;

const ERROR_HANDLING = `
import { PayApiError, PayValidationError } from '@cross402/usdc';

try {
  const intent = await client.createIntent({ ... });
} catch (err) {
  if (err instanceof PayValidationError) {
    // Bad input — e.g. amount too low, invalid address
    console.error('Validation error:', err.message);
  } else if (err instanceof PayApiError) {
    switch (err.statusCode) {
      case 400: console.error('Bad request:', err.body); break;
      case 401: console.error('Invalid API keys'); break;
      case 429: console.error('Rate limited — slow down'); break;
      default:  console.error(\`API error \${err.statusCode}:\`, err.body);
    }
  }
}
`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function Docs() {
  return (
    <div className="docs">

      {/* Header */}
      <div className="docs-header">
        <h1>Cross402 Integration Guide</h1>
        <p>Copy-paste steps for sending cross-chain USDC payments in your app.</p>
        <nav className="docs-nav">
          <a href="#install">Install</a>
          <a href="#browser">Browser Flow</a>
          <a href="#server">Server Flow</a>
          <a href="#chains">Supported Chains</a>
          <a href="#statuses">Intent Statuses</a>
          <a href="#errors">Error Handling</a>
        </nav>
      </div>

      {/* Install */}
      <section id="install">
        <h2>Installation</h2>

        <h3>Browser / Frontend</h3>
        <p>
          Needs <code>ethers</code> to wrap MetaMask and sign EIP-712 typed data.
        </p>
        <CodeBlock code={INSTALL_BROWSER} lang="bash" />

        <h3>Server / Node only</h3>
        <p>
          No wallet library needed — Cross402 signs everything server-side with your agent wallet.
        </p>
        <CodeBlock code={INSTALL_SERVER} lang="bash" />

        <div className="callout callout-info">
          Requires <strong>Node.js 18+</strong> or a modern browser. Supports ESM and CommonJS.
        </div>
      </section>

      <hr className="divider" />

      {/* Browser Flow */}
      <section id="browser">
        <h2>Browser Flow — <code>PublicPayClient</code></h2>
        <p>
          The user connects MetaMask, signs a payment authorization locally,
          and Cross402 settles USDC on-chain. <strong>No API keys needed</strong> — safe to ship in your frontend bundle.
        </p>

        <div className="callout callout-warn">
          The user must have enough USDC on the <strong>payer chain</strong> to cover the amount.
          <code> VERIFICATION_FAILED</code> means the wallet had insufficient funds.
        </div>

        <Step n={1} title="Initialize the client">
          <p>Create this file once and import <code>client</code> anywhere in your frontend.</p>
          <CodeBlock code={BROWSER_INIT} file="src/lib/publicClient.ts" />
        </Step>

        <Step n={2} title="Create a payment intent">
          <p>
            Call <code>createIntent</code> with recipient, amount, and chains.
            Returns an <code>intentId</code> and <code>paymentRequirements</code> — keep both for the next steps.
          </p>
          <CodeBlock code={BROWSER_CREATE_INTENT} file="src/lib/payment.ts (or wherever you call it)" />
          <div className="callout callout-warn">
            Recipient address format must match the target chain — EVM <code>0x…</code> for Base/Ethereum/Arbitrum,
            Solana public key for <code>targetChain: 'solana'</code>.
          </div>
        </Step>

        <Step n={3} title="Switch MetaMask to the payer chain">
          <p>Drop this helper in your <code>lib/</code> folder and call it before signing.</p>
          <CodeBlock code={CHAIN_SWITCH} file="src/lib/chains.ts" />
        </Step>

        <Step n={4} title="Build and sign the settle proof">
          <p>
            This function reads signing data from <code>paymentRequirements</code>,
            constructs an EIP-3009 <code>TransferWithAuthorization</code>,
            and asks MetaMask to sign it. Returns a base64 proof string.
          </p>
          <CodeBlock code={SIGN_PROOF} file="src/lib/signSettleProof.ts" />
        </Step>

        <Step n={5} title="Poll helper">
          <p>Reusable helper — polls every 3 s and resolves on any terminal status.</p>
          <CodeBlock code={POLL_HELPER} file="src/lib/pollIntent.ts" />
        </Step>

        <Step n={6} title="Submit the proof and poll">
          <p>Wire the above helpers together in your component or handler.</p>
          <CodeBlock code={SUBMIT_AND_POLL} file="src/App.tsx (or your component)" />
        </Step>

        <h3>Complete browser example — one self-contained file</h3>
        <CodeBlock code={FULL_BROWSER_EXAMPLE} file="src/lib/payment.ts" />
      </section>

      <hr className="divider" />

      {/* Server Flow */}
      <section id="server">
        <h2>Server Flow — <code>PayClient</code></h2>
        <p>
          Your backend holds the API keys. Cross402 signs with your agent wallet automatically —
          no user interaction needed. Ideal for AI agents, automated billing, and server-to-server transfers.
        </p>

        <div className="callout callout-warn">
          <strong>Never import <code>PayClient</code> in browser code.</strong> Your <code>apiKey</code> and <code>secretKey</code> would
          be visible in the bundle. Use <code>PublicPayClient</code> for the frontend, <code>PayClient</code> for Node only.
        </div>

        <Step n={1} title="Get API keys">
          <p>
            Go to <strong>agent.tech/dashboard</strong>, create an agent, then copy your keys into <code>.env</code>.
          </p>
          <CodeBlock code={SERVER_ENV} lang="bash" file=".env  (never commit this file)" />
        </Step>

        <Step n={2} title="Initialize PayClient">
          <p>Create this file in your backend. Import <code>client</code> from here everywhere on the server.</p>
          <CodeBlock code={SERVER_INIT} file="src/lib/cross402.ts  (server only — never import in browser code)" />
        </Step>

        <Step n={3} title="Create an intent">
          <CodeBlock code={SERVER_CREATE} file="src/server/payment.ts (or your route handler)" />
        </Step>

        <Step n={4} title="Execute and poll">
          <p>
            <code>executeIntent</code> triggers your agent wallet to sign and broadcast on-chain.
            Then poll until <code>TARGET_SETTLED</code>.
          </p>
          <CodeBlock code={SERVER_EXECUTE} file="src/server/payment.ts" />
        </Step>
      </section>

      <hr className="divider" />

      {/* Supported Chains */}
      <section id="chains">
        <h2>Supported Chains</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Chain</th>
                <th>ID string</th>
                <th>Hex chainId</th>
                <th>Token</th>
                <th>Payer</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Base',       'base',       '0x2105',  'USDC',  true,  true],
                ['Ethereum',   'ethereum',   '0x1',     'USDC',  true,  true],
                ['Arbitrum',   'arbitrum',   '0xa4b1',  'USDC',  true,  true],
                ['Polygon',    'polygon',    '0x89',    'USDC',  true,  true],
                ['BSC',        'bsc',        '0x38',    'USDC',  true,  true],
                ['Solana',     'solana',     '—',       'USDC',  true,  true],
                ['HyperEVM',   'hyperevm',   '—',       'USDC',  true,  true],
                ['Monad',      'monad',      '—',       'USDC',  true,  true],
                ['SKALE Base', 'skale-base', '—',       'USDC.e',true,  false],
                ['MegaETH',    'megaeth',    '—',       'USDm',  true,  false],
              ].map(([name, id, hex, token, payer, target]) => (
                <tr key={id as string}>
                  <td>{name as string}</td>
                  <td><code>{id as string}</code></td>
                  <td><code>{hex as string}</code></td>
                  <td>{token as string}</td>
                  <td><span className={`badge ${payer ? 'badge-green' : 'badge-gray'}`}>{payer ? 'Yes' : 'No'}</span></td>
                  <td><span className={`badge ${target ? 'badge-blue' : 'badge-gray'}`}>{target ? 'Yes' : 'No'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
          SKALE Base and MegaETH are payer-only — they cannot be used as the settlement target.
          Omit <code>targetChain</code> to default to <code>'base'</code>.
        </p>
      </section>

      <hr className="divider" />

      {/* Statuses */}
      <section id="statuses">
        <h2>Intent Statuses</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Status</th><th>Meaning</th><th>Terminal?</th></tr>
            </thead>
            <tbody>
              {[
                ['AWAITING_PAYMENT',    'Intent created. Waiting for user to sign and submit proof.',          false, 'yellow'],
                ['PENDING',             'Proof submitted. Cross402 is verifying the source-chain payment.',    false, 'yellow'],
                ['SOURCE_SETTLED',      'Source chain payment confirmed. Settling on target chain.',           false, 'yellow'],
                ['TARGET_SETTLING',     'Settlement in progress on the target chain.',                        false, 'yellow'],
                ['TARGET_SETTLED',      'Done. USDC has arrived at the recipient on the target chain.',       true,  'green'],
                ['VERIFICATION_FAILED', 'Source payment failed to verify — no funds moved. Check balance.',   true,  'red'],
                ['PARTIAL_SETTLEMENT',  'Source settled but target transfer failed. Needs reconciliation.',   true,  'red'],
                ['EXPIRED',             'Intent not executed within 10 minutes. Create a new one.',           true,  'red'],
              ].map(([status, desc, terminal, color]) => (
                <tr key={status as string}>
                  <td><code>{status as string}</code></td>
                  <td>{desc as string}</td>
                  <td><span className={`badge badge-${terminal ? color : 'gray'}`}>{terminal ? 'Yes' : 'No'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="callout callout-info">
          Poll <code>getIntent()</code> every 3 seconds until you hit a terminal status.
          Stop on <code>TARGET_SETTLED</code>, <code>VERIFICATION_FAILED</code>, <code>PARTIAL_SETTLEMENT</code>, or <code>EXPIRED</code>.
        </div>
      </section>

      <hr className="divider" />

      {/* Errors */}
      <section id="errors">
        <h2>Error Handling</h2>
        <CodeBlock code={ERROR_HANDLING} file="anywhere you call client methods" />
        <div className="table-wrap">
          <table>
            <thead><tr><th>Error class</th><th>When it's thrown</th></tr></thead>
            <tbody>
              <tr>
                <td><code>PayValidationError</code></td>
                <td>Bad input — amount out of range, invalid address format, missing field</td>
              </tr>
              <tr>
                <td><code>PayApiError</code></td>
                <td>HTTP error from the API — check <code>err.statusCode</code> and <code>err.body</code></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="callout callout-warn">
          <strong>Limits:</strong> amount $0.02–$1,000,000 · up to 6 decimal places ·
          intents expire in <strong>10 min</strong> · rate limit ~60 req/IP/min.
        </div>
      </section>

    </div>
  );
}
