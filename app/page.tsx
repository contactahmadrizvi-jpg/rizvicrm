"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

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
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setError(""); setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setError(msg.replace("Firebase: ", "").replace(/\(auth.*\)\.?/, "").trim());
    } finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f7f5] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#1a1a2e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111110] flex">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 p-14 bg-[#111110] border-r border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-[#c9a84c] flex items-center justify-center">
            <span className="text-[#111110] font-bold text-xs">R</span>
          </div>
          <span className="text-white font-semibold text-sm tracking-tight">Rizvi CRM</span>
        </div>
        <div>
          <p className="font-serif italic text-4xl text-white/90 leading-snug mb-6">
            "Clarity is the<br />foundation of<br />every closed deal."
          </p>
          <p className="text-[#525250] text-sm">Built for high-performance sales teams.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#1a7f5a]" />
          <span className="text-[#525250] text-xs">All systems operational</span>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#f7f7f5]">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-[#111110] tracking-tight mb-1">Sign in</h1>
            <p className="text-sm text-[#858580]">Access your operations dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Email" type="email" placeholder="you@company.com"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="Password" type="password" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)} required />

            {error && (
              <div className="bg-[#fdf1f0] border border-[#fecaca] rounded-lg px-4 py-3">
                <p className="text-[#c0392b] text-sm">{error}</p>
              </div>
            )}

            <Button type="submit" loading={submitting} className="w-full" size="lg">
              Continue
            </Button>
          </form>

          <p className="mt-8 text-xs text-[#b0b0aa] text-center">
            Invite-only access. Contact your admin for an account.
          </p>
        </div>
      </div>
    </div>
  );
}
