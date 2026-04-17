/**
 * @fileoverview /api/user/goals
 *
 * Handles post-Ramadan reading goal CRUD:
 *  GET    — list all goals
 *  POST   — create a new goal  { type, target, targetDate, dailyMinutes }
 *  PATCH  — update goal progress { goalId, ...updates }
 *  DELETE — delete a goal { goalId }
 */
import { NextResponse } from "next/server";

import { UserRepository } from "@/lib/user-api";

function extractBearerToken(request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

/** GET — list all goals */
export async function GET(request) {
  const token = extractBearerToken(request);
  if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  try {
    const data = await UserRepository.getGoals(token);
    return NextResponse.json(data ?? { goals: [] });
  } catch (error) {
    console.error("[/api/user/goals GET]", error);
    return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
  }
}

/** POST — create a goal */
export async function POST(request) {
  const token = extractBearerToken(request);
  if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const goal = await request.json().catch(() => null);
  if (!goal?.type || !goal?.targetDate) {
    return NextResponse.json({ error: "type and targetDate are required" }, { status: 400 });
  }

  try {
    const data = await UserRepository.createGoal(token, goal);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("[/api/user/goals POST]", error);
    return NextResponse.json({ error: "Failed to create goal" }, { status: 500 });
  }
}

/** PATCH — update goal progress */
export async function PATCH(request) {
  const token = extractBearerToken(request);
  if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { goalId, ...updates } = await request.json().catch(() => ({}));
  if (!goalId) return NextResponse.json({ error: "goalId is required" }, { status: 400 });

  try {
    const data = await UserRepository.updateGoal(token, goalId, updates);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[/api/user/goals PATCH]", error);
    return NextResponse.json({ error: "Failed to update goal" }, { status: 500 });
  }
}

/** DELETE — remove a goal */
export async function DELETE(request) {
  const token = extractBearerToken(request);
  if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { goalId } = await request.json().catch(() => ({}));
  if (!goalId) return NextResponse.json({ error: "goalId is required" }, { status: 400 });

  try {
    await UserRepository.deleteGoal(token, goalId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[/api/user/goals DELETE]", error);
    return NextResponse.json({ error: "Failed to delete goal" }, { status: 500 });
  }
}
