import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")

    if (!code) {
      // No authorization code - user denied or error
      return NextResponse.redirect(new URL("/", request.url))
    }

    // Code received - redirect to home
    // The Supabase JavaScript client on the page will exchange this code for a session
    return NextResponse.redirect(new URL("/", request.url))
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_")) {
      throw error;
    }
    console.error("Auth callback error:", error)
    return NextResponse.redirect(new URL("/", request.url))
  }
}