import { NextResponse } from "next/server";
import { adminCookieHeader, createAdminSession, validAdminCredentials } from "@/app/api/admin/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!validAdminCredentials(username, password)) {
    return NextResponse.json({ ok: false, message: "Usuário ou senha incorretos." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", adminCookieHeader(await createAdminSession(), new URL(request.url).protocol === "https:"));
  return response;
}
