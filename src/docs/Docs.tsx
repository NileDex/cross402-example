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
      <button
        className={`copy-btn${copied ? ' copied' : ''}`}
        style={file ? { top: '2.4rem' } : undefined}
        onClick={copy}
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <pre style={file ? { paddingTop: '0.75rem' } : undefined}>
        <code>{code.trim()}</code>
      </pre>
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

// ─── Code Snippets (exact project file contents) ──────────────────────────────

const INSTALL = `npm install @cross402/usdc ethers`;

const ENV = `# ── Browser (Vite bundles anything with VITE_ prefix) ──────────
VITE_PAY_BASE_URL=https://api-pay.agent.tech
VITE_CREATOR_RECIPIENT=0xYourEVMWalletAddress

# ── Server-side only — NEVER put these in a VITE_ variable ──────
# Used by PayClient in Node.js/backend code only.
# Get keys at https://agent.tech/dashboard
PAY_BASE_URL=https://api-pay.agent.tech
PAY_API_KEY=ap_key_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAY_SECRET_KEY=ap_secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`;

const PUBLIC_CLIENT = `import { IntentStatus, PublicPayClient } from '@cross402/usdc/client';

const baseUrl =
  import.meta.env.VITE_PAY_BASE_URL ?? 'https://api-pay.agent.tech';

// No API keys needed — safe to use directly in the browser.
export const publicClient = new PublicPayClient({ baseUrl });

export { IntentStatus, baseUrl };`;

const WALLET = `import { BrowserProvider } from 'ethers';

export async function connectInjectedWallet() {
  if (!window.ethereum) {
    throw new Error(
      'No injected wallet found. Install MetaMask or another browser wallet.',
    );
  }

  const provider = new BrowserProvider(window.ethereum);
  await provider.send('eth_requestAccounts', []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const network = await provider.getNetwork();

  return { provider, signer, address, chainId: Number(network.chainId) };
}`;

const CHAINS = `// EVM chain IDs for wallet_switchEthereumChain
export const CHAIN_ID_BY_NAME: Record<string, string> = {
  base:               '0x2105',
  ethereum:           '0x1',
  arbitrum:           '0xa4b1',
  bsc:                '0x38',
  polygon:            '0x89',
  'base-sepolia':     '0x14a34',
  'ethereum-sepolia': '0xaa36a7',
  'arbitrum-sepolia': '0x66eee',
};

export async function switchToPayerChain(payerChain: string): Promise<void> {
  const hexId = CHAIN_ID_BY_NAME[payerChain];
  if (!hexId || !window.ethereum) {
    throw new Error(
      \`No wallet chain mapping for "\${payerChain}". Add the network manually.\`,
    );
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: hexId }],
    });
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code === 4902) {
      throw new Error(\`Chain "\${payerChain}" is not in your wallet. Add it first.\`);
    }
    throw err;
  }
}`;

const SIGN_PROOF = `import type { PaymentRequirements } from '@cross402/usdc/client';
import { ethers, type Signer } from 'ethers';

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

  const chainId = parseInt(network.split(':')[1], 10);
  if (isNaN(chainId)) throw new Error(\`Cannot parse chainId from: "\${network}"\`);

  const from        = await signer.getAddress();
  const nowSecs     = Math.floor(Date.now() / 1000);
  const validAfter  = 0;
  const validBefore = nowSecs + (maxTimeoutSeconds ?? 600);
  const nonce       = ethers.hexlify(ethers.randomBytes(32));

  const domain = { name: extra.name, version: extra.version, chainId, verifyingContract: asset };

  const message = {
    from,
    to:          payTo,
    value:       BigInt(amount),
    validAfter:  BigInt(validAfter),
    validBefore: BigInt(validBefore),
    nonce,
  };

  // Triggers the MetaMask signing popup — user approves or rejects here.
  const signature = await signer.signTypedData(domain, TWA_TYPES, message);

  const proof = {
    x402Version: 2,
    resource: { url: '/api/intents', description: 'X402 payment', mimeType: 'application/json' },
    accepted: { scheme, network, amount, asset, payTo, maxTimeoutSeconds, extra: extra ?? {} },
    payload: {
      signature,
      authorization: {
        from, to: payTo, value: amount,
        validAfter: String(validAfter), validBefore: String(validBefore), nonce,
      },
    },
  };

  return btoa(JSON.stringify(proof));
}`;

