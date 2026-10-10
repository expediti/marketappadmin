import { NextResponse } from "next/server";
import {
  verifyAdminCredentials,
  createAdminSessionToken,
  ADMIN_COOKIE_NAME,
  DEFAULT_SESSION_MAX_AGE,
} from "@/lib/auth/admin-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const isValid = await verifyAdminCredentials(email, password);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid admin email or password." },
        { status: 401 }
      );
    }

    const token = await createAdminSessionToken(email);
    const maxAge = Number(process.env.ADMIN_SESSION_MAX_AGE) || DEFAULT_SESSION_MAX_AGE;

    const response = NextResponse.json({
      success: true,
      email: email.trim().toLowerCase(),
      role: "admin",
    });

    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });

    return response;
  } catch (error: any) {
    console.error("Admin login route error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during login." },
      { status: 500 }
    );
  }
}
