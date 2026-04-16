"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import AuthLayout from "@/components/AuthLayout";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authClient.signUp.email(
        { name, email, password },
        {
          onError: (ctx) => setError(ctx.error.message ?? "Sign up failed"),
          onSuccess: () => router.replace("/"),
        },
      );
    } catch {
      setError("Something went wrong. Please try again.");
    }

    setLoading(false);
  };

  return (
    <AuthLayout
      title="Create your account"
      extraFields={
        <div className="flex flex-col gap-1.5">
          <label className="text-[15px] text-[#e3e3e3] font-medium">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="John Doe"
            className="w-full px-3 py-1 text-[15px] text-[#e3e3e3] bg-neutral-900 border border-gray-500 rounded-md placeholder-gray-500 focus:outline-none focus:border-[#e3e3e3] transition-colors"
          />
        </div>
      }
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      showPassword={showPassword}
      setShowPassword={setShowPassword}
      error={error}
      loading={loading}
      onSubmit={handleSubmit}
      footer={
        <>
          <p className="text-[15px] text-[#e3e3e3]">
            By creating an account you agree to the{" "}
            <a href="" className="underline">
              Terms of Service
            </a>{" "}
            and our{" "}
            <a href="" className="underline">
              Privacy Policy
            </a>
            .
          </p>
          <p className="text-[18px] text-[#e3e3e3]">
            Already have an account?{" "}
            <a href="/sign-in" className="text-blue-400">
              Login
            </a>
          </p>
        </>
      }
    />
  );
}
