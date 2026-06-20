/** EVM chain IDs for injected-wallet `wallet_switchEthereumChain`. */
export const CHAIN_ID_BY_NAME: Record<string, string> = {
  base: '0x2105',
  ethereum: '0x1',
  arbitrum: '0xa4b1',
  bsc: '0x38',
  polygon: '0x89',
  'base-sepolia': '0x14a34',
  'ethereum-sepolia': '0xaa36a7',
  'arbitrum-sepolia': '0x66eee',
};

export async function switchToPayerChain(payerChain: string, provider?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }): Promise<void> {
  const hexId = CHAIN_ID_BY_NAME[payerChain];
  const eip1193 = provider ?? window.ethereum;
  if (!hexId || !eip1193) {
    throw new Error(
      `No injected wallet chain mapping for "${payerChain}". Add the network in your wallet manually.`,
    );
  }

  try {
    await eip1193.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: hexId }],
    });
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code === 4902) {
      throw new Error(
        `Chain "${payerChain}" is not added to your wallet. Add it, then try again.`,
      );
    }
    throw err;
  }
}
