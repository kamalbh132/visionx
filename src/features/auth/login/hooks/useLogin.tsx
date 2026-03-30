"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import * as z from "zod";

import { toast } from "sonner";
import { LoginForm } from "../types/types";
import { loginSchema } from "../types/types";




export function useLogin(){
const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);

    const res = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (res?.error) {
      toast.error("Invalid email or password");
      setLoading(false);
      return;
    }

    // ✅ Get the session we just created to check verification status
    const currentSession = await fetch("/api/auth/session").then(r => r.json());

    setLoading(false);
    toast.success("Login successful!");

    if (currentSession?.user?.isVerified) {
      const role = currentSession?.user?.role;

if (role === "SUPERADMIN") {
  router.push("/superadmin/dashboard");
} else if (role === "ADMIN") {
  router.push("/admin/dashboard");
} else {
  router.push("/user/dashboard");
}
    } else {
      router.push("/verification");
    }
  };

  return {form, onSubmit,loading, showPassword, setShowPassword};


}