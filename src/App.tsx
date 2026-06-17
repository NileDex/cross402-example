import { useCallback, useEffect, useState } from 'react';
import './App.css';
import { switchToPayerChain } from './lib/wallet/chains.js';
import { pollUntilTerminal } from './lib/pollIntent.js';
import { IntentStatus, publicClient } from './lib/publicClient.js';
import { buildSettleProof } from './lib/wallet/signSettleProof.js';
import { connectInjectedWallet } from './lib/wallet/wallet.js';

const defaultRecipient =
  import.meta.env.VITE_CREATOR_RECIPIENT?.trim() ?? '';

export default function App() {
  const [amount, setAmount] = useState('5.00');
  const [payerChain, setPayerChain] = useState('base');
  const [targetChain, setTargetChain] = useState('base');
  const [recipient, setRecipient] = useState(defaultRecipient);

  const [payerChains, setPayerChains] = useState<string[]>([]);
  const [targetChains, setTargetChains] = useState<string[]>(['base', 'ethereum', 'arbitrum']);

  const [walletAddress, setWalletAddress] = useState('');
  const [intentId, setIntentId] = useState('');
  const [status, setStatus] = useState('');
  const [log, setLog] = useState('Ready. Connect an injected wallet (MetaMask).');
  const [busy, setBusy] = useState(false);

  const append = useCallback((line: string) => {
    setLog((prev) => `${prev}${line}\n`);
  }, []);

  useEffect(() => {
    publicClient
      .listSupportedChains()
      .then(({ chains, targetChains: targets }) => {
        if (chains.length) setPayerChains(chains);
        if (targets.length) setTargetChains(targets);
        if (chains.length && !chains.includes(payerChain)) {
          setPayerChain(chains[0]);
        }
      })
      .catch((err) => {
        append(`Could not load chains: ${err instanceof Error ? err.message : String(err)}`);
      });
  }, [append]);

  const onConnect = async () => {
    setBusy(true);
    try {
      const { address } = await connectInjectedWallet();
      setWalletAddress(address);
      append(`Wallet connected: ${address}`);
    } catch (err) {
      append(`Connect failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const onSendTip = async () => {
    if (!recipient.trim()) {
      append('Set creator recipient address (your agent EVM wallet).');
      return;
    }
    if (!/^0x[0-9a-fA-F]{40}$/.test(recipient.trim())) {
      append('Invalid recipient address — must be a 0x… EVM address (42 hex characters).');
      return;
    }

    setBusy(true);
    setIntentId('');
    setStatus('');

    try {
      append('Creating payment intent (PublicPayClient)...');
      const intent = await publicClient.createIntent({
        recipient: recipient.trim(),
        amount: amount.trim(),
        payerChain,
        targetChain: targetChain || 'base',
      });

      setIntentId(intent.intentId);
      setStatus(intent.status);
      append(`Intent ${intent.intentId} — ${intent.status}`);
      append(`paymentRequirements: ${JSON.stringify(intent.paymentRequirements, null, 0)}`);

      append('Switching wallet to payer chain...');
      await switchToPayerChain(payerChain);

      const { signer, address } = await connectInjectedWallet();
      append(`Signing as ${address}...`);

      const settleProof = await buildSettleProof(signer, intent.paymentRequirements);
      append('Submitting settle proof...');
      const proofResult = await publicClient.submitProof(intent.intentId, settleProof);
      if (proofResult?.status) setStatus(proofResult.status);

      append('Polling settlement status...');
      const settled = await pollUntilTerminal(intent.intentId, (s) => {
        setStatus(s);
        append(`Status: ${s}`);
      });

      setStatus(settled.status);
      if (settled.status === IntentStatus.TargetSettled) {
        append(
          `Success! Target tx: ${settled.targetPayment?.txHash ?? 'see dashboard'}`,
        );
      }
    } catch (err) {
      append(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="jar">
      <span className="badge">PublicPayClient · injected wallet</span>
      <h1>OmniTip Jar</h1>
      <p className="subtitle">
        Cross402 browser flow — no API secrets in this app. Docs:{' '}
        <a
          href="https://docs.agent.tech/cross402/sdks/js-ts/"
          target="_blank"
          rel="noreferrer"
        >
          JS/TS SDK
        </a>
      </p>

      <label className="field">
        Creator wallet (recipient)
        <input
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="0x… agent EVM address"
          disabled={busy}
        />
      </label>

      <label className="field">
        Amount (USD)
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={busy}
        />
      </label>

      <label className="field">
        Pay from (payer chain)
        <select
          value={payerChain}
          onChange={(e) => setPayerChain(e.target.value)}
          disabled={busy}
        >
          {(payerChains.length ? payerChains : [payerChain]).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        Settle to (target chain)
        <select
          value={targetChain}
          onChange={(e) => setTargetChain(e.target.value)}
          disabled={busy}
        >
          {targetChains.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <div className="wallet-row">
        <button type="button" className="secondary" disabled={busy} onClick={onConnect}>
          {walletAddress ? 'Reconnect wallet' : 'Connect wallet'}
        </button>
      </div>

      <div className="actions">
        <button
          type="button"
          className="primary"
          disabled={busy}
          onClick={onSendTip}
        >
          {busy ? 'Processing…' : 'Send tip'}
        </button>
      </div>

      {walletAddress && (
        <p className="meta">
          Wallet: <code>{walletAddress}</code>
        </p>
      )}
      {intentId && (
        <p className="meta">
          Intent: <code>{intentId}</code>
          {status ? (
            <>
              {' '}
              · <code>{status}</code>
            </>
          ) : null}
        </p>
      )}

      <pre className="log">{log}</pre>

      <a href="/docs" className="docs-link">
        Integration Docs →
      </a>
    </div>
  );
}
