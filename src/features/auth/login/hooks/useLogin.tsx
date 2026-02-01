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

    setLoading(false);

    if (res?.error) {
      toast.error("Invalid email or password");
      return;
    }

    toast.success("Login successful!");
    router.push("/admin");
  };

  return {form, onSubmit,loading, showPassword, setShowPassword};


}