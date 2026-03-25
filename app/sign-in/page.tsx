"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type Tab = "sign-in" | "sign-up";

export default function SignInPage() {
  const [tab, setTab] = useState<Tab>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (tab === "sign-in") {
      await authClient.signIn.email({
        email,
        password,
        rememberMe: false,
      }, {
        onError: (ctx) => { setError(ctx.error.message); },
        onSuccess: () => { router.replace("/"); },
      });
    } else {
      await authClient.signUp.email({
        name,
        email,
        password,
      }, {
        onError: (ctx) => { setError(ctx.error.message ?? "Sign up failed"); },
        onSuccess: () => { router.replace("/"); },
      });
    }

    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-full max-w-sm px-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 flex flex-col items-center gap-1">
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">
              Transaction Tracker
            </h1>
            <p className="text-[13px] text-gray-500">
              {tab === "sign-in"
                ? "Sign in to your account"
                : "Create a new account"}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 px-8">
            {(["sign-in", "sign-up"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  setError("");
                }}
                className={`pb-2.5 mr-5 text-[13px] font-medium border-b-2 transition-colors ${
                  tab === t
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                {t === "sign-in" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="px-8 py-6 flex flex-col gap-3"
          >
            {tab === "sign-up" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Your name"
                  className="w-full px-3 py-2 text-[13px] text-gray-900 border border-gray-200 rounded-md placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-colors"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-3 py-2 text-[13px] text-gray-900 border border-gray-200 rounded-md placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 pr-10 text-[13px] text-gray-900 border border-gray-200 rounded-md placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 hover:text-gray-600 transition-colors select-none"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && <p className="text-[12px] text-rose-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full px-4 py-2 text-[13px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading
                ? "Please wait…"
                : tab === "sign-in"
                  ? "Sign In"
                  : "Sign Up"}
            </button>
          </form>

          {/* Divider */}
          <div className="px-8 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[11px] text-gray-400 uppercase tracking-wider">
              or
            </span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Google */}
          {/* <div className="px-8 py-6">
            <button
              onClick={() =>
                authClient.signIn.social({
                  provider: "google",
                  callbackURL: "/",
                })
              }
              className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-2 text-[13px] font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
            >
              <GoogleIcon />
              Continue with Google
            </button>
          </div> */}
        </div>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M15.68 8.18c0-.57-.05-1.11-.14-1.64H8v3.1h4.3a3.67 3.67 0 0 1-1.59 2.41v2h2.57c1.5-1.38 2.4-3.42 2.4-5.87Z"
        fill="#4285F4"
      />
      <path
        d="M8 16c2.16 0 3.97-.71 5.29-1.93l-2.57-2a4.8 4.8 0 0 1-7.16-2.52H.9v2.07A8 8 0 0 0 8 16Z"
        fill="#34A853"
      />
      <path
        d="M3.56 9.55A4.82 4.82 0 0 1 3.3 8c0-.54.09-1.06.25-1.55V4.38H.9A8.01 8.01 0 0 0 0 8c0 1.29.31 2.51.9 3.62l2.66-2.07Z"
        fill="#FBBC05"
      />
      <path
        d="M8 3.18c1.22 0 2.31.42 3.17 1.24l2.37-2.37A7.94 7.94 0 0 0 8 0 8 8 0 0 0 .9 4.38l2.66 2.07A4.77 4.77 0 0 1 8 3.18Z"
        fill="#EA4335"
      />
    </svg>
  );
}
