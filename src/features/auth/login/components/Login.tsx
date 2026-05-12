"use client";

import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { signIn } from "next-auth/react";
import { Input } from "@/core/components/ui/input";
import { Button } from "@/core/components/ui/button";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/core/components/ui/card";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/core/components/ui/form";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import Link from "next/link";
import { useLogin } from "../hooks/useLogin";
import { ForgotPassword } from "./ForgotPassword";

export default function LoginPage() {
  const { form, onSubmit, loading, showPassword, setShowPassword } = useLogin();
  const [showForgot, setShowForgot] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f4f6fb]">
      <Card className="w-full max-w-md shadow-xl border-slate-100">
        <CardHeader className="space-y-1 pb-4">
          <div className="flex items-center justify-center mb-2">
            <div className="h-10 w-10 rounded-xl bg-violet-600 flex items-center justify-center">
              <Lock size={18} className="text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center text-slate-900">
            {showForgot ? "Reset Password" : "Welcome back"}
          </CardTitle>
        </CardHeader>

        <CardContent>
          {showForgot ? (
            <ForgotPassword onBack={() => setShowForgot(false)} />
          ) : (
            <>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                              {...field}
                              type="email"
                              placeholder="Enter your email"
                              className="pl-10 h-11"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Password</FormLabel>
                          <button
                            type="button"
                            onClick={() => setShowForgot(true)}
                            className="text-xs text-violet-600 hover:text-violet-700 hover:underline transition-colors"
                          >
                            Forgot password?
                          </button>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter your password"
                              className="pl-10 pr-10 h-11"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full h-11 bg-violet-600 hover:bg-violet-700"
                    disabled={!form.formState.isValid || loading}
                  >
                    {loading ? "Signing in…" : "Login"}
                  </Button>
                </form>
              </Form>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs text-slate-400 bg-white px-2 w-fit mx-auto">
                  or continue with
                </div>
              </div>

              <button
                type="button"
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                className="w-full h-11 rounded-lg border border-slate-200 flex items-center justify-center gap-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <FcGoogle className="h-5 w-5" />
                Continue with Google
              </button>

              <p className="text-center text-sm mt-4 text-slate-500">
                Don't have an account?{" "}
                <Link href="/auth/signup" className="text-violet-600 font-medium hover:underline">
                  Sign up
                </Link>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
