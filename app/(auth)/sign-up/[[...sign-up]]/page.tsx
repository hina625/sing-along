"use client";

import { SignUp } from "@clerk/nextjs";
import { useState, useEffect } from "react";

export default function SignUpPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <main className="flex h-screen w-full items-center justify-center">
      <SignUp />
    </main>
  );
}

