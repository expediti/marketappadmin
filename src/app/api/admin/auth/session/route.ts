import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin-auth";

export async function GET(request: Request) {
  const session = await getAdminSession(request);

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    email: session.email,
    role: session.role,
    expiresAt: session.exp,
  });
}
