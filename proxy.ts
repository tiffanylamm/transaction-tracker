import { NextResponse, type NextRequest } from "next/server";

// --- Rate Limiting (in-memory, per serverless instance) ---
const rateLimitMap = new Map<
  string,
  { count: number; resetTime: number }
>();

const RATE_LIMITS = {
  auth: { max: 10, windowMs: 60_000 },   // 10 req/min for auth routes
  api: { max: 60, windowMs: 60_000 },    // 60 req/min for API routes
};

function getRateLimitResult(
  ip: string,
  kind: "auth" | "api",
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const { max, windowMs } = RATE_LIMITS[kind];
  const key = `${kind}:${ip}`;

  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: max - 1 };
  }

  entry.count++;
  if (entry.count > max) {
    return { allowed: false, remaining: 0 };
  }
  return { allowed: true, remaining: max - entry.count };
}

// Clean up expired entries periodically (every 100 requests)
let requestCount = 0;
function cleanupExpiredEntries() {
  requestCount++;
  if (requestCount % 100 !== 0) return;
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

// --- CORS ---
const allowedOrigins = [
  process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
];

function getCorsHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };

  if (origin && allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

// --- Public routes (no auth required) ---
const publicPaths = ["/sign-in", "/api/auth"];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

// --- Proxy ---
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 200,
      headers: getCorsHeaders(origin),
    });
  }

  // Rate limiting for API routes
  if (pathname.startsWith("/api")) {
    cleanupExpiredEntries();
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";

    const kind = pathname.startsWith("/api/auth") ? "auth" : "api";
    const result = getRateLimitResult(ip, kind);

    if (!result.allowed) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: {
          "Retry-After": "60",
          ...getCorsHeaders(origin),
        },
      });
    }
  }

  // Auth guard — skip for public routes
  if (!isPublicPath(pathname)) {
    const sessionCookie =
      request.cookies.get("__Secure-better-auth.session_token") ??
      request.cookies.get("better-auth.session_token");
if (!sessionCookie?.value) {
      const signInUrl = new URL("/sign-in", request.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Attach CORS headers to response
  const response = NextResponse.next();
  const corsHeaders = getCorsHeaders(origin);
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
