import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { withLoggedRoute } from "@/lib/api-route-utils";
import { authOptions } from "@/lib/auth";
import { apiLog } from "@/lib/logger";
import { UserRepository } from "@/lib/user-api";

async function getToken(request) {
  const session = await getServerSession(authOptions);
  if (session?.accessToken) return session.accessToken;
  const auth = request.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export const GET = withLoggedRoute(async (request) => {
  const token = await getToken(request);
  if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  try {
    const data = await UserRepository.getGoals(token);
    return NextResponse.json(data ?? { goals: [] });
  } catch (error) {
    apiLog.error("goals_get_failed", { err: error });
    return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
  }
});

export const POST = withLoggedRoute(async (request) => {
  const token = await getToken(request);
  if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const goal = await request.json().catch(() => null);
  if (!goal?.type || !goal?.targetDate) {
    return NextResponse.json({ error: "type and targetDate are required" }, { status: 400 });
  }

  try {
    const data = await UserRepository.createGoal(token, goal);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    apiLog.error("goals_post_failed", { err: error });
    return NextResponse.json({ error: "Failed to create goal" }, { status: 500 });
  }
});

export const PATCH = withLoggedRoute(async (request) => {
  const token = await getToken(request);
  if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { goalId, ...updates } = await request.json().catch(() => ({}));
  if (!goalId) return NextResponse.json({ error: "goalId is required" }, { status: 400 });

  try {
    const data = await UserRepository.updateGoal(token, goalId, updates);
    return NextResponse.json(data);
  } catch (error) {
    apiLog.error("goals_patch_failed", { err: error });
    return NextResponse.json({ error: "Failed to update goal" }, { status: 500 });
  }
});

export const DELETE = withLoggedRoute(async (request) => {
  const token = await getToken(request);
  if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { goalId } = await request.json().catch(() => ({}));
  if (!goalId) return NextResponse.json({ error: "goalId is required" }, { status: 400 });

  try {
    await UserRepository.deleteGoal(token, goalId);
    return NextResponse.json({ success: true });
  } catch (error) {
    apiLog.error("goals_delete_failed", { err: error });
    return NextResponse.json({ error: "Failed to delete goal" }, { status: 500 });
  }
});
