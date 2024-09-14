import React from 'react';
import styles from '../styles/StakePreloader.module.css';

const StakePreloader: React.FC = () => (
  <div className={styles.overlay}>
    <div className={styles.preloader}>
      <div className={styles.spinner}></div>
      <p>Staking in progress...</p>
    </div>
  </div>
);

export default StakePreloader;