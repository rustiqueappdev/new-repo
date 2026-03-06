import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, updateProfile, GoogleAuthProvider, signInWithPopup, User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import type { AppUser, UserRole } from '../types';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  loginEmail: (email: string, password: string) => Promise<void>;
  registerEmail: (email: string, password: string, name: string) => Promise<void>;
  loginGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchOrCreateProfile(firebaseUser: User): Promise<AppUser> {
  const ref = doc(db, 'users', firebaseUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const d = snap.data();
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName || d.displayName,
      photoURL: firebaseUser.photoURL || d.photoURL,
      role: d.role || 'customer',
      additionalRoles: d.additionalRoles || d.roles || [],
      wishlist: d.wishlist || [],
      createdAt: d.createdAt,
    };
  }
  const newUser: AppUser = {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    role: 'customer',
    additionalRoles: [],
    wishlist: [],
  };
  await setDoc(ref, { ...newUser, createdAt: serverTimestamp() });
  return newUser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fu) => {
      try {
        if (fu) setUser(await fetchOrCreateProfile(fu));
        else setUser(null);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  async function loginEmail(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    setUser(await fetchOrCreateProfile(cred.user));
  }

  async function registerEmail(email: string, password: string, name: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    setUser(await fetchOrCreateProfile(cred.user));
  }

  async function loginGoogle() {
    const cred = await signInWithPopup(auth, new GoogleAuthProvider());
    setUser(await fetchOrCreateProfile(cred.user));
  }

  async function logout() {
    await signOut(auth);
    setUser(null);
  }

  async function switchRole(role: UserRole) {
    if (!user) return;
    setUser({ ...user, role });
  }

  async function refreshProfile() {
    if (!auth.currentUser) return;
    setUser(await fetchOrCreateProfile(auth.currentUser));
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, loginEmail, registerEmail, loginGoogle, logout, switchRole, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
