import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const token = req.cookies.get("sa_token")?.value;
  const { pathname } = req.nextUrl;

  const isLoginPage = pathname.startsWith("/login");

  if (token && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (!token && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/((?!_next|favicon.ico).*)"],
};
