/* eslint-disable */
import { createJudgeSession, clearJudgeSession } from "@/lib/judge-session-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

function normalizePhone(value: string) {
  return value.replace(/\D/g, "").replace(/^00/, "");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const phone = normalizePhone(String(body?.phone || ""));
    const pin = String(body?.pin || "").trim();

    if (!phone || !pin) {
      return NextResponse.json(
        { error: "Enter phone number and PIN." },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("judges")
      .select("id, phone, login_pin, is_active")
      .eq("login_pin", pin)
      .eq("is_active", true);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const judge = (data || []).find(
      (item) => normalizePhone(String(item.phone || "")) === phone,
    );

    if (!judge) {
      return NextResponse.json(
        { error: "Invalid phone number or PIN." },
        { status: 401 },
      );
    }

    await createJudgeSession(judge.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unable to login." },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  await clearJudgeSession();
  return NextResponse.json({ success: true });
}
