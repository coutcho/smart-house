import React, { createContext, useState, useEffect, useContext } from 'react';
import { firebaseAuth } from '../services/firebase';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        const token = await currentUser.getIdToken();
        api.setAuthToken(token);
        setUser(currentUser);
      } else {
        api.setAuthToken(null);
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    const res = await firebaseAuth.signInWithEmailAndPassword(email, password);
    const token = await res.user.getIdToken();
    api.setAuthToken(token);
    setUser(res.user);
    return res.user;
  };

  const register = async (email, password, fullName) => {
    const res = await firebaseAuth.createUserWithEmailAndPassword(email, password, fullName);
    const token = await res.user.getIdToken();
    api.setAuthToken(token);
    setUser(res.user);
    return res.user;
  };

  const logout = async () => {
    await firebaseAuth.signOut();
    api.setAuthToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
