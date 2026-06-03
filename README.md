# OmniTip Jar — Cross402 Cross-Chain USDC Tipping example

A browser-based tipping app built on [Cross402](https://docs.agent.tech/cross402/), letting anyone send USDC across chains using their MetaMask wallet. No API keys in the browser.

---

## What it does

- User connects MetaMask and picks an amount + chain
- App creates a payment intent via `PublicPayClient` (no secrets required)
- User signs an EIP-3009 `TransferWithAuthorization` locally — MetaMask prompt, nothing sent to any server
- Cross402 settles USDC to the recipient on the target chain
- App polls until `TARGET_SETTLED`

---

## Project structure

```
Cross402Exmample/
└── Frontend/
    ├── src/
    │   ├── App.tsx                  # Main tip form — browser flow
    │   ├── lib/
    │   │   ├── wallet/
    │   │   │   ├── wallet.ts        # connectInjectedWallet (MetaMask)
    │   │   │   ├── chains.ts        # switchToPayerChain + chain ID map
    │   │   │   └── signSettleProof.ts  # EIP-3009 TransferWithAuthorization builder
    │   │   ├── publicClient.ts      # PublicPayClient instance (browser-safe)
    │   │   ├── pollIntent.ts        # polls getIntent until terminal status
    │   │   └── cross402.ts          # PayClient (server/Node only — never import in browser)
    │   └── docs/
    │       └── Docs.tsx             # In-app integration guide at /docs
    ├── .env                         # Real secrets — never commit
    └── .env.example                 # Template — copy to .env and fill in values
```

---

## Two clients — know which to use

| Client | Import | Auth required | Where to use |
|--------|--------|---------------|--------------|
| `PublicPayClient` | `@cross402/usdc/client` | No | Browser / frontend |
| `PayClient` | `@cross402/usdc` | Yes — `apiKey` + `secretKey` | Node / backend only |

`App.tsx` uses `PublicPayClient`. The `PayClient` in `cross402.ts` is for future server-side or agent use — never import it in browser code or it will expose your keys in the bundle.

---

## Getting started

```bash
cd Frontend
cp .env.example .env
# Fill in VITE_CREATOR_RECIPIENT with your agent EVM wallet address
# Fill in PAY_API_KEY and PAY_SECRET_KEY if using the server PayClient
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

The in-app integration guide is at [http://localhost:5173/docs](http://localhost:5173/docs).

---

## Environment variables

| Variable | Safe in browser? | Purpose |
|----------|-----------------|---------|
| `VITE_PAY_BASE_URL` | Yes | Cross402 API base URL |
| `VITE_CREATOR_RECIPIENT` | Yes | Default recipient wallet pre-filled in the form |
| `PAY_BASE_URL` | **No** | API base URL for server-side `PayClient` |
| `PAY_API_KEY` | **No** | Cross402 API key — get from [agent.tech/dashboard](https://agent.tech/dashboard) |
| `PAY_SECRET_KEY` | **No** | Cross402 secret key — get from [agent.tech/dashboard](https://agent.tech/dashboard) |

---

## Browser payment flow

```
createIntent({ recipient, amount, payerChain, targetChain })
  → paymentRequirements
  → switchToPayerChain()          // wallet_switchEthereumChain
  → buildSettleProof(signer, req) // EIP-3009 signed locally
  → submitProof(intentId, proof)
  → pollUntilTerminal(intentId)   // polls every 3s
  → TARGET_SETTLED ✓
```

---

## Supported chains

| Chain | ID string | Payer | Target |
|-------|-----------|-------|--------|
| Base | `base` | Yes | Yes |
| Ethereum | `ethereum` | Yes | Yes |
| Arbitrum | `arbitrum` | Yes | Yes |
| Polygon | `polygon` | Yes | Yes |
| BSC | `bsc` | Yes | Yes |
| Solana | `solana` | Yes | Yes |

Full list and signing details: [docs.agent.tech/cross402/concepts/multi-chain-settlement](https://docs.agent.tech/cross402/concepts/multi-chain-settlement/)

---

## Useful links

- [Cross402 docs](https://docs.agent.tech/cross402/)
- [Quick start](https://docs.agent.tech/cross402/quick-start/)
- [JS/TS SDK reference](https://docs.agent.tech/cross402/sdks/js-ts/)
- [Intent statuses](https://docs.agent.tech/cross402/concepts/statuses/)
- [USDT signing (gas flows)](https://docs.agent.tech/cross402/api/usdt-signing/)
