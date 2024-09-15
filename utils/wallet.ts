import { BrowserWallet, Wallet, Transaction, DataSignature } from '@meshsdk/core';
import axios from 'axios'; // Assuming you are using axios for HTTP requests

export interface WalletInfo {
  name: string;
  icon: string;
  version: string;
}

/**
 * Fetches the list of available wallets.
 * @returns {Promise<WalletInfo[]>} List of available wallets.
 */
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

/**
 * Connects to a specified wallet.
 * @param {string} walletName - The name of the wallet to connect.
 * @returns {Promise<{ wallet: Wallet; networkId: number; address: string }>} Connected wallet details.
 */
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
    return { wallet: wallet as unknown as Wallet, networkId, address };
  } catch (error) {
    console.error('Detailed wallet connection error:', error);
    if (error instanceof Error) {
      throw new Error(`Wallet connection failed: ${error.message}`);
    } else {
      throw new Error('An unknown error occurred while connecting to the wallet');
    }
  }
};

/**
 * Fetches the balance of the connected wallet.
 * @param {Wallet} wallet - The connected wallet.
 * @returns {Promise<string>} Balance in ADA.
 */
export const getBalance = async (wallet: Wallet): Promise<string> => {
  try {
    // Assuming the Wallet type has a getLovelace method that returns the balance in lovelace
    const lovelaceBalance = await (wallet as unknown as BrowserWallet).getLovelace();
    // Convert lovelace to ADA (1 ADA = 1,000,000 lovelace)
    const adaBalance = (parseInt(lovelaceBalance) / 1000000).toFixed(6);
    return adaBalance;
  } catch (error) {
    console.error('Error fetching balance:', error);
    return "0";
  }
};

/**
 * Disconnects the connected wallet.
 * @param {Wallet} wallet - The connected wallet.
 */
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

/**
 * Checks if the wallet is connected.
 * @param {Wallet | null} wallet - The connected wallet.
 * @returns {Promise<boolean>} True if the wallet is connected, false otherwise.
 */
export const isWalletConnected = async (wallet: Wallet | null): Promise<boolean> => {
  if (!wallet) return false;
  try {
    // Attempt to get the network ID as a simple check
    await (wallet as unknown as BrowserWallet).getNetworkId();
    return true;
  } catch (error) {
    console.error('Error checking wallet connection:', error);
    return false;
  }
};

/**
 * Fetches the addresses associated with the connected wallet.
 * @param {Wallet} wallet - The connected wallet.
 * @returns {Promise<string[]>} List of wallet addresses.
 */
export const getWalletAddresses = async (wallet: Wallet): Promise<string[]> => {
  try {
    const usedAddresses = await (wallet as unknown as BrowserWallet).getUsedAddresses();
    const unusedAddresses = await (wallet as unknown as BrowserWallet).getUnusedAddresses();
    return [...usedAddresses, ...unusedAddresses];
  } catch (error) {
    console.error('Error fetching wallet addresses:', error);
    throw new Error('Failed to get wallet addresses');
  }
};

/**
 * Signs a message using the connected wallet.
 * @param {Wallet} wallet - The connected wallet.
 * @param {string} message - The message to sign.
 * @returns {Promise<string>} Signed message.
 */
export const signMessage = async (wallet: Wallet, message: string): Promise<string> => {
  try {
    const signedMessage: DataSignature = await (wallet as unknown as BrowserWallet).signData(message);
    // Assuming DataSignature has a 'signature' property that contains the actual signature
    return signedMessage.signature;
  } catch (error) {
    console.error('Error signing message:', error);
    throw new Error('Failed to sign message');
  }
};

/**
 * Converts lovelace to ADA.
 * @param {string | number} lovelace - The amount in lovelace.
 * @returns {string} The amount in ADA.
 */
export const lovelaceToAda = (lovelace: string | number): string => {
  const adaAmount = Number(lovelace) / 1000000;
  return adaAmount.toFixed(6);
};

/**
 * Converts ADA to lovelace.
 * @param {string | number} ada - The amount in ADA.
 * @returns {string} The amount in lovelace.
 */
export const adaToLovelace = (ada: string | number): string => {
  const lovelaceAmount = Number(ada) * 1000000;
  return Math.floor(lovelaceAmount).toString();
};

/**
 * Gets the network name based on network ID.
 * @param {number} networkId - The network ID.
 * @returns {string} The network name.
 */
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

/**
 * Formats an address for display (e.g., truncate it).
 * @param {string} address - The address to format.
 * @param {number} maxLength - The maximum length of the formatted address.
 * @returns {string} The formatted address.
 */
export const formatAddress = (address: string, maxLength: number = 16): string => {
  if (address.length <= maxLength) return address;
  return `${address.slice(0, maxLength / 2)}...${address.slice(-maxLength / 2)}`;
};

/**
 * Validates an ADA amount.
 * @param {string} amount - The amount in ADA.
 * @returns {boolean} True if the amount is valid, false otherwise.
 */
export const isValidAdaAmount = (amount: string): boolean => {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0 && num <= 45000000; // Max supply of ADA
};

/**
 * Sends funds from the connected wallet to a recipient address.
 * @param {Wallet} wallet - The connected wallet.
 * @param {string} recipientAddress - The recipient address.
 * @param {string} amountInAda - The amount in ADA to send.
 * @returns {Promise<string>} The transaction hash.
 */
export const sendFunds = async (wallet: Wallet, recipientAddress: string, amountInAda: string): Promise<string> => {
  try {
    // Create a new transaction
    const tx = new Transaction({ initiator: wallet as unknown as BrowserWallet });

    // Convert ADA to lovelace
    const lovelaceAmount = Math.floor(parseFloat(amountInAda) * 1000000);

    // Add the payment output to the transaction
    tx.sendLovelace(recipientAddress, lovelaceAmount.toString());

    // Build the transaction
    const unsignedTx = await tx.build();

    // Sign the transaction
    const signedTx = await (wallet as unknown as BrowserWallet).signTx(unsignedTx);

    // Submit the transaction
    const txHash = await (wallet as unknown as BrowserWallet).submitTx(signedTx);

    return txHash;
  } catch (error) {
    console.error('Error staking funds:', error);
    throw new Error('Failed to stake funds');
  }
};

/**
 * Fetches the transaction history of the connected wallet.
 * @param {Wallet} wallet - The connected wallet.
 * @returns {Promise<any[]>} The transaction history.
 */
export const getTransactionHistory = async (wallet: Wallet): Promise<any[]> => {
  try {
    // Fetch the transaction history using an external API
    const address = await (wallet as unknown as BrowserWallet).getUsedAddresses();
    const networkId = await (wallet as unknown as BrowserWallet).getNetworkId();
    const apiUrl = networkId === 1 ? 'https://cardano-mainnet.blockfrost.io/api/v0/addresses' : 'https://cardano-testnet.blockfrost.io/api/v0/addresses';
    const response = await axios.get(`${apiUrl}/${address[0]}/transactions`, {
      headers: {
        project_id: 'your-blockfrost-project-id' // Replace with your Blockfrost project ID
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    throw new Error('Failed to get transaction history');
  }
};