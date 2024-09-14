import { BrowserWallet, Wallet } from '@meshsdk/core';

export interface WalletInfo {
  name: string;
  icon: string;
  version: string;
}

export const getAvailableWallets = async (): Promise<WalletInfo[]> => {
  try {
    const wallets = await BrowserWallet.getInstalledWallets();
    return wallets.map(wallet => ({
      name: wallet.name,
      icon: wallet.icon,
      version: wallet.version
    }));
  } catch (error) {
    console.error('Error fetching available wallets:', error);
    throw new Error('Failed to get available wallets');
  }
};

export const connectWallet = async (walletName: string): Promise<{ wallet: Wallet; networkId: number; address: string }> => {
  try {
    console.log(`Attempting to connect to ${walletName}...`);
    const wallet = await BrowserWallet.enable(walletName);

    if (!wallet) {
      throw new Error('Failed to enable wallet. User may have denied permission.');
    }

    // Wait for the wallet to be fully initialized
    await new Promise(resolve => setTimeout(resolve, 1000));

    const networkId = await wallet.getNetworkId();
    const usedAddresses = await wallet.getUsedAddresses();
    const address = usedAddresses[0]; // Get the first used address as the external address

    if (networkId === undefined || !address) {
      throw new Error('Failed to retrieve wallet information');
    }

    console.log('Wallet connected successfully:', { networkId, address });
    return { wallet, networkId, address };
  } catch (error) {
    console.error('Detailed wallet connection error:', error);
    if (error instanceof Error) {
      throw new Error(`Wallet connection failed: ${error.message}`);
    } else {
      throw new Error('An unknown error occurred while connecting to the wallet');
    }
  }
};

export const getBalance = async (wallet: Wallet): Promise<string> => {
  try {
    const lovelaceBalance = await wallet.getLovelace();
    // Convert lovelace to ADA (1 ADA = 1,000,000 lovelace)
    const adaBalance = (parseInt(lovelaceBalance) / 1000000).toFixed(6);
    return adaBalance;
  } catch (error) {
    console.error('Error fetching balance:', error);
    return "0";
  }
};

export const disconnectWallet = async (wallet: Wallet): Promise<void> => {
  try {
    // Note: The Mesh SDK doesn't provide a direct method to disconnect.
    // This is a placeholder function. You may need to implement custom logic
    // based on your specific requirements and the wallets you support.
    console.log('Disconnecting wallet...');
    // Clear any stored wallet data or state here
    sessionStorage.removeItem('walletInfo');
  } catch (error) {
    console.error('Error disconnecting wallet:', error);
    throw new Error('Failed to disconnect wallet');
  }
};

export const isWalletConnected = async (wallet: Wallet | null): Promise<boolean> => {
  if (!wallet) return false;
  try {
    // Attempt to get the network ID as a simple check
    await wallet.getNetworkId();
    return true;
  } catch (error) {
    console.error('Error checking wallet connection:', error);
    return false;
  }
};

export const getWalletAddresses = async (wallet: Wallet): Promise<string[]> => {
  try {
    const usedAddresses = await wallet.getUsedAddresses();
    const unusedAddresses = await wallet.getUnusedAddresses();
    return [...usedAddresses, ...unusedAddresses];
  } catch (error) {
    console.error('Error fetching wallet addresses:', error);
    throw new Error('Failed to get wallet addresses');
  }
};

export const signMessage = async (wallet: Wallet, message: string): Promise<string> => {
  try {
    const signedMessage = await wallet.signData(message);
    return signedMessage;
  } catch (error) {
    console.error('Error signing message:', error);
    throw new Error('Failed to sign message');
  }
};

// Helper function to convert lovelace to ADA
export const lovelaceToAda = (lovelace: string | number): string => {
  const adaAmount = Number(lovelace) / 1000000;
  return adaAmount.toFixed(6);
};

// Helper function to convert ADA to lovelace
export const adaToLovelace = (ada: string | number): string => {
  const lovelaceAmount = Number(ada) * 1000000;
  return Math.floor(lovelaceAmount).toString();
};

// Function to get the network name based on network ID
export const getNetworkName = (networkId: number): string => {
  switch (networkId) {
    case 0:
      return 'Testnet';
    case 1:
      return 'Mainnet';
    default:
      return 'Unknown Network';
  }
};

// Function to format an address for display (e.g., truncate it)
export const formatAddress = (address: string, maxLength: number = 16): string => {
  if (address.length <= maxLength) return address;
  return `${address.slice(0, maxLength / 2)}...${address.slice(-maxLength / 2)}`;
};

// Function to validate an ADA amount
export const isValidAdaAmount = (amount: string): boolean => {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0 && num <= 45000000; // Max supply of ADA
};

export const sendFunds = async (wallet: Wallet, recipientAddress: string, amountInAda: string): Promise<string> => {
  try {
    // Create a new transaction
    const tx = new Transaction({ initiator: wallet });

    // Convert ADA to lovelace
    const lovelaceAmount = Math.floor(parseFloat(amountInAda) * 1000000);

    // Add the payment output to the transaction
    tx.sendLovelace(recipientAddress, lovelaceAmount.toString());

    // Build the transaction
    const unsignedTx = await tx.build();

    // Sign the transaction
    const signedTx = await wallet.signTx(unsignedTx);

    // Submit the transaction
    const txHash = await wallet.submitTx(signedTx);

    return txHash;
  } catch (error) {
    console.error('Error sending funds:', error);
    throw new Error('Failed to send funds');
  }
};

export const getTransactionHistory = async (wallet: Wallet): Promise<any[]> => {
  try {
    // This is a placeholder. The actual implementation would depend on
    // how you're fetching transaction history (e.g., using an external API)
    const history = await wallet.getTransactions();
    return history;
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    throw new Error('Failed to get transaction history');
  }
};