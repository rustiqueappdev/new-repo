import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

interface PendingCountContextType {
  pendingFarmhouses: number;
  pendingKYC: number;
  refreshCounts: () => void;
}

const PendingCountContext = createContext<PendingCountContextType>({
  pendingFarmhouses: 0,
  pendingKYC: 0,
  refreshCounts: () => {}
});

export const usePendingCount = () => useContext(PendingCountContext);

export const PendingCountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pendingFarmhouses, setPendingFarmhouses] = useState(0);
  const [pendingKYC, setPendingKYC] = useState(0);

  const fetchCounts = useCallback(() => {
    // Real-time listener for pending farmhouses
    const farmhouseQuery = query(
      collection(db, 'farmhouses'),
      where('status', '==', 'pending')
    );

    const unsubscribeFarmhouses = onSnapshot(farmhouseQuery, (snapshot) => {
      setPendingFarmhouses(snapshot.size);
    }, (error) => {
      console.error('Error listening to pending farmhouses:', error);
    });

    // Real-time listener for pending KYC
    const kycQuery = query(
      collection(db, 'users'),
      where('role', '==', 'owner'),
      where('kyc_status', '==', 'pending')
    );

    const unsubscribeKYC = onSnapshot(kycQuery, (snapshot) => {
      setPendingKYC(snapshot.size);
    }, (error) => {
      console.error('Error listening to pending KYC:', error);
    });

    return () => {
      unsubscribeFarmhouses();
      unsubscribeKYC();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = fetchCounts();
    return unsubscribe;
  }, [fetchCounts]);

  const refreshCounts = () => {
    // The onSnapshot listeners auto-refresh, but this can be called manually if needed
  };

  return (
    <PendingCountContext.Provider value={{ pendingFarmhouses, pendingKYC, refreshCounts }}>
      {children}
    </PendingCountContext.Provider>
  );
};
