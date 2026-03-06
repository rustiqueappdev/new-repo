// Ported directly from mobile app's context/WishlistContext.tsx
// No React Native dependencies — pure Firebase + React
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from './AuthContext';

interface WishlistContextType {
  wishlist: string[];
  addToWishlist: (id: string) => Promise<void>;
  removeFromWishlist: (id: string) => Promise<void>;
  isInWishlist: (id: string) => boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState<string[]>([]);

  useEffect(() => {
    if (!user) { setWishlist([]); return; }
    (async () => {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) setWishlist(snap.data().wishlist || []);
      else { await setDoc(doc(db, 'users', user.uid), { wishlist: [] }); setWishlist([]); }
    })();
  }, [user]);

  const addToWishlist = async (id: string) => {
    if (!user) return;
    setWishlist(prev => [...prev, id]);
    try {
      await updateDoc(doc(db, 'users', user.uid), { wishlist: arrayUnion(id) });
    } catch {
      setWishlist(prev => prev.filter(i => i !== id));
    }
  };

  const removeFromWishlist = async (id: string) => {
    if (!user) return;
    const prev = [...wishlist];
    setWishlist(p => p.filter(i => i !== id));
    try {
      await updateDoc(doc(db, 'users', user.uid), { wishlist: arrayRemove(id) });
    } catch {
      setWishlist(prev);
    }
  };

  const isInWishlist = (id: string) => wishlist.includes(id);

  return (
    <WishlistContext.Provider value={{ wishlist, addToWishlist, removeFromWishlist, isInWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be inside WishlistProvider');
  return ctx;
}
