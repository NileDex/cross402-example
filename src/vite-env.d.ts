/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PAY_BASE_URL: string;
  readonly VITE_CREATOR_RECIPIENT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  ethereum?: import('ethers').Eip1193Provider;
}