const POLL = `import type { GetIntentResponse } from '@cross402/usdc/client';
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
  intervalMs  = 3000,
): Promise<GetIntentResponse> {
  for (let i = 0; i < maxAttempts; i++) {
    const intent = await publicClient.getIntent(intentId);
    onStatus?.(intent.status);

    if (intent.status === IntentStatus.TargetSettled) return intent;
    if (TERMINAL_FAILURE.has(intent.status)) {
      throw new Error(\`Payment ended with status: \${intent.status}\`);
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('Timed out waiting for payment settlement.');
}`;

const WIRE_UP = `import { publicClient, IntentStatus } from './lib/publicClient';
import { connectInjectedWallet }         from './lib/wallet/wallet';
import { switchToPayerChain }            from './lib/wallet/chains';
import { buildSettleProof }              from './lib/wallet/signSettleProof';
import { pollUntilTerminal }             from './lib/pollIntent';

async function sendUSDC(recipient: string, amount: string, payerChain: string, targetChain: string) {
  // 1. Validate the recipient address before anything else.
  if (!/^0x[0-9a-fA-F]{40}$/.test(recipient)) {
    throw new Error('Invalid EVM address.');
  }

  // 2. Create a payment intent — nothing is charged yet.
  const intent = await publicClient.createIntent({
    recipient,
    amount,      // e.g. "10.00"
    payerChain,  // e.g. "base"
    targetChain, // e.g. "ethereum"
  });

  // 3. Switch MetaMask to the chain the user is paying from.
  await switchToPayerChain(payerChain);

  // 4. Connect wallet and get the signer.
  const { signer } = await connectInjectedWallet();

  // 5. Build the EIP-3009 proof — triggers MetaMask signing popup.
  const proof = await buildSettleProof(signer, intent.paymentRequirements);

  // 6. Submit the signed proof to Cross402.
  await publicClient.submitProof(intent.intentId, proof);

  // 7. Poll until the payment settles (or fails).
  const result = await pollUntilTerminal(intent.intentId, (status) => {
    console.log('Status:', status); // update your UI here
  });

  if (result.status === IntentStatus.TargetSettled) {
    console.log('Done! Tx:', result.targetPayment?.txHash);
  }
}`;

// ─── Nav ──────────────────────────────────────────────────────────────────────

