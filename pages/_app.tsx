// pages/_app.tsx
import type { AppProps } from 'next/app';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { BrowserWallet } from '@meshsdk/core';
import Layout from '../components/Layout';
import ErrorBoundary from '../components/ErrorBoundary';
import '../styles/globals.css';

const DynamicDash = dynamic(() => import('./dash'), { loading: () => <p>Loading...</p> });
const DynamicHistory = dynamic(() => import('./history'), { loading: () => <p>Loading...</p> });

function MyApp({ Component, pageProps }: AppProps) {
  const [wallet, setWallet] = useState<BrowserWallet | null>(null);

  let ComponentToRender = Component;

  if (pageProps.pathname === '/dash') {
    ComponentToRender = DynamicDash;
  } else if (pageProps.pathname === '/history') {
    ComponentToRender = DynamicHistory;
  }

  return (
    <ErrorBoundary>
      <Layout wallet={wallet} setWallet={setWallet}>
        <ComponentToRender {...pageProps} wallet={wallet} setWallet={setWallet} />
      </Layout>
    </ErrorBoundary>
  );
}

export default MyApp;