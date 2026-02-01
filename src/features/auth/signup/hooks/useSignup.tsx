"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { FormData, formSchema } from "../types/types";

export function useSignup() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      const res = await axios.post("/api/v1/auth/signup", data);
      
      toast.success(
        "Account created successfully! Let's login to get started."
      );
      
      form.reset();

      setTimeout(() => {
        router.push("/auth/login");
      }, 500);
    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error(
        error?.response?.data?.error ||
          "Failed to create account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return { form, onSubmit, loading, showPassword, setShowPassword };
}