"use client";

import { Eye, EyeOff } from "lucide-react";
import { authClient } from "@/lib/auth-client";

interface AuthLayoutProps {
  title: string;
  extraFields?: React.ReactNode;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  error: string;
  loading: boolean;
  onSubmit: (e: React.SubmitEvent<HTMLFormElement>) => void;
  footer: React.ReactNode;
}

export default function AuthLayout({
  title,
  extraFields,
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  error,
  loading,
  onSubmit,
  footer,
}: AuthLayoutProps) {
  return (
    <main className="min-h-screen bg-[#131314] flex items-center justify-center">
      <div className="w-full max-w-xs flex flex-col justify-center items-center gap-5">
        {/* Header */}
        <h1 className="text-3xl font-semibold text-[#e3e3e3]">{title}</h1>

        {/* Google */}
        <div className="w-full flex flex-col justify-center text-center gap-7">
          <Divider label="Connect to ShowMeTheMoney with" />
          <button
            onClick={() =>
              authClient.signIn.social({ provider: "google", callbackURL: "/" })
            }
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-1 text-[15px] font-medium text-[#e3e3e3] border border-gray-500 rounded-md hover:bg-neutral-800 transition-colors"
          >
            <GoogleIcon />
            Google
          </button>
        </div>

        {/* Form */}

        <div className="w-full flex flex-col gap-7">
          <Divider label="Or continue with Email" />
          <form onSubmit={onSubmit} className="w-full flex flex-col gap-3">
            {extraFields}
            <div className="flex flex-col gap-1.5">
              <label className="text-[15px] text-[#e3e3e3] font-medium">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-3 py-1 text-[15px] text-[#e3e3e3] bg-neutral-900 border border-gray-500 rounded-md placeholder-gray-500 focus:outline-none focus:border-[#e3e3e3] transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[15px] text-[#e3e3e3] font-medium">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  placeholder="Enter a unique password"
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-1 pr-10 text-[15px] text-[#e3e3e3] bg-neutral-900 border border-gray-500 rounded-md placeholder-gray-500 focus:outline-none focus:border-[#e3e3e3] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#e3e3e3] transition-colors"
                >
                  {showPassword ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
              </div>
            </div>
            {error && <p className="text-[15px] text-rose-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-1 text-[15px] font-medium text-[#e3e3e3] bg-transparent border border-gray-500 rounded-md hover:bg-neutral-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Please wait…" : "Continue"}
            </button>
            {footer}
          </form>
        </div>
      </div>
    </main>
  );
}

function Divider({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 text-gray-400 text-[15px] ${className ?? ""}`}
    >
      <div className="h-px w-full bg-gray-400" />
      <p className="text-nowrap">{label}</p>
      <div className="h-px w-full bg-gray-400" />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
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
