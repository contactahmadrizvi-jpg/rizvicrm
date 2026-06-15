"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { UserRole, AppUser } from "@/lib/types";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  userRole: UserRole;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  createMember: (email: string, password: string, role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Load role from Firestore
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setAppUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email ?? "",
            role: data.role ?? "admin",
            createdAt: data.createdAt?.toDate?.() ?? new Date(),
          });
        } else {
          // First-ever login — bootstrap as admin
          const newUser: Omit<AppUser, "uid"> = {
            email: firebaseUser.email ?? "",
            role: "admin",
            createdAt: new Date(),
          };
          await setDoc(doc(db, "users", firebaseUser.uid), {
            ...newUser,
            createdAt: serverTimestamp(),
          });
          setAppUser({ uid: firebaseUser.uid, ...newUser });
        }
      } else {
        setAppUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logOut = async () => {
    await signOut(auth);
  };

  /**
   * Creates a new Firebase Auth user without logging out the current admin.
   * Uses a temporary secondary app instance — standard Firebase pattern.
   */
  const createMember = async (email: string, password: string, role: UserRole) => {
    const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        password
      );
      // Store role in Firestore
      await setDoc(doc(db, "users", newUser.uid), {
        email,
        role,
        createdAt: serverTimestamp(),
      });
      await signOut(secondaryAuth);
    } finally {
      await deleteApp(secondaryApp);
    }
  };

  const userRole: UserRole = appUser?.role ?? "admin";
  const isAdmin = userRole === "admin";

  return (
    <AuthContext.Provider
      value={{ user, appUser, userRole, isAdmin, loading, signIn, logOut, createMember }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
