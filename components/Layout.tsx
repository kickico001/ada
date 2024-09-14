import React, { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../styles/Layout.module.css';
import { BrowserWallet } from '@meshsdk/core';

interface LayoutProps {
  children: ReactNode;
  wallet: BrowserWallet | null;
  setWallet: React.Dispatch<React.SetStateAction<BrowserWallet | null>>;
}

const Layout: React.FC<LayoutProps> = ({ children, wallet, setWallet }) => {
  const router = useRouter();

  const handleDisconnect = async () => {
    setWallet(null);
    router.push('/');
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>ADAVERSE</div>
        {wallet && (
          <nav className={styles.nav}>
            <Link href="/dash" legacyBehavior>
              <a className={`${styles.navButton} ${router.pathname === '/dash' ? styles.active : ''}`}>Stake</a>
            </Link>
            <Link href="/history" legacyBehavior>
              <a className={`${styles.navButton} ${router.pathname === '/history' ? styles.active : ''}`}>History</a>
            </Link>
          </nav>
        )}
        {wallet && (
          <button className={styles.disconnectButton} onClick={handleDisconnect}>
            Disconnect
          </button>
        )}
      </header>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        © 2024 adaversenet.com - All rights reserved.
      </footer>
    </div>
  );
};

export default Layout;