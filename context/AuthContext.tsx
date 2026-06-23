"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
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
import { UserRole, SalaryType, AppUser } from "@/lib/types";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "dummy-key-for-build",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "dummy-domain-for-build",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "dummy-project-id",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "dummy-bucket",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "dummy-sender",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "dummy-app-id",
};

interface MemberPayload {
  role: UserRole;
  displayName?: string;
  salaryType?: SalaryType;
  baseSalary?: number;
  commissionPercentage?: number;
}

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  userRole: UserRole;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  createMember: (email: string, password: string, payload: MemberPayload) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  // Ref to hold the interval so we can clear it across renders
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const authUnsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      // Clear any existing refresh interval when auth state changes
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }

      if (!firebaseUser) {
        setAppUser(null);
        setLoading(false);
        return;
      }

      const userDocRef = doc(db, "users", firebaseUser.uid);

      const loadUser = async () => {
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            setAppUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email ?? "",
              role: data.role ?? "member",
              displayName: data.displayName ?? undefined,
              allowedPages: data.allowedPages ?? [],
              salaryType: data.salaryType ?? undefined,
              baseSalary: data.baseSalary ?? undefined,
              commissionPercentage: data.commissionPercentage ?? undefined,
              createdAt: data.createdAt?.toDate?.() ?? new Date(),
            });
          } else {
            // Only bootstrap as admin on a genuine first-ever login.
            // If a session already exists, preserve it — never escalate
            // privileges because a doc is temporarily missing.
            setAppUser((current) => {
              if (current !== null) return current;
              // True first login — write the admin doc
              const newUser: Omit<AppUser, "uid"> = {
                email: firebaseUser.email ?? "",
                role: "admin",
                createdAt: new Date(),
              };
              setDoc(userDocRef, { ...newUser, createdAt: serverTimestamp() });
              return { uid: firebaseUser.uid, ...newUser };
            });
          }
        } catch (err) {
          console.error("Failed to load user doc:", err);
          // Preserve an existing session on error — never flip roles silently
          setAppUser((current) => {
            if (current !== null) return current;
            return {
              uid: firebaseUser.uid,
              email: firebaseUser.email ?? "",
              role: "member",
              allowedPages: [],
              createdAt: new Date(),
            };
          });
        }
        setLoading(false);
      };

      // Initial load
      loadUser();

      // Periodic refresh every 30s to pick up allowedPages / role changes
      // made by an admin without requiring a full re-login.
      refreshIntervalRef.current = setInterval(loadUser, 30000);
    });

    return () => {
      authUnsub();
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
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
  const createMember = async (email: string, password: string, payload: MemberPayload) => {
    const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        password
      );
      const userData: Record<string, unknown> = {
        email,
        role: payload.role,
        createdAt: serverTimestamp(),
      };
      if (payload.displayName) userData.displayName = payload.displayName;
      if (payload.salaryType) userData.salaryType = payload.salaryType;
      if (payload.baseSalary !== undefined) userData.baseSalary = payload.baseSalary;
      if (payload.commissionPercentage !== undefined)
        userData.commissionPercentage = payload.commissionPercentage;

      await setDoc(doc(db, "users", newUser.uid), userData);
      await signOut(secondaryAuth);
    } finally {
      await deleteApp(secondaryApp);
    }
  };

  const userRole: UserRole = appUser?.role ?? "member";
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
