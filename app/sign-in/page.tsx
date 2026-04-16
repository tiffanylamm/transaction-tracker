"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import AuthLayout from "@/components/AuthLayout";

export default function SignInPage() {
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
      await authClient.signIn.email(
        { email, password, rememberMe: false },
        {
          onError: (ctx) => setError(ctx.error.message),
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
      title="Login to your account"
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
        <p className="text-[18px] text-[#e3e3e3]">
          New to ShowMeTheMoney?{" "}
          <a href="/sign-up" className="text-blue-400">
            Sign up
          </a>
        </p>
      }
    />
  );
}
