const FEATURES = [
  {
    id: 'multichain',
    title: 'Any Chain',
    description:
      'Send USDC from Base, Ethereum, Arbitrum, Polygon, BSC, or Solana — settle on the chain your recipient prefers.',
    chain: 'ethereum',
    visual: 'globe',
  },
  {
    id: 'instant',
    title: 'Instant Settlement',
    description:
      'Sign once with your wallet. Cross402 handles routing and settlement across chains in seconds.',
    chain: 'base',
    visual: 'cube',
  },
  {
    id: 'secure',
    title: 'Secure by Design',
    description:
      'EIP-3009 authorization signed locally in MetaMask. No API keys or secrets ever touch the browser.',
    chain: 'solana',
    visual: 'shield',
  },
];

function ChainIcon({ chain }: { chain: string }) {
  if (chain === 'ethereum') {
    return (
      <svg viewBox="0 0 28 28" fill="none" width="16" height="16" aria-label="Ethereum">
        <path d="M14 4L7 14.5L14 18L21 14.5L14 4Z" fill="rgba(168,85,247,0.9)" />
        <path d="M7 15.5L14 24L21 15.5L14 19L7 15.5Z" fill="rgba(168,85,247,0.6)" />
      </svg>
    );
  }
  if (chain === 'base') {
    return (
      <svg viewBox="0 0 28 28" fill="none" width="16" height="16" aria-label="Base">
        <circle cx="14" cy="14" r="10" fill="rgba(99,102,241,0.9)" />
        <text x="14" y="19" textAnchor="middle" fontSize="10" fontWeight="700" fill="white">B</text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 28 28" fill="none" width="16" height="16" aria-label="Solana">
      <path d="M6 9h13l3 3-13 0-3-3Z" fill="rgba(45,212,191,0.9)" />
      <path d="M6 14h13l3 3-13 0-3-3Z" fill="rgba(45,212,191,0.7)" />
      <path d="M6 19h13l3 3-13 0-3-3Z" fill="rgba(45,212,191,0.5)" />
    </svg>
  );
}

function ChainBadge({ chain }: { chain: string }) {
  return (
    <span className="feature-chain-badge" title={chain}>
      <ChainIcon chain={chain} />
    </span>
  );
}

function CardVisual({ type }: { type: string }) {
  if (type === 'globe') {
    return (
      <div className="feature-visual feature-visual--globe">
        <svg viewBox="0 0 200 200" fill="none" aria-hidden>
          {/* Outer glow ring */}
          <circle cx="100" cy="100" r="80" stroke="rgba(168,85,247,0.08)" strokeWidth="1" />
          <circle cx="100" cy="100" r="65" stroke="rgba(168,85,247,0.12)" strokeWidth="1" />
          {/* Globe outline */}
          <circle cx="100" cy="100" r="52" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
          {/* Meridians */}
          <ellipse cx="100" cy="100" rx="22" ry="52" stroke="rgba(255,255,255,0.18)" strokeWidth="1.2" />
          <ellipse cx="100" cy="100" rx="42" ry="52" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          {/* Parallels */}
          <path d="M48 82h104M48 100h104M48 118h104" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          {/* Equator */}
          <path d="M48 100h104" stroke="rgba(255,255,255,0.15)" strokeWidth="1.2" />
          {/* Orbit ring */}
          <ellipse cx="100" cy="100" rx="74" ry="20" stroke="rgba(168,85,247,0.45)" strokeWidth="1.5" strokeDasharray="7 4" />
          {/* Center dot */}
          <circle cx="100" cy="100" r="10" fill="rgba(168,85,247,0.7)" />
          <circle cx="100" cy="100" r="5" fill="#a855f7" />
          {/* Satellite dots */}
          <circle cx="174" cy="100" r="5" fill="rgba(168,85,247,0.5)" />
          <circle cx="26" cy="100" r="3" fill="rgba(168,85,247,0.3)" />
          {/* Connection lines */}
          <path d="M110 100 L160 60" stroke="rgba(168,85,247,0.3)" strokeWidth="1" strokeDasharray="4 3" />
          <path d="M110 100 L155 135" stroke="rgba(168,85,247,0.2)" strokeWidth="1" strokeDasharray="4 3" />
          <circle cx="162" cy="58" r="3" fill="rgba(199,210,254,0.5)" />
          <circle cx="157" cy="137" r="2" fill="rgba(199,210,254,0.35)" />
        </svg>
      </div>
    );
  }

  if (type === 'cube') {
    return (
      <div className="feature-visual feature-visual--cube">
        <svg viewBox="0 0 200 200" fill="none" aria-hidden>
          {/* Background floating circles */}
          <circle cx="40" cy="48" r="12" fill="rgba(45,212,191,0.08)" />
          <circle cx="162" cy="40" r="8" fill="rgba(45,212,191,0.06)" />
          <circle cx="150" cy="158" r="10" fill="rgba(45,212,191,0.07)" />
          <circle cx="38" cy="152" r="6" fill="rgba(45,212,191,0.05)" />
          {/* Glow behind cube */}
          <ellipse cx="100" cy="115" rx="55" ry="20" fill="rgba(45,212,191,0.06)" />
          {/* Cube faces */}
          {/* Top face */}
          <path
            d="M100 38 L152 68 L100 98 L48 68 Z"
            fill="rgba(45,212,191,0.12)"
            stroke="#2dd4bf"
            strokeWidth="1.5"
          />
          {/* Right face */}
          <path
            d="M152 68 L152 128 L100 158 L100 98 Z"
            fill="rgba(45,212,191,0.07)"
            stroke="#2dd4bf"
            strokeWidth="1.5"
          />
          {/* Left face */}
          <path
            d="M48 68 L48 128 L100 158 L100 98 Z"
            fill="rgba(45,212,191,0.04)"
            stroke="#2dd4bf"
            strokeWidth="1.5"
          />
          {/* Center vertical line */}
          <path d="M100 38 L100 158" stroke="rgba(45,212,191,0.25)" strokeWidth="1" />
          {/* Center horizontal line */}
          <path d="M48 68 L152 68" stroke="rgba(45,212,191,0.2)" strokeWidth="1" />
          <path d="M48 128 L152 128" stroke="rgba(45,212,191,0.2)" strokeWidth="1" />
          {/* Corner glow dots */}
          <circle cx="100" cy="38" r="4" fill="rgba(45,212,191,0.8)" />
          <circle cx="152" cy="68" r="3" fill="rgba(45,212,191,0.6)" />
          <circle cx="48" cy="68" r="3" fill="rgba(45,212,191,0.5)" />
          <circle cx="100" cy="158" r="4" fill="rgba(45,212,191,0.7)" />
        </svg>
      </div>
    );
  }

  return (
    <div className="feature-visual feature-visual--shield">
      <svg viewBox="0 0 200 200" fill="none" aria-hidden>
        {/* Background glow */}
        <ellipse cx="100" cy="105" rx="58" ry="65" fill="rgba(192,132,252,0.05)" />
        {/* Outer ring */}
        <circle cx="100" cy="100" r="75" stroke="rgba(192,132,252,0.08)" strokeWidth="1" strokeDasharray="6 5" />
        {/* Shield body */}
        <path
          d="M100 28 L148 50 V90 C148 120 126 145 100 158 C74 145 52 120 52 90 V50 Z"
          fill="rgba(192,132,252,0.1)"
          stroke="#c084fc"
          strokeWidth="2"
        />
        {/* Inner shield */}
        <path
          d="M100 44 L136 60 V90 C136 114 120 133 100 143 C80 133 64 114 64 90 V60 Z"
          fill="rgba(192,132,252,0.06)"
          stroke="rgba(192,132,252,0.35)"
          strokeWidth="1"
        />
        {/* Checkmark */}
        <path
          d="M78 98 L92 112 L124 80"
          stroke="#e9d5ff"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Corner sparkles */}
        <circle cx="48" cy="48" r="3" fill="rgba(192,132,252,0.4)" />
        <circle cx="155" cy="42" r="2" fill="rgba(192,132,252,0.3)" />
        <circle cx="160" cy="155" r="3" fill="rgba(192,132,252,0.25)" />
        <circle cx="40" cy="148" r="2" fill="rgba(192,132,252,0.2)" />
      </svg>
    </div>
  );
}

export function FeatureCards() {
  return (
    <section id="chains" className="feature-cards">
      {FEATURES.map((f) => (
        <article key={f.id} className="feature-card">
          <div className="feature-card-visual">
            <CardVisual type={f.visual} />
          </div>
          <div className="feature-card-body">
            <h3>{f.title}</h3>
            <p>{f.description}</p>
            <ChainBadge chain={f.chain} />
          </div>
        </article>
      ))}
    </section>
  );
}