const NAV_SECTIONS = [
  { href: '#overview', label: 'Overview' },
  { href: '#setup',    label: 'Setup' },
  { href: '#flow',     label: 'Payment Flow' },
  { href: '#chains',   label: 'Supported Chains' },
  { href: '#statuses', label: 'Intent Statuses' },
  { href: '#errors',   label: 'Error Handling' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Docs() {
  return (
    <div className="docs-shell">

      {/* ── Top bar ── */}
      <header className="docs-topbar">
        <a href="/" className="docs-logo">
          <svg className="docs-logo-mark" viewBox="0 0 32 32" fill="none" aria-hidden>
            <rect width="32" height="32" rx="8" fill="url(#dLogoGrad)" />
            <path
              d="M9 8v16M9 8l10 10M9 16l10 8"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="dLogoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop stopColor="#a855f7" />
                <stop offset="1" stopColor="#6e54ff" />
              </linearGradient>
            </defs>
          </svg>
          <span className="docs-logo-text">Kyte</span>
          <span className="docs-logo-divider" aria-hidden />
          <span className="docs-logo-label">Integration Guide</span>
        </a>
        <a href="/" className="docs-back-btn">
          <svg viewBox="0 0 20 20" fill="none" width="14" height="14" aria-hidden>
            <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to app
        </a>
      </header>

      {/* ── Two-column layout ── */}
      <div className="docs-layout">

        {/* Sidebar */}
        <aside className="docs-sidebar">
          <span className="docs-sidebar-label">On this page</span>
          <nav>
            {NAV_SECTIONS.map((s) => (
              <a key={s.href} href={s.href}>{s.label}</a>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="docs-content">

          {/* Hero */}
          <div className="docs-hero">
            <span className="docs-hero-eyebrow">Client-side · No API keys</span>
            <h1>Integration Guide</h1>
            <p>
              Send USDC across blockchains from the browser — no backend required.
              Copy the files below directly into your project.
            </p>
            <div className="docs-nav-pills">
              {NAV_SECTIONS.map((s) => (
                <a key={s.href} href={s.href}>{s.label}</a>
              ))}
            </div>
          </div>

          {/* ── Overview ── */}
          <section id="overview">
            <h2>Overview</h2>
            <p>
              Kyte uses <strong>Cross402</strong> — a payment layer that lets a user pay USDC on one
              chain and a recipient receive it on a different chain, all in one flow.
            </p>
            <p>
              Cross402 ships <strong>two clients</strong>. Which one you use depends on who signs the payment:
            </p>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Client</th><th>Import</th><th>API keys?</th><th>Where to use</th><th>Who signs</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>PublicPayClient</strong></td>
                    <td><code>@cross402/usdc/client</code></td>
                    <td><span className="badge badge-green">None</span></td>
                    <td>Browser / frontend</td>
                    <td>The user, via MetaMask</td>
                  </tr>
                  <tr>
                    <td><strong>PayClient</strong></td>
                    <td><code>@cross402/usdc</code></td>
                    <td><span className="badge badge-red">Required</span></td>
                    <td>Node.js / server only</td>
                    <td>Your agent wallet, automatically</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="callout callout-info">
              <strong>This guide covers the browser flow using <code>PublicPayClient</code>.</strong>{' '}
              No API keys are needed — the user connects MetaMask and signs the payment themselves.
              Your API keys (<code>PAY_API_KEY</code> / <code>PAY_SECRET_KEY</code>) are only used
              if you add a server-side <code>PayClient</code> later.
            </div>

            <h3>Browser flow — 4 steps</h3>
            <div className="callout callout-info" style={{ marginTop: 0 }}>
              <strong>1. Create intent</strong> — tell Cross402 who to pay, how much, and on which chains. Nothing is charged yet.<br /><br />
              <strong>2. Switch chain</strong> — MetaMask switches to the chain the user is paying from.<br /><br />
              <strong>3. Sign</strong> — MetaMask shows a signing prompt. The user approves. No gas, no on-chain <code>approve()</code> needed.<br /><br />
              <strong>4. Submit &amp; settle</strong> — your app sends the signature to Cross402, which settles USDC on the target chain.
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Requirement</th><th>Details</th></tr>
                </thead>
                <tbody>
                  <tr><td>MetaMask (or any EIP-1193 wallet)</td><td>Installed in the user's browser</td></tr>
                  <tr><td>USDC balance</td><td>User must have USDC on the payer chain</td></tr>
                  <tr><td><code>@cross402/usdc</code> + <code>ethers</code></td><td>The only two npm packages needed</td></tr>
                  <tr><td>Recipient EVM address</td><td>A valid <code>0x…</code> 42-character address</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <hr className="divider" />

          {/* ── Setup ── */}
          <section id="setup">
            <h2>Setup</h2>

            <Step n={1} title="Install dependencies">
              <CodeBlock code={INSTALL} lang="bash" />
            </Step>

            <Step n={2} title="Set up your .env file">
              <p>
                Copy <code>.env.example</code> to <code>.env</code> and fill in your values.
                Variables prefixed with <code>VITE_</code> are bundled into the browser by Vite —
                only put non-secret values there. Your API keys must <strong>never</strong> have the <code>VITE_</code> prefix.
              </p>
              <CodeBlock code={ENV} lang="bash" file=".env" />
              <div className="callout callout-warn">
                <code>PAY_API_KEY</code> and <code>PAY_SECRET_KEY</code> are for server-side <code>PayClient</code> only.
                The browser never reads them — Vite only injects <code>VITE_*</code> variables into the bundle.
                Never add API keys with a <code>VITE_</code> prefix or they'll be visible to anyone in DevTools.
              </div>
            </Step>
          </section>

          <hr className="divider" />

          {/* ── Payment Flow ── */}
          <section id="flow">
            <h2>Payment Flow</h2>
            <p>
              Create these five files in your project. Each one is a single responsibility —
              copy them as-is, then wire them together using the example at the end.
            </p>

            <Step n={1} title="Create the browser client">
              <p>
                This sets up <code>PublicPayClient</code> — the only client you need for the browser.
                No credentials required. Import <code>publicClient</code> from here everywhere in your frontend.
              </p>
              <CodeBlock code={PUBLIC_CLIENT} file="src/lib/publicClient.ts" />
            </Step>

            <Step n={2} title="Connect MetaMask">
              <p>
                Requests wallet access and returns a <code>signer</code> (for signing),
                an <code>address</code> (the connected account), and the current <code>chainId</code>.
              </p>
              <CodeBlock code={WALLET} file="src/lib/wallet/wallet.ts" />
            </Step>

            <Step n={3} title="Switch to the payer chain">
              <p>
                Before signing, the user's wallet must be on the chain they're paying from.
                This sends a <code>wallet_switchEthereumChain</code> request to MetaMask.
                The user will see a "Switch network" prompt if they're on the wrong chain.
              </p>
              <CodeBlock code={CHAINS} file="src/lib/wallet/chains.ts" />
            </Step>

            <Step n={4} title="Build the EIP-3009 settle proof">
              <p>
                This is what triggers the MetaMask signing popup. It builds an{' '}
                <strong>EIP-3009 TransferWithAuthorization</strong> — a gasless signature that
                authorizes Cross402 to move a specific amount of USDC within a time window.
                The private key never leaves the user's wallet.
              </p>
              <p>Returns a base64 string you pass directly to <code>submitProof</code>.</p>
              <CodeBlock code={SIGN_PROOF} file="src/lib/wallet/signSettleProof.ts" />
            </Step>

            <Step n={5} title="Poll for settlement">
              <p>
                After submitting the proof, settlement takes a few seconds. This helper
                checks the intent status every 3 seconds and returns when it reaches a
                terminal state — either <code>TARGET_SETTLED</code> (success) or a failure.
              </p>
              <CodeBlock code={POLL} file="src/lib/pollIntent.ts" />
            </Step>

            <Step n={6} title="Wire it all together">
              <p>
                Import the five helpers above and call them in sequence. This is the complete
                payment function — drop it into your component and call it on button click.
              </p>
              <CodeBlock code={WIRE_UP} file="src/sendUSDC.ts" />
              <div className="callout callout-warn">
                Always validate the recipient address with the regex above before calling
                <code> createIntent</code>. A wrong address will send funds with no way to recover them.
              </div>
            </Step>
          </section>

          <hr className="divider" />

          {/* ── Supported Chains ── */}
          <section id="chains">
            <h2>Supported Chains</h2>
            <p>
              The user pays from the <strong>payer chain</strong> and the recipient receives on
              the <strong>target chain</strong>. These can be different — that's the point.
              The live list is fetched via <code>publicClient.listSupportedChains()</code>.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Chain</th>
                    <th>ID string</th>
                    <th>Hex chainId</th>
                    <th>Payer</th>
                    <th>Target</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Base',       'base',       '0x2105',  true,  true],
                    ['Ethereum',   'ethereum',   '0x1',     true,  true],
                    ['Arbitrum',   'arbitrum',   '0xa4b1',  true,  true],
                    ['Polygon',    'polygon',    '0x89',    true,  true],
                    ['BSC',        'bsc',        '0x38',    true,  true],
                    ['Solana',     'solana',     '—',       true,  true],
                    ['HyperEVM',   'hyperevm',   '—',       true,  true],
                    ['Monad',      'monad',      '—',       true,  true],
                    ['SKALE Base', 'skale-base', '—',       true,  false],
                    ['MegaETH',    'megaeth',    '—',       true,  false],
                  ].map(([name, id, hex, payer, target]) => (
                    <tr key={id as string}>
                      <td>{name as string}</td>
                      <td><code>{id as string}</code></td>
                      <td><code>{hex as string}</code></td>
                      <td><span className={`badge ${payer ? 'badge-green' : 'badge-gray'}`}>{payer ? 'Yes' : 'No'}</span></td>
                      <td><span className={`badge ${target ? 'badge-blue' : 'badge-gray'}`}>{target ? 'Yes' : 'No'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="callout callout-info">
              SKALE Base and MegaETH are payer-only — users can pay <em>from</em> them
              but cannot receive <em>on</em> them. If you omit <code>targetChain</code> it defaults to <code>'base'</code>.
            </div>
          </section>

          <hr className="divider" />

          {/* ── Intent Statuses ── */}
          <section id="statuses">
            <h2>Intent Statuses</h2>
            <p>
              Poll <code>publicClient.getIntent(intentId)</code> every few seconds after submitting.
              Stop when you hit a terminal status.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Status</th><th>Meaning</th><th>Terminal?</th></tr>
                </thead>
                <tbody>
                  {[
                    ['AWAITING_PAYMENT',    'Intent created. Waiting for the user to sign.',                       false, 'gray'],
                    ['PENDING',             'Proof submitted. Cross402 is verifying the source payment.',           false, 'gray'],
                    ['SOURCE_SETTLED',      'Source confirmed. Cross402 is bridging to the target chain.',          false, 'gray'],
                    ['TARGET_SETTLING',     'Bridge complete. Submitting the settlement on the target chain.',      false, 'gray'],
                    ['TARGET_SETTLED',      '✓ Done. USDC arrived in the recipient\'s wallet.',                    true,  'green'],
                    ['VERIFICATION_FAILED', '✗ Source payment failed — user likely had insufficient USDC.',        true,  'red'],
                    ['PARTIAL_SETTLEMENT',  '✗ Source settled but target transfer failed. Contact support.',       true,  'red'],
                    ['EXPIRED',             '✗ Not executed within 10 minutes. Create a new intent and retry.',    true,  'red'],
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
          </section>

          <hr className="divider" />

          {/* ── Errors ── */}
          <section id="errors">
            <h2>Error Handling</h2>
            <p>Wrap all client calls in a try/catch and check the error type.</p>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Error</th><th>When</th><th>Common cause</th></tr></thead>
                <tbody>
                  <tr>
                    <td><code>PayValidationError</code></td>
                    <td>Before the API is called</td>
                    <td>Amount below $0.02, invalid address, missing field</td>
                  </tr>
                  <tr>
                    <td><code>PayApiError</code></td>
                    <td>API returned an HTTP error</td>
                    <td>400 bad request · 401 wrong keys · 429 rate limited</td>
                  </tr>
                  <tr>
                    <td>MetaMask rejection</td>
                    <td>User clicks "Reject" in the wallet</td>
                    <td>Catch and show a "Payment cancelled" message</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="callout callout-warn">
              <strong>Limits:</strong> amount $0.02 – $1,000,000 · intent expires after <strong>10 minutes</strong> · ~60 requests / IP / minute
            </div>
          </section>

        </main>
      </div>{/* docs-layout */}

      <footer className="docs-footer">
        <span>© Kyte</span>
        <a href="https://docs.agent.tech/cross402/" target="_blank" rel="noreferrer">Cross402 docs</a>
        <a href="https://agent.tech/dashboard" target="_blank" rel="noreferrer">Dashboard</a>
      </footer>
    </div>
  );
}
