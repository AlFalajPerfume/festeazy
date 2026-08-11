/* eslint-disable */
import { supabaseAdmin } from "@/lib/supabase-admin";
import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "festeazy_judge_session";
const SESSION_HOURS = 12;

function hashToken(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function createJudgeSession(judgeId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(
    Date.now() + SESSION_HOURS * 60 * 60 * 1000,
  ).toISOString();

  await supabaseAdmin
    .from("judge_sessions")
    .delete()
    .eq("judge_id", judgeId);

  const { error } = await supabaseAdmin.from("judge_sessions").insert({
    judge_id: judgeId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  if (error) throw new Error(error.message);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 60 * 60,
  });
}

export async function clearJudgeSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    await supabaseAdmin
      .from("judge_sessions")
      .delete()
      .eq("token_hash", hashToken(token));
  }

  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getJudgeSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  const { data: session, error } = await supabaseAdmin
    .from("judge_sessions")
    .select("id, judge_id, expires_at")
    .eq("token_hash", hashToken(token))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !session) return null;

  const { data: judge, error: judgeError } = await supabaseAdmin
    .from("judges")
    .select(
      "id, organization_id, event_id, name, phone, is_active",
    )
    .eq("id", session.judge_id)
    .eq("is_active", true)
    .maybeSingle();

  if (judgeError || !judge) return null;

  return judge;
}
