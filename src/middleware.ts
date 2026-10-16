import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const publicPaths = ["/login", "/catalogo"];

function matchesPath(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const isPublic = publicPaths.some(path => matchesPath(request.nextUrl.pathname, path));
  const isLogin = matchesPath(request.nextUrl.pathname, "/login");
  const isCatalog = matchesPath(request.nextUrl.pathname, "/catalogo");
  const isCatalogLeadApi = request.nextUrl.pathname === "/api/catalog/leads";
  const isCron = request.nextUrl.pathname.startsWith("/api/cron/");
  if (isCron || isCatalog || isCatalogLeadApi) return NextResponse.next();

  if (!url || !key) {
    if (isPublic) return NextResponse.next();
    return NextResponse.redirect(new URL("/login?config=missing", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies) {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user && !isPublic) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(request.nextUrl.pathname)}`, request.url));
  if (user && isLogin) return NextResponse.redirect(new URL("/vehicles", request.url));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo-gv.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest)$).*)"],
};