import { NextRequest, NextResponse } from 'next/server';
import securityPolicy from './lib/content-security-policy.cjs';

const { createContentSecurityPolicy } = securityPolicy;

export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.next();
  }

  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  const nonce = btoa(String.fromCharCode(...randomBytes));
  const contentSecurityPolicy = createContentSecurityPolicy(
    nonce,
    process.env.NEXT_PUBLIC_API_URL!
  );
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicy);

  const response = NextResponse.next({
    request: { headers: requestHeaders }
  });
  response.headers.set('Content-Security-Policy', contentSecurityPolicy);
  response.headers.set('Strict-Transport-Security', 'max-age=31536000');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
