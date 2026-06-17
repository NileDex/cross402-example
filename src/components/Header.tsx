type HeaderProps = {
  walletAddress: string;
  busy: boolean;
  onConnect: () => void;
};

export function Header({ walletAddress, busy, onConnect }: HeaderProps) {
  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
    : null;

  return (
    <header className="kyte-header">
      <a href="/" className="kyte-logo" aria-label="Kyte home">
        <svg className="kyte-logo-mark" viewBox="0 0 32 32" fill="none" aria-hidden>
          <rect width="32" height="32" rx="8" fill="url(#logoGrad)" />
          <path
            d="M9 8v16M9 8l10 10M9 16l10 8"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop stopColor="#a855f7" />
              <stop offset="1" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
        </svg>
        <span className="kyte-logo-text">Kyte</span>
      </a>

<div className="kyte-header-actions">
        <a
          href="https://github.com"
          className="kyte-icon-btn"
          aria-label="GitHub"
          target="_blank"
          rel="noreferrer"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
        </a>
        <button
          type="button"
          className="kyte-terminal-btn"
          disabled={busy}
          onClick={onConnect}
        >
          {shortAddress ?? 'Connect Wallet'}
        </button>
      </div>
    </header>
  );
}
