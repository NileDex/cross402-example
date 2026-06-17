import { useCallback, useEffect, useState } from 'react';
import './App.css';
import { Header } from './components/Header';
import { TransferPanel } from './components/TransferPanel';
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
    <div className="kyte-app">
      <div className="kyte-glow" aria-hidden />

      <Header walletAddress={walletAddress} busy={busy} onConnect={onConnect} />

      <main className="kyte-main">
        <TransferPanel
          amount={amount}
          setAmount={setAmount}
          payerChain={payerChain}
          setPayerChain={setPayerChain}
          targetChain={targetChain}
          setTargetChain={setTargetChain}
          recipient={recipient}
          setRecipient={setRecipient}
          payerChains={payerChains}
          targetChains={targetChains}
          walletAddress={walletAddress}
          intentId={intentId}
          status={status}
          log={log}
          busy={busy}
          onConnect={onConnect}
          onTransfer={onSendTip}
        />
      </main>

      <footer className="kyte-footer">
        <span>© Kyte</span>
        <a href="/docs">Integration guide</a>
        <a href="https://docs.agent.tech/cross402/" target="_blank" rel="noreferrer">
          Cross402 docs
        </a>
        <img src="/powered by.png" alt="Powered by Cross402" className="kyte-footer-powered" />
      </footer>
    </div>
  );
}
