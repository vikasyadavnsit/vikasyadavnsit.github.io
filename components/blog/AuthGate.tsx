"use client";
import React, { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { LogOut, Lock } from "lucide-react";
import { auth } from "@/lib/firebase";

const ERROR_MESSAGES: Record<string, string> = {
  "auth/operation-not-allowed": "Email/Password sign-in isn't enabled for this Firebase project yet (Authentication → Sign-in method → enable Email/Password).",
  "auth/user-not-found": "No account exists for this email. Create it in Firebase console → Authentication → Users.",
  "auth/invalid-credential": "Wrong email or password.",
  "auth/wrong-password": "Wrong password.",
  "auth/invalid-email": "That's not a valid email address.",
  "auth/network-request-failed": "Network error reaching Firebase Auth — check your connection.",
  "auth/too-many-requests": "Too many failed attempts — try again later.",
};

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      if (err instanceof FirebaseError) {
        setError(ERROR_MESSAGES[err.code] ?? `${err.code}: ${err.message}`);
      } else {
        setError("Sign-in failed.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center py-32 text-[hsl(var(--blog-muted))]">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-sm mx-auto py-24 px-6">
        <div className="flex flex-col items-center gap-3 mb-8">
          <Lock className="w-8 h-8 text-[hsl(var(--blog-accent))]" />
          <h1 className="text-xl font-bold text-[hsl(var(--blog-fg))]">Admin Login</h1>
        </div>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-[hsl(var(--blog-border))] bg-[hsl(var(--blog-card))] text-[hsl(var(--blog-fg))] outline-none focus:border-[hsl(var(--blog-accent))] focus:ring-2 focus:ring-[hsl(var(--blog-accent)/0.15)] transition-colors"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-[hsl(var(--blog-border))] bg-[hsl(var(--blog-card))] text-[hsl(var(--blog-fg))] outline-none focus:border-[hsl(var(--blog-accent))] focus:ring-2 focus:ring-[hsl(var(--blog-accent)/0.15)] transition-colors"
          />
          {error && <p className="text-sm text-[hsl(var(--blog-danger))]">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl bg-[hsl(var(--blog-accent))] text-white font-medium disabled:opacity-50"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end px-6 pt-4">
        <button
          onClick={() => signOut(auth)}
          className="inline-flex items-center gap-2 text-sm text-[hsl(var(--blog-muted))] hover:text-[hsl(var(--blog-fg))]"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
      {children}
    </div>
  );
}
