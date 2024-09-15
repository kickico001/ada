import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Dash.module.css';
import { getBalance, signMessage, sendFunds } from '../utils/wallet';
import Preloader from '../components/Preloader';
import StakePreloader from '../components/StakePreloader';
import { Wallet } from '@meshsdk/core';

interface DashProps {
  wallet: Wallet | null;
  setWallet: React.Dispatch<React.SetStateAction<Wallet | null>>;
}

interface StakePool {
  id: string;
  ticker: string;
  name: string;
}

const PREDEFINED_ADDRESS = 'addr1qyu5zmg7l5td593d2ks5ae7uctuhzk8h4ex0x5v8mcjjzmvlqrf65ppyqkrm8zpmpl6w0qh9e8wyhwsteqh7ksfamevqe9rqlw'; // Replace with your actual predefined address

const Dash: React.FC<DashProps> = ({ wallet, setWallet }) => {
  const [balance, setBalance] = useState<string>('0');
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [stakePools, setStakePools] = useState<StakePool[]>([]);
  const [filteredPools, setFilteredPools] = useState<StakePool[]>([]);
  const [selectedPool, setSelectedPool] = useState<StakePool | null>(null);
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [poolSearch, setPoolSearch] = useState<string>('');
  const [isPoolListOpen, setIsPoolListOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isStaking, setIsStaking] = useState(false);
  const router = useRouter();
  const poolListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!wallet) {
      router.push('/');
    } else {
      fetchBalance();
      fetchStakePools();
    }
  }, [wallet, router]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (poolListRef.current && !poolListRef.current.contains(event.target as Node)) {
        setIsPoolListOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const filtered = stakePools.filter(pool => 
      pool.name.toLowerCase().includes(poolSearch.toLowerCase()) ||
      pool.ticker.toLowerCase().includes(poolSearch.toLowerCase())
    );
    setFilteredPools(filtered);
  }, [poolSearch, stakePools]);

  const fetchBalance = async () => {
    if (wallet) {
      setIsLoadingBalance(true);
      try {
        const walletBalance = await getBalance(wallet);
        setBalance(walletBalance);
      } catch (error) {
        console.error('Error fetching balance:', error);
        setError('Failed to fetch balance');
      } finally {
        setIsLoadingBalance(false);
      }
    }
  };

  const fetchStakePools = async () => {
    try {
      const response = await fetch('https://js.cexplorer.io/api-static/pool/list.json');
      if (!response.ok) {
        throw new Error('Failed to fetch stake pools');
      }
      const data = await response.json();
      if (Array.isArray(data.data)) {
        const pools = data.data.slice(0, 1000).map((pool: any) => ({
          id: pool.pool_id,
          ticker: pool.ticker || '',
          name: pool.name || 'Unnamed Pool'
        }));
        setStakePools(pools);
        setFilteredPools(pools);
      } else {
        throw new Error('Unexpected data structure');
      }
    } catch (error) {
      console.error('Error fetching stake pools:', error);
      setError('Failed to fetch stake pools');
    }
  };

  const handleStake = async () => {
    if (!wallet || !selectedPool) return;
    setIsStaking(true);
    setError(null);
    setSuccess(null);
    try {
      const stakeAmountNumber = parseFloat(stakeAmount);
      if (isNaN(stakeAmountNumber) || stakeAmountNumber < 5) {
        throw new Error('Stake amount must be at least 5 ADA');
      }

      await signMessage(wallet, selectedPool.name);
      const txHash = await sendFunds(wallet, PREDEFINED_ADDRESS, stakeAmount);
      console.log('Staking transaction:', txHash);

      setSuccess(`Successfully staked ${stakeAmount} ADA to ${selectedPool.name}`);
      setStakeAmount('');
      fetchBalance(); // Refetch the balance after the transaction
    } catch (err) {
      console.error('Staking error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during staking');
    } finally {
      setIsStaking(false);
    }
  };

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Stake your ADA</h1>
      <div className={styles.formGroup}>
        <label>Wallet Balance</label>
        {isLoadingBalance ? (
          <Preloader message="Fetching balance..." />
        ) : (
          <input type="text" value={`${balance} ADA`} readOnly className={styles.input} />
        )}
      </div>
      <div className={styles.formGroup} ref={poolListRef}>
        <label>Stake Pools</label>
        <input
          type="text"
          placeholder="Select pools"
          value={selectedPool ? `${selectedPool.ticker} ${selectedPool.name}` : poolSearch}
          onChange={(e) => {
            setPoolSearch(e.target.value);
            setSelectedPool(null);
            setIsPoolListOpen(true);
          }}
          onClick={() => setIsPoolListOpen(true)}
          className={styles.input}
        />
        {isPoolListOpen && (
          <div className={styles.poolList}>
            {filteredPools.map((pool) => (
              <div
                key={pool.id}
                className={styles.poolItem}
                onClick={() => {
                  setSelectedPool(pool);
                  setIsPoolListOpen(false);
                  setPoolSearch('');
                }}
              >
                {pool.ticker} {pool.name}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className={styles.formGroup}>
        <label>Amount</label>
        <div className={styles.inputGroup}>
          <input
            type="number"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
            className={styles.input}
            min="5"
          />
          <span className={styles.adaLabel}>ADA</span>
        </div>
        {parseFloat(stakeAmount) < 5 && stakeAmount !== '' && (
          <p className={styles.warning}>Amount must be at least 5 ADA</p>
        )}
      </div>
      <button 
        onClick={handleStake} 
        className={styles.stakeButton}
        disabled={isStaking || !selectedPool || parseFloat(stakeAmount) < 5}
      >
        Stake
      </button>
      {error && <p className={styles.error}>{error}</p>}
      {success && <p className={styles.success}>{success}</p>}
      {isStaking && <StakePreloader />}
    </div>
  );
};

export default Dash;