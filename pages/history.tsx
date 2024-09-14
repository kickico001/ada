import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/History.module.css';
import { BrowserWallet } from '@meshsdk/core';
import Preloader from '../components/Preloader';

interface HistoryProps {
  wallet: BrowserWallet | null;
  setWallet: React.Dispatch<React.SetStateAction<BrowserWallet | null>>;
}

interface TransactionItem {
  txHash: string;
  block: string;
  time: string;
  amount: string;
  status: 'Outgoing' | 'Incoming';
}

interface DelegateHistory {
  transaction: string;
  epoch: string;
  block: string;
  poolId: string;
}

const BLOCKFROST_API_KEY = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY || 'mainnetuE7K083WTQTQXf6N8OdK9cJmWkxCY2jH';
const BLOCKFROST_API_URL = 'https://cardano-mainnet.blockfrost.io/api/v0';
const ITEMS_PER_PAGE = 10;

const History: React.FC<HistoryProps> = ({ wallet, setWallet }) => {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [paymentAddress, setPaymentAddress] = useState<string | null>(null);
  const [stakeAddress, setStakeAddress] = useState<string | null>(null);
  const [delegateHistory, setDelegateHistory] = useState<DelegateHistory[]>([]);
  const [isDelegateHistoryLoading, setIsDelegateHistoryLoading] = useState(true);
  const [currentEpoch, setCurrentEpoch] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!wallet) {
      router.push('/');
    } else {
      fetchAddresses();
      fetchCurrentEpoch();
    }
  }, [wallet, router]);

  useEffect(() => {
    if (paymentAddress) {
      fetchTransactions();
    }
  }, [paymentAddress, currentPage]);

  useEffect(() => {
    if (stakeAddress) {
      fetchDelegateHistory();
    }
  }, [stakeAddress]);

  const fetchCurrentEpoch = async () => {
    try {
      const response = await fetch(`${BLOCKFROST_API_URL}/epochs/latest`, {
        headers: {
          'project_id': BLOCKFROST_API_KEY
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch current epoch');
      }
      const data = await response.json();
      setCurrentEpoch(data.epoch);
    } catch (error) {
      console.error('Error fetching current epoch:', error);
    }
  };

  const fetchAddresses = async () => {
    try {
      const usedAddresses = await wallet!.getUsedAddresses();
      if (usedAddresses.length === 0) {
        throw new Error('No used addresses found');
      }
      setPaymentAddress(usedAddresses[0]);

      const stakeAddresses = await wallet!.getRewardAddresses();
      if (stakeAddresses.length === 0) {
        throw new Error('No stake addresses found');
      }
      setStakeAddress(stakeAddresses[0]);
    } catch (err) {
      handleError('Failed to retrieve wallet addresses', err);
    }
  };

  const fetchTransactions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!paymentAddress) throw new Error('No payment address found');

      const response = await fetch(`${BLOCKFROST_API_URL}/addresses/${paymentAddress}/transactions?page=${currentPage}&order=desc&count=${ITEMS_PER_PAGE}`, {
        headers: {
          'project_id': BLOCKFROST_API_KEY
        }
      });

      if (response.status === 404) {
        setTransactions([]);
        setTotalTransactions(0);
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Blockfrost API error:', errorData);
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        console.error('Unexpected API response:', data);
        throw new Error('Unexpected API response format');
      }

      const formattedTransactions: TransactionItem[] = await Promise.all(data.map(async (tx: any) => {
        const txDetails = await fetch(`${BLOCKFROST_API_URL}/txs/${tx.tx_hash}`, {
          headers: {
            'project_id': BLOCKFROST_API_KEY
          }
        }).then(res => res.json());

        return {
          txHash: tx.tx_hash,
          block: tx.block_height.toString(),
          time: new Date(txDetails.block_time * 1000).toLocaleString(),
          amount: (txDetails.output_amount[0].quantity / 1000000).toFixed(6),
          status: tx.tx_index === 0 ? 'Outgoing' : 'Incoming'
        };
      }));

      setTransactions(formattedTransactions);
      setTotalTransactions(parseInt(response.headers.get('X-Pagination-Total-Count') || '0', 10));
    } catch (error) {
      handleError('Error fetching transactions', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDelegateHistory = async () => {
    setIsDelegateHistoryLoading(true);
    setError(null);
    try {
      if (!stakeAddress) throw new Error('No stake address found');

      const response = await fetch(`${BLOCKFROST_API_URL}/accounts/${stakeAddress}/delegations`, {
        headers: {
          'project_id': BLOCKFROST_API_KEY
        }
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Blockfrost API error:', response.status, errorBody);
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        console.error('Unexpected API response:', data);
        throw new Error('Unexpected API response format');
      }

      const formattedDelegateHistory: DelegateHistory[] = data.map((item: any) => ({
        transaction: item.tx_hash,
        epoch: `Epoch ${item.active_epoch}${currentEpoch ? ` (Current: ${currentEpoch})` : ''}`,
        block: item.block_height ? item.block_height.toString() : 'N/A',
        poolId: item.pool_id,
      }));

      setDelegateHistory(formattedDelegateHistory);
    } catch (error) {
      handleError('Error fetching delegate history', error);
      setDelegateHistory([]);
    } finally {
      setIsDelegateHistoryLoading(false);
    }
  };

  const handleError = (message: string, error: any) => {
    console.error(message, error);
    setError(error instanceof Error ? error.message : 'An unknown error occurred');
  };

  const totalPages = Math.max(1, Math.ceil(totalTransactions / ITEMS_PER_PAGE));

  const renderPagination = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          className={`${styles.pageButton} ${currentPage === i ? styles.active : ''}`}
          onClick={() => setCurrentPage(i)}
        >
          {i}
        </button>
      );
    }
    return pages;
  };

  if (isLoading || isDelegateHistoryLoading) return <Preloader />;

  if (error) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Error</h1>
        <p className={styles.error}>{error}</p>
        <button onClick={fetchTransactions} className={styles.retryButton}>Retry</button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Recent Transactions</h1>
      {paymentAddress && (
        <p className={styles.addressInfo}>Payment Address: {paymentAddress}</p>
      )}
      {transactions.length > 0 ? (
        <>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Transaction</th>
                <th>Time</th>
                <th>Block</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, index) => (
                <tr key={index}>
                  <td>{tx.txHash.substring(0, 20)}...</td>
                  <td>{tx.time}</td>
                  <td>{tx.block}</td>
                  <td>{tx.amount} ADA</td>
                  <td className={tx.status === 'Outgoing' ? styles.outgoing : styles.incoming}>{tx.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={styles.pagination}>
            <span>Showing {totalTransactions === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalTransactions)} of {totalTransactions} entries</span>
            <div className={styles.pageButtons}>
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>&lt;</button>
              {renderPagination()}
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>&gt;</button>
            </div>
          </div>
        </>
      ) : (
        <p className={styles.noTransactions}>No transactions found for this address.</p>
      )}

      <h2 className={styles.subtitle}>Delegate History</h2>
      {stakeAddress && (
        <p className={styles.addressInfo}>Stake Address: {stakeAddress}</p>
      )}
      {delegateHistory.length > 0 ? (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Transaction</th>
              <th>Epoch</th>
              <th>Block</th>
              <th>Pool ID</th>
            </tr>
          </thead>
          <tbody>
            {delegateHistory.map((item, index) => (
              <tr key={index}>
                <td>{item.transaction.substring(0, 20)}...</td>
                <td>{item.epoch}</td>
                <td>{item.block}</td>
                <td>{item.poolId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className={styles.noTransactions}>No delegation history found for this address.</p>
      )}
    </div>
  );
};

export default History;