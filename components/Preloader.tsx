import React from 'react';
import styles from '../styles/Preloader.module.css';

interface PreloaderProps {
  message?: string;
}

const Preloader: React.FC<PreloaderProps> = ({ message = 'Loading...' }) => (
  <div className={styles.preloader}>
    <div className={styles.spinner}></div>
    <p>{message}</p>
  </div>
);

export default Preloader;