// pages/index.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';
import { getAvailableWallets, connectWallet, WalletInfo } from '../utils/wallet';
import { BrowserWallet } from '@meshsdk/core';
import Preloader from '../components/Preloader';

interface HomeProps {
  wallet: BrowserWallet | null;
  setWallet: React.Dispatch<React.SetStateAction<BrowserWallet | null>>;
}

const Home: React.FC<HomeProps> = ({ wallet, setWallet }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [availableWallets, setAvailableWallets] = useState<WalletInfo[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchAvailableWallets = async () => {
      try {
        const wallets = await getAvailableWallets();
        setAvailableWallets(wallets);
        if (wallets.length > 0) {
          setSelectedWallet(wallets[0].name);
        }
      } catch (err) {
        console.error('Error fetching available wallets:', err);
        setError('Error fetching available wallets. Please refresh and try again.');
      }
    };

    fetchAvailableWallets();

    // Check if wallet is already connected
    if (wallet) {
      router.push('/dash');
    }
  }, [wallet, router]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const { wallet: connectedWallet, networkId, address } = await connectWallet(selectedWallet);
      setWallet(connectedWallet);
      console.log('Connected to wallet:', { networkId, address });

      // Store wallet info in session storage (more secure than localStorage)
      sessionStorage.setItem('walletInfo', JSON.stringify({ networkId, address }));

      setIsRedirecting(true);
      router.push('/dash');
    } catch (err) {
      console.error('Connection error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred. Please try again.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  if (isRedirecting) {
    return <Preloader message="Redirecting to dashboard..." />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Stake your ADA</h1>
        {wallet ? (
          <p className={styles.message}>Wallet connected. You can now access the dashboard.</p>
        ) : (
          <>
            <p className={styles.message}>Please select and connect your wallet</p>
            {availableWallets.length > 0 ? (
              <>
                <select 
                  className={styles.walletSelect}
                  value={selectedWallet}
                  onChange={(e) => setSelectedWallet(e.target.value)}
                >
                  {availableWallets.map((wallet) => (
                    <option key={wallet.name} value={wallet.name}>
                      {wallet.name}
                    </option>
                  ))}
                </select>
                <button 
                  className={styles.connectButton} 
                  onClick={handleConnect}
                  disabled={isConnecting || !selectedWallet}
                >
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </button>
              </>
            ) : (
              <p className={styles.noWallets}>No compatible wallets found. Please install a Cardano wallet.</p>
            )}
            {error && <p className={styles.error}>{error}</p>}
          </>
        )}
      </div>
      {isConnecting && <Preloader message="Connecting to wallet..." />}
    </div>
  );
};

export default Home;