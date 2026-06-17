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

const ENV_SETUP = `
# Copy the example file and fill in your values
cp .env.example .env
`;

const VITE_PROXY = `
// vite.config.ts — add a proxy so local dev requests bypass CORS
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://api-pay.agent.tech',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
`;

const ENV_VARS = `
# ── Browser-safe (VITE_ prefix — included in the bundle) ──────────────────────

# The Cross402 API URL. Leave this as-is unless you're using a staging environment.
VITE_PAY_BASE_URL=https://api-pay.agent.tech

# Optional: your EVM wallet address, pre-filled in the tip form so tippers
# don't have to paste it in manually. Leave blank if you want tippers to enter
# the recipient address themselves.
VITE_CREATOR_RECIPIENT=0xYourAgentEVMWalletAddress


# ── Server-side only (no VITE_ prefix — NEVER expose these to the browser) ─────

# These are only needed if you're using PayClient in a Node.js backend or script.
# Get your keys at https://agent.tech/dashboard → create an agent → copy keys.
PAY_BASE_URL=https://api-pay.agent.tech
PAY_API_KEY=ap_key_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAY_SECRET_KEY=ap_secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
`;

const BROWSER_INIT = `
import { PublicPayClient } from '@cross402/usdc/client';

// No API keys needed — completely safe to ship in your frontend bundle.
// PublicPayClient only exposes endpoints that don't require authentication.
const client = new PublicPayClient({
  baseUrl: 'https://api-pay.agent.tech',
});

export { client };
`;

const BROWSER_CREATE_INTENT = `
import { client } from './lib/publicClient';

// Creates a new payment intent and returns signing instructions.
// Think of this like opening a payment request — nothing is charged yet.
const intent = await client.createIntent({
  recipient: '0xRecipientWalletAddress',  // EVM address of who receives the funds
  amount: '10.00',                         // USD amount as a string (min $0.02)
  payerChain: 'base',                      // the chain the user pays FROM
  targetChain: 'ethereum',                 // the chain the recipient receives ON
});

// You'll need both of these in the next steps:
// intent.intentId            — unique ID to track this payment
// intent.paymentRequirements — signing data MetaMask needs to authorize the transfer
console.log(intent.intentId);
`;

const CHAIN_SWITCH = `
// Chain hex IDs required by MetaMask's wallet_switchEthereumChain method.
// The user's wallet must be on the correct chain before they can sign.
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
    // Error code 4902 = chain not added to the wallet yet
    if (err.code === 4902) throw new Error(\`"\${payerChain}" not in your wallet. Add it manually.\`);
    throw err;
  }
}
`;

const SIGN_PROOF = `
import { ethers, type Signer } from 'ethers';
import type { PaymentRequirements } from '@cross402/usdc/client';

// EIP-3009 defines a "TransferWithAuthorization" — a signed message that
// authorizes a one-time USDC transfer without requiring an on-chain approve().
// The user signs this off-chain in MetaMask; Cross402 submits it on-chain.
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

  // network is in "eip155:8453" format — extract the numeric chain ID
  const chainId    = parseInt(network.split(':')[1], 10);
  const from       = await signer.getAddress();
  const nowSecs    = Math.floor(Date.now() / 1000);
  const validAfter  = 0;                                    // valid immediately
  const validBefore = nowSecs + (maxTimeoutSeconds ?? 600); // expires in ~10 min
  const nonce       = ethers.hexlify(ethers.randomBytes(32)); // one-time random nonce

  // The EIP-712 domain is the USDC contract on the payer chain.
  // name and version come from paymentRequirements.extra (e.g. "USD Coin", "2").
  const domain = {
    name: extra.name,
    version: extra.version,
    chainId,
    verifyingContract: asset,
  };

  const message = {
    from,
    to:          payTo,
    value:       BigInt(amount),
    validAfter:  BigInt(validAfter),
    validBefore: BigInt(validBefore),
    nonce,
  };

  // This line triggers the MetaMask signing popup.
  // The user sees the amount, recipient, and expiry — then approves or rejects.
  const signature = await signer.signTypedData(domain, TWA_TYPES, message);

  // Wrap everything into an X402 v2 proof and base64-encode it for the API.
  // accepted must include the full payment requirements — not just amount.
  const proof = {
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
        from, to: payTo, value: amount,
        validAfter:  String(validAfter),
        validBefore: String(validBefore),
        nonce,
      },
    },
  };

  return btoa(JSON.stringify(proof));
}
`;

const POLL_HELPER = `
import type { PublicPayClient } from '@cross402/usdc/client';

// These are the statuses where the payment has reached a final outcome —
// either successfully settled or failed. Stop polling when you hit one.
const TERMINAL_FAIL = new Set(['EXPIRED', 'VERIFICATION_FAILED', 'PARTIAL_SETTLEMENT']);

export async function pollUntilSettled(
  client: PublicPayClient,
  intentId: string,
  onStatus?: (status: string) => void, // optional callback to show live status to user
  maxAttempts = 40,
  intervalMs = 3000,
) {
  for (let i = 0; i < maxAttempts; i++) {
    const intent = await client.getIntent(intentId);
    onStatus?.(intent.status);

    if (intent.status === 'TARGET_SETTLED') return intent;   // success
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
import { switchToChain } from './lib/wallet/chains';
import { buildSettleProof } from './lib/wallet/signSettleProof';
import { pollUntilSettled } from './lib/pollIntent';

// Step 1 — Make sure MetaMask is on the right chain before signing.
// If the user is on Ethereum but payerChain is 'base', this switches them over.
await switchToChain(payerChain);

// Step 2 — Get the signer (the connected MetaMask account).
const provider = new BrowserProvider(window.ethereum);
await provider.send('eth_requestAccounts', []);
const signer = await provider.getSigner();

// Step 3 — Sign the payment authorization locally.
// The private key never leaves MetaMask — only the signature is sent.
const settleProof = await buildSettleProof(signer, intent.paymentRequirements);

// Step 4 — Submit the signed proof to Cross402.
// Cross402 verifies the signature, then submits the on-chain USDC transfer.
await client.submitProof(intent.intentId, settleProof);

// Step 5 — Poll until the payment reaches a terminal status.
const result = await pollUntilSettled(client, intent.intentId, (status) => {
  console.log('Status:', status); // PENDING → SOURCE_SETTLED → TARGET_SETTLED
});

if (result.status === 'TARGET_SETTLED') {
  console.log('Payment complete! Tx:', result.targetPayment?.txHash);
}
`;

const SERVER_ENV = `
# Get these from https://agent.tech/dashboard → create an agent → copy keys
PAY_API_KEY=ap_key_xxxxx
PAY_SECRET_KEY=ap_secret_xxxxx
PAY_BASE_URL=https://api-pay.agent.tech
`;

const SERVER_INIT = `
import { PayClient } from '@cross402/usdc';

// PayClient requires API credentials and must only run on the server.
// It can sign and execute payments automatically using your agent wallet —
// no user or MetaMask involved.
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

// Use 'recipient' for a known wallet address, or 'email' to look up by email.
const intent = await client.createIntent({
  recipient: '0xRecipientAddress',   // or: email: 'user@example.com'
  amount: '25.00',
  payerChain: 'base',
  targetChain: 'ethereum',           // omit to default to 'base'
});

console.log(intent.intentId);
`;

