import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import SplashScreen from '../components/common/SplashScreen';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userRole: string | null;
  login: (email: string, password: string) => Promise<FirebaseUser>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const showSplash = !authReady || !splashDone;

  // Minimum splash screen display time (2 seconds)
  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const login = async (email: string, password: string): Promise<FirebaseUser> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      const userData = userDoc.data();
      
      if (userData?.role !== 'admin') {
        await signOut(auth);
        throw new Error('Access denied. Admin privileges required.');
      }
      
      setUserRole(userData.role);
      return userCredential.user;
    } catch (error) {
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
      setUserRole(null);
    } catch (error) {
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        
        if (userData?.role === 'admin') {
          setCurrentUser(user);
          setUserRole(userData.role);
        } else {
          await signOut(auth);
          setCurrentUser(null);
          setUserRole(null);
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
      setLoading(false);
      setAuthReady(true);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {showSplash ? <SplashScreen /> : children}
    </AuthContext.Provider>
  );
};