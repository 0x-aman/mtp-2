"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

export type LoginState = {
  error?: string;
};

export async function loginAction(_previousState: LoginState, formData: FormData): Promise<LoginState> {
  const pin = String(formData.get("pin") ?? "").trim();
  const next = String(formData.get("next") ?? "/") || "/";
  const appPin = process.env.APP_PIN;

  if (!appPin || appPin.includes("replace")) {
    return {
      error: "APP_PIN is not configured. Set it in .env.local before signing in."
    };
  }

  if (pin !== appPin) {
    return {
      error: "Incorrect PIN."
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions());

  redirect(next.startsWith("/") ? next : "/");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/pin");
}
