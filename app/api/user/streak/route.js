import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { UserRepository } from "@/lib/user-api";

export async function GET(request) {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  if (!token) {
    return NextResponse.json({ streak: 0, authenticated: false });
  }

  try {
    const data = await UserRepository.getStreak(token);
    return NextResponse.json({ ...(data ?? { streak: 0 }), authenticated: true });
  } catch (error) {
    console.error("[/api/user/streak]", error);
    return NextResponse.json({ streak: 0, authenticated: true, error: "Failed to fetch streak" });
  }
}
