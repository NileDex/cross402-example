import { BrowserProvider } from 'ethers';

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
}
