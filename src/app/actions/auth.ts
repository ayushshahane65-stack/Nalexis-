"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  createLocalAdminSession,
  LOCAL_ADMIN_COOKIE,
  LOCAL_ADMIN_SESSION_SECONDS,
} from "@/lib/local-admin-session";

export async function signUp(formData: FormData) {
  const email = (formData.get("email") as string) || "";
  const password = (formData.get("password") as string) || "";
  const displayName = (formData.get("display_name") as string) || "";

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    });

    if (error) {
      redirect(`/signup?error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/", "layout");
    redirect("/home");
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof err.digest === "string" &&
      err.digest.startsWith("NEXT_REDIRECT")
    ) {
      throw err;
    }

    const message = err instanceof Error ? err.message : "Could not create your account.";
    redirect(`/signup?error=${encodeURIComponent(message)}`);
  }
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (process.env.NODE_ENV !== "production") {
    const adminEmail = process.env.LOCAL_ADMIN_EMAIL;
    const adminPassword = process.env.LOCAL_ADMIN_PASSWORD;
    const sessionSecret = process.env.LOCAL_ADMIN_SESSION_SECRET;
    const localAdminConfigured = [adminEmail, adminPassword, sessionSecret].some(Boolean);
    if (localAdminConfigured && (!adminEmail || !adminPassword || !sessionSecret)) {
      redirect(`/login?error=${encodeURIComponent("The temporary local admin account is not fully configured.")}`);
    }
    if (adminEmail && adminPassword && sessionSecret && email.toLowerCase() === adminEmail.toLowerCase()) {
      if (password !== adminPassword) {
        redirect(`/login?error=${encodeURIComponent("Invalid email or password.")}`);
      }

      const cookieStore = await cookies();
      cookieStore.set(LOCAL_ADMIN_COOKIE, await createLocalAdminSession(), {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: LOCAL_ADMIN_SESSION_SECONDS,
      });
      revalidatePath("/", "layout");
      redirect("/home");
    }
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      redirect(`/login?error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/", "layout");
    redirect("/home");
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof err.digest === "string" &&
      err.digest.startsWith("NEXT_REDIRECT")
    ) {
      throw err;
    }

    const message = err instanceof Error ? err.message : "Could not sign in.";
    redirect(`/login?error=${encodeURIComponent(message)}`);
  }
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete(LOCAL_ADMIN_COOKIE);
  cookieStore.delete("nalexis_session");

  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Ignore network error on sign out
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function getUser() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error("Could not get authenticated user:", error);
    return null;
  }
}

export async function getProfile() {
  const user = await getUser();
  if (!user) return null;

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) return data;
  } catch (error) {
    console.error("Could not load user profile:", error);
    return null;
  }
  return null;
}
