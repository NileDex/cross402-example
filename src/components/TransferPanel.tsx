type TransferPanelProps = {
  amount: string;
  setAmount: (v: string) => void;
  payerChain: string;
  setPayerChain: (v: string) => void;
  targetChain: string;
  setTargetChain: (v: string) => void;
  recipient: string;
  setRecipient: (v: string) => void;
  payerChains: string[];
  targetChains: string[];
  walletAddress: string;
  intentId: string;
  status: string;
  log: string;
  busy: boolean;
  onConnect: () => void;
  onTransfer: () => void;
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function TransferPanel({
  amount,
  setAmount,
  payerChain,
  setPayerChain,
  targetChain,
  setTargetChain,
  recipient,
  setRecipient,
  payerChains,
  targetChains,
  walletAddress,
  intentId,
  status,
  log,
  busy,
  onConnect,
  onTransfer,
}: TransferPanelProps) {
  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
    : null;

  return (
    <section id="transfer" className="swap-section">

      {/* ── Swap Card ── */}
      <div className="swap-card">

        <div className="swap-card-header">
          <span className="swap-card-title">Send USDC</span>
          <span className="swap-card-badge">Cross-chain</span>
        </div>

        <div className="swap-body">

          {/* Progress stepper */}
          <div className="swap-steps">

            {/* Step 1 — FROM */}
            <div className="swap-step">
              <div className="step-indicator">
                <div className="step-circle step-circle--active">1</div>
                <div className="step-line" />
              </div>
              <div className="step-content">
                <span className="swap-box-label">From</span>
                <div className="swap-box-row">
                  <select
                    className="chain-select"
                    value={payerChain}
                    onChange={(e) => setPayerChain(e.target.value)}
                    disabled={busy}
                  >
                    {(payerChains.length ? payerChains : [payerChain]).map((c) => (
                      <option key={c} value={c}>{capitalize(c)}</option>
                    ))}
                  </select>
                  <input
                    className="amount-input"
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    disabled={busy}
                  />
                  <span className="amount-usdc">USDC</span>
                </div>
              </div>
            </div>

            {/* Step 2 — TO */}
            <div className="swap-step">
              <div className="step-indicator">
                <div className="step-circle step-circle--active">2</div>
                <div className="step-line" />
              </div>
              <div className="step-content">
                <span className="swap-box-label">To</span>
                <div className="swap-box-row">
                  <select
                    className="chain-select"
                    value={targetChain}
                    onChange={(e) => setTargetChain(e.target.value)}
                    disabled={busy}
                  >
                    {targetChains.map((c) => (
                      <option key={c} value={c}>{capitalize(c)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Step 3 — Recipient */}
            <div className="swap-step swap-step--last">
              <div className="step-indicator">
                <div className="step-circle">3</div>
              </div>
              <div className="step-content">
                <span className="swap-box-label">Recipient address</span>
                <input
                  className="recipient-input"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="0x… EVM wallet address"
                  disabled={busy}
                />
              </div>
            </div>

          </div>

          {/* Action buttons */}
          <div className="swap-actions">
            <button
              type="button"
              className="swap-btn swap-btn--secondary"
              disabled={busy}
              onClick={onConnect}
            >
              {shortAddress ? `✓ ${shortAddress}` : 'Connect Wallet'}
            </button>
            <button
              type="button"
              className="swap-btn swap-btn--primary"
              disabled={busy}
              onClick={onTransfer}
            >
              {busy ? 'Processing…' : 'Transfer USDC →'}
            </button>
          </div>

          {/* Status */}
          {(intentId || status) && (
            <div className="swap-status">
              {intentId && (
                <span className="swap-status-id">
                  <code>{intentId.slice(0, 14)}…</code>
                </span>
              )}
              {status && (
                <span className="swap-status-badge" data-status={status}>
                  {status.replace(/_/g, ' ')}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Activity Log ── */}
      <div className="swap-log-wrap">
        <span className="swap-log-label">Activity</span>
        <pre className="swap-log">{log}</pre>
      </div>

    </section>
  );
}