const SERVER_EXECUTE = `
import { client } from './cross402';

// executeIntent tells Cross402 to use your agent wallet to sign and
// broadcast the payment on-chain automatically — no user input needed.
await client.executeIntent(intent.intentId);

// Poll until settled or failed
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
    // Bad input — e.g. amount below $0.02, invalid address format, missing field
    console.error('Validation error:', err.message);
  } else if (err instanceof PayApiError) {
    switch (err.statusCode) {
      case 400: console.error('Bad request — check your parameters:', err.body); break;
      case 401: console.error('Invalid API keys — check PAY_API_KEY and PAY_SECRET_KEY'); break;
      case 429: console.error('Rate limited — slow down requests'); break;
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
        <p>Everything you need to send cross-chain USDC payments — from setup to settlement.</p>
        <nav className="docs-nav">
          <a href="#overview">Overview</a>
          <a href="#setup">Setup</a>
          <a href="#browser">Browser Flow</a>
          <a href="#server">Server Flow</a>
          <a href="#chains">Supported Chains</a>
          <a href="#statuses">Intent Statuses</a>
          <a href="#errors">Error Handling</a>
        </nav>
      </div>

      {/* Overview */}
      <section id="overview">
        <h2>How it works</h2>
        <p>
          Cross402 is a payment layer that lets users send USDC on one blockchain while the recipient
          receives it on a different blockchain — all in a single flow. For example, a user can pay
          from Base and the creator receives on Ethereum, with no bridging steps required on either side.
        </p>
        <p>
          There are two ways to use Cross402 depending on who signs the payment:
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Flow</th>
                <th>Who signs</th>
                <th>Client</th>
                <th>Use case</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Browser flow</strong></td>
                <td>The user, via MetaMask</td>
                <td><code>PublicPayClient</code></td>
                <td>Tip jars, checkout pages, any user-initiated payment</td>
              </tr>
              <tr>
                <td><strong>Server flow</strong></td>
                <td>Your agent wallet, automatically</td>
                <td><code>PayClient</code></td>
                <td>AI agents, automated billing, server-to-server transfers</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          The browser flow is what this app uses. No API keys are needed — the user connects MetaMask,
          signs a payment authorization, and Cross402 handles the rest. The server flow requires API
          keys and must only run in a backend or Node script.
        </p>

        <h3>Payment flow at a glance</h3>
        <div className="callout callout-info">
          <strong>1. Create intent</strong> — your app tells Cross402 who to pay, how much, and on which chains.<br /><br />
          <strong>2. User signs</strong> — MetaMask shows the user a signing prompt. The user's private key never leaves their browser.<br /><br />
          <strong>3. Submit proof</strong> — your app sends the signature to Cross402, which verifies and submits the on-chain transfer.<br /><br />
          <strong>4. Poll for settlement</strong> — Cross402 bridges and settles USDC to the recipient on the target chain. You poll until <code>TARGET_SETTLED</code>.
        </div>
      </section>

      <hr className="divider" />

      {/* Setup */}
      <section id="setup">
        <h2>Setup</h2>

        <h3>Prerequisites</h3>
        <p>Before you start, make sure you have:</p>
        <ul style={{ paddingLeft: '1.25rem', color: '#334155', fontSize: '0.9rem', lineHeight: '2' }}>
          <li><strong>Node.js 18+</strong> installed</li>
          <li><strong>MetaMask</strong> (or any EIP-1193 browser wallet) installed in your browser</li>
          <li><strong>USDC balance</strong> on the chain you want to pay from — the user must have enough USDC to cover the payment amount</li>
          <li>An <strong>EVM wallet address</strong> to receive payments (your agent wallet)</li>
          <li>API keys from <a href="https://agent.tech/dashboard" target="_blank" rel="noreferrer">agent.tech/dashboard</a> if you plan to use the server flow</li>
        </ul>

        <h3>Install</h3>
        <p>
          The browser flow needs <code>ethers</code> to communicate with MetaMask and sign EIP-712 typed data.
          The server flow only needs the base package.
        </p>
        <p><strong>Browser / frontend:</strong></p>
        <CodeBlock code={INSTALL_BROWSER} lang="bash" />
        <p><strong>Server / Node only:</strong></p>
        <CodeBlock code={INSTALL_SERVER} lang="bash" />

        <h3>Environment variables</h3>
        <p>
          Copy <code>.env.example</code> to <code>.env</code> and fill in your values.
          Variables with the <code>VITE_</code> prefix are bundled into the browser — only put
          non-sensitive values there. API keys must never have the <code>VITE_</code> prefix.
        </p>
        <CodeBlock code={ENV_SETUP} lang="bash" />
        <CodeBlock code={ENV_VARS} lang="bash" file=".env" />

        <div className="callout callout-info">
          <strong>VITE_CREATOR_RECIPIENT</strong> is optional but useful if you're building a tip jar or creator page.
          Set it to your EVM wallet address and it will be pre-filled in the recipient field — so people
          visiting your page don't have to paste in an address manually. Leave it blank if you want the
          recipient field to be empty on load (useful if you're building a general-purpose payment form
          where different recipients can be entered each time).
        </div>

        <h3>Local dev proxy (CORS)</h3>
        <p>
          Browsers block cross-origin requests from <code>localhost</code> unless the server sends the right CORS headers.
          Add a Vite proxy so all <code>/api</code> calls are forwarded server-side during development.
          This is only needed locally — on Vercel and other production hosts the browser hits the API directly.
        </p>
        <CodeBlock code={VITE_PROXY} file="vite.config.ts" />

        <div className="callout callout-warn">
          Never put <code>PAY_API_KEY</code> or <code>PAY_SECRET_KEY</code> into a <code>VITE_</code> variable.
          Anything prefixed with <code>VITE_</code> is embedded in the JavaScript bundle and visible to anyone
          who opens DevTools. Server-only keys belong in <code>.env</code> without the prefix and should only
          be read by Node.js code.
        </div>
      </section>

      <hr className="divider" />

      {/* Browser Flow */}
      <section id="browser">
        <h2>Browser Flow — <code>PublicPayClient</code></h2>
        <p>
          Use this flow when the <strong>user pays from their own wallet</strong>. No API keys are required —
          <code>PublicPayClient</code> is safe to use directly in the browser. The user connects MetaMask,
          signs an authorization, and Cross402 settles USDC on their behalf.
        </p>

        <div className="callout callout-warn">
          The user must have enough USDC on the <strong>payer chain</strong> before they sign.
          If they don't, the payment will fail with <code>VERIFICATION_FAILED</code> after submission.
          There is no way to catch this before submitting — instruct users to check their balance first.
        </div>

        <Step n={1} title="Initialize the client">
          <p>
            Create this file once. It sets up a browser-safe Cross402 client with no credentials.
            Import <code>client</code> from here anywhere in your frontend — never create multiple instances.
          </p>
          <CodeBlock code={BROWSER_INIT} file="src/lib/publicClient.ts" />
        </Step>

        <Step n={2} title="Create a payment intent">
          <p>
            This is the first API call. It registers the payment with Cross402 and returns
            an <code>intentId</code> (to track the payment) and <code>paymentRequirements</code> (the
            signing data MetaMask needs). Nothing is charged yet — the intent just reserves a slot.
          </p>
          <p>
            The intent expires <strong>10 minutes</strong> after creation. If the user takes longer than
            that to sign, you'll need to create a new intent.
          </p>
          <CodeBlock code={BROWSER_CREATE_INTENT} file="src/lib/payment.ts" />
          <div className="callout callout-warn">
            The <code>recipient</code> address format must match the <code>targetChain</code>.
            Use an EVM <code>0x…</code> address for Base, Ethereum, Arbitrum, Polygon, and BSC.
            Use a Solana public key for <code>targetChain: 'solana'</code>.
          </div>
        </Step>

        <Step n={3} title="Switch MetaMask to the payer chain">
          <p>
            Before signing, the user's wallet must be on the <strong>payer chain</strong> — the chain
            they're sending USDC from. This helper sends a <code>wallet_switchEthereumChain</code> request
            to MetaMask. The user will see a "Switch network" prompt if they're on the wrong chain.
          </p>
          <p>
            Note: this only works for EVM chains. Non-EVM chains like Solana require the user to
            switch manually in their wallet.
          </p>
          <CodeBlock code={CHAIN_SWITCH} file="src/lib/wallet/chains.ts" />
        </Step>

        <Step n={4} title="Build and sign the settle proof">
          <p>
            This is the core of the browser flow. The function reads signing parameters
            from <code>paymentRequirements</code>, constructs an{' '}
            <a href="https://eips.ethereum.org/EIPS/eip-3009" target="_blank" rel="noreferrer">EIP-3009</a>{' '}
            <code>TransferWithAuthorization</code> typed message, and asks MetaMask to sign it.
          </p>
          <p>
            EIP-3009 is a gasless signing standard supported by USDC on most EVM chains. Instead of
            the user submitting an on-chain <code>approve()</code> transaction, they sign a message
            off-chain that authorizes Cross402 to move a specific amount of USDC within a time window.
            The private key never leaves the user's wallet — only the resulting signature is sent.
          </p>
          <p>
            The function returns a base64-encoded proof string that you pass to <code>submitProof</code> in the next step.
          </p>
          <CodeBlock code={SIGN_PROOF} file="src/lib/wallet/signSettleProof.ts" />
        </Step>

        <Step n={5} title="Set up a poll helper">
          <p>
            After submitting the proof, settlement takes a few seconds. This helper polls
            <code> getIntent()</code> every 3 seconds and resolves when the payment reaches a
            terminal status — either success (<code>TARGET_SETTLED</code>) or a failure state.
          </p>
          <CodeBlock code={POLL_HELPER} file="src/lib/pollIntent.ts" />
        </Step>

        <Step n={6} title="Submit the proof and wait for settlement">
          <p>
            Wire everything together: switch chain → get signer → sign → submit → poll.
            This is the sequence that runs when the user clicks "Send tip" (or equivalent).
          </p>
          <CodeBlock code={SUBMIT_AND_POLL} file="src/App.tsx" />
        </Step>
      </section>

      <hr className="divider" />

      {/* Server Flow */}
      <section id="server">
        <h2>Server Flow — <code>PayClient</code></h2>
        <p>
          Use this flow when <strong>your backend initiates and signs the payment automatically</strong> —
          no user or MetaMask involved. Your agent wallet is registered with Cross402 and holds the
          funds; Cross402 signs and broadcasts on-chain when you call <code>executeIntent</code>.
        </p>
        <p>
          This is ideal for AI agents paying for services, automated billing, or any payment that
          should happen in the background without user interaction.
        </p>

        <div className="callout callout-warn">
          <strong>Never import <code>PayClient</code> in browser code.</strong> Your <code>apiKey</code> and{' '}
          <code>secretKey</code> would be visible to anyone who opens DevTools. Use <code>PublicPayClient</code>{' '}
          for the frontend. <code>PayClient</code> belongs only in Node.js scripts, Express routes,
          or any other server-side runtime.
        </div>

        <Step n={1} title="Get your API keys">
          <p>
            Go to <a href="https://agent.tech/dashboard" target="_blank" rel="noreferrer">agent.tech/dashboard</a>,
            create an agent, and copy your API key and secret key. Add them to your <code>.env</code> file —
            never commit this file to version control.
          </p>
          <CodeBlock code={SERVER_ENV} lang="bash" file=".env  (never commit this file)" />
        </Step>

        <Step n={2} title="Initialize PayClient">
          <p>
            Create this file in your backend and import <code>client</code> from here everywhere on the server.
            It reads credentials from environment variables so they're never hardcoded.
          </p>
          <CodeBlock code={SERVER_INIT} file="src/lib/cross402.ts  (server only)" />
        </Step>

        <Step n={3} title="Create an intent">
          <p>
            Same concept as the browser flow, but you can identify the recipient by <code>email</code> or
            wallet address. Cross402 resolves the email to the associated wallet on the backend.
          </p>
          <CodeBlock code={SERVER_CREATE} file="src/server/payment.ts" />
        </Step>

        <Step n={4} title="Execute and poll">
          <p>
            <code>executeIntent</code> triggers Cross402 to sign and broadcast the on-chain payment
            using your agent wallet. Then poll until <code>TARGET_SETTLED</code>.
          </p>
          <CodeBlock code={SERVER_EXECUTE} file="src/server/payment.ts" />
        </Step>
      </section>

      <hr className="divider" />

      {/* Supported Chains */}
      <section id="chains">
        <h2>Supported Chains</h2>
        <p>
          The payer chain is where the user sends USDC from. The target chain is where the recipient
          receives it. These can be different — that's the point of Cross402.
        </p>
        <p>
          The list of available chains is fetched live from the API via <code>listSupportedChains()</code>,
          so it updates automatically when Cross402 adds new chains.
        </p>
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
        <div className="callout callout-info">
          SKALE Base and MegaETH are payer-only — users can pay <em>from</em> these chains
          but recipients cannot receive <em>on</em> them. Omit <code>targetChain</code> to default to <code>'base'</code>.
        </div>
      </section>

      <hr className="divider" />

      {/* Statuses */}
      <section id="statuses">
        <h2>Intent Statuses</h2>
        <p>
          After submitting a proof, poll <code>getIntent(intentId)</code> every few seconds.
          The intent moves through these states in order. Stop polling when you reach a terminal status.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Status</th><th>What it means</th><th>Terminal?</th></tr>
            </thead>
            <tbody>
              {[
                ['AWAITING_PAYMENT',    'Intent created. Waiting for the user to sign and submit a proof.',                     false, 'yellow'],
                ['PENDING',             'Proof submitted. Cross402 is verifying the payment on the source chain.',              false, 'yellow'],
                ['SOURCE_SETTLED',      'Source chain payment confirmed. Cross402 is now bridging to the target chain.',        false, 'yellow'],
                ['TARGET_SETTLING',     'Bridge complete. Settlement transaction is being submitted on the target chain.',      false, 'yellow'],
                ['TARGET_SETTLED',      'Done. USDC has arrived in the recipient\'s wallet on the target chain.',              true,  'green'],
                ['VERIFICATION_FAILED', 'The source payment could not be verified — usually insufficient USDC balance. No funds moved.', true, 'red'],
                ['PARTIAL_SETTLEMENT',  'Source chain settled but the target transfer failed. Contact support for reconciliation.', true, 'red'],
                ['EXPIRED',             'The intent was not executed within 10 minutes. Create a new intent and try again.',   true,  'red'],
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
          Poll every <strong>3 seconds</strong>. Terminal statuses to handle:
          <br />— <code>TARGET_SETTLED</code> → payment succeeded
          <br />— <code>VERIFICATION_FAILED</code> → user likely had insufficient USDC
          <br />— <code>EXPIRED</code> → took too long; create a new intent
          <br />— <code>PARTIAL_SETTLEMENT</code> → contact Cross402 support
        </div>
      </section>

      <hr className="divider" />

      {/* Errors */}
      <section id="errors">
        <h2>Error Handling</h2>
        <p>
          The SDK throws typed errors so you can handle different failure modes cleanly.
          Wrap all client calls in a try/catch and check the error type.
        </p>
        <CodeBlock code={ERROR_HANDLING} file="anywhere you call client methods" />
        <div className="table-wrap">
          <table>
            <thead><tr><th>Error class</th><th>When it's thrown</th><th>Common causes</th></tr></thead>
            <tbody>
              <tr>
                <td><code>PayValidationError</code></td>
                <td>Before the API is called — bad input detected by the SDK</td>
                <td>Amount below $0.02, invalid wallet address format, missing required field</td>
              </tr>
              <tr>
                <td><code>PayApiError</code></td>
                <td>The API returned an HTTP error</td>
                <td>400 = bad request, 401 = wrong API keys, 429 = rate limited</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="callout callout-warn">
          <strong>Key limits to know:</strong>
          <br />— Amount: <strong>$0.02 minimum, $1,000,000 maximum</strong>, up to 6 decimal places
          <br />— Intent expiry: <strong>10 minutes</strong> from creation
          <br />— Rate limit: approximately <strong>60 requests / IP / minute</strong>
        </div>
      </section>

    </div>
  );
}
