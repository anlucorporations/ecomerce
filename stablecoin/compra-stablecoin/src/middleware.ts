import { NextRequest, NextResponse } from "next/server";

/**
 * Rate limiting simple en memoria (por IP) para endpoints sensibles que
 * pueden mintear tokens (M14 de la auditoría).
 * Advertencia: en memoria — suficiente para una instancia; en multi-instancia
 * usar un store compartido (Redis/DB).
 */
const WINDOW_MS = 60 * 1000; // 1 minuto
const MAX_REQUESTS = 30; // máx. 30 peticiones/minuto por IP

const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimitExceeded(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_REQUESTS;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Solo aplica a las rutas API sensibles
  const sensitive = [
    "/api/checkout",
    "/api/webhooks/simulate",
    "/api/webhooks/stripe",
  ];
  if (!sensitive.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Los webhooks de Stripe vienen de servidores de Stripe (no se limitan por IP del cliente)
  if (pathname.startsWith("/api/webhooks/stripe")) {
    return NextResponse.next();
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (rateLimitExceeded(ip)) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intente más tarde." },
      { status: 429 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
