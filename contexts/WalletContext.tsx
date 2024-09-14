// contexts/WalletContext.tsx
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { BrowserWallet } from '@meshsdk/core';

interface WalletContextType {
  wallet: BrowserWallet | null;
  setWallet: React.Dispatch<React.SetStateAction<BrowserWallet | null>>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [wallet, setWallet] = useState<BrowserWallet | null>(null);

  return (
    <WalletContext.Provider value={{ wallet, setWallet }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};