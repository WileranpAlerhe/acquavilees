import { NextResponse } from "next/server";
import { clearAdminCookieHeader, isAdminRequest } from "@/app/api/admin/auth";

export async function GET(request: Request) {
  return NextResponse.json({ authenticated: await isAdminRequest(request) });
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", clearAdminCookieHeader());
  return response;
}
