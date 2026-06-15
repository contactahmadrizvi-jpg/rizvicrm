"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Zap, Lock } from "lucide-react";

export default function LoginPage() {
  const { signIn, user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(isAdmin ? "/dashboard" : "/dashboard/projects");
    }
  }, [user, isAdmin, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await signIn(email, password);
      // Redirect is handled by the useEffect above once role loads
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setError(msg.replace("Firebase: ", "").replace(/\(auth.*\)\.?/, "").trim());
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-600/20">
            <Zap size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Rizvi CRM</h1>
          <p className="text-slate-500 text-sm mt-1">Sign in to your dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-xl shadow-slate-200/30">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <Button type="submit" loading={submitting} className="w-full mt-2" size="lg">
              Sign In
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Lock size={12} />
            <span>Access is invite-only. Contact your admin for an account.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
