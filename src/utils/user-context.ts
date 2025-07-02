import { headers } from "next/headers";

export async function getCurrentUserId(): Promise<string> {
  const headersList = await headers();
  const userId = headersList.get("x-user-id");

  if (!userId) {
    throw new Error("User not authenticated");
  }

  return userId;
}

export async function getCurrentUserEmail(): Promise<string> {
  const headersList = await headers();
  const email = headersList.get("x-user-email");

  if (!email) {
    throw new Error("User email not found");
  }

  return email;
}

export async function getCurrentUserName(): Promise<string | null> {
  const headersList = await headers();
  const name = headersList.get("x-user-name");
  return name;
}

export async function getCurrentUser(): Promise<{
  id: string;
  email: string;
  name: string | null;
}> {
  const headersList = await headers();
  const id = headersList.get("x-user-id");
  const email = headersList.get("x-user-email");
  const name = headersList.get("x-user-name");

  if (!id || !email) {
    throw new Error("User not authenticated");
  }

  return {
    id,
    email,
    name,
  };
}

// Optional user functions that return null instead of throwing errors
export async function getCurrentUserIdOptional(): Promise<string | null> {
  const headersList = await headers();
  return headersList.get("x-user-id");
}

export async function getCurrentUserOptional(): Promise<{
  id: string;
  email: string;
  name: string | null;
} | null> {
  const headersList = await headers();
  const id = headersList.get("x-user-id");
  const email = headersList.get("x-user-email");
  const name = headersList.get("x-user-name");

  if (!id || !email) {
    return null;
  }

  return {
    id,
    email,
    name,
  };
}

export async function isAuthenticated(): Promise<boolean> {
  const headersList = await headers();
  const userId = headersList.get("x-user-id");
  const email = headersList.get("x-user-email");

  return !!(userId && email);
}
