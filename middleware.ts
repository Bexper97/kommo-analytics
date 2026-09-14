import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/monitoringAuth';

export const config = {
    matcher: ['/monitoramento/:path*'],
};

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (pathname.startsWith('/monitoramento/login')) {
        return NextResponse.next();
    }

    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const secret = process.env.CLIENT_DASHBOARD_SECRET;
    const isValid = await verifySessionToken(token, secret);

    if (!isValid) {
        const loginUrl = new URL('/monitoramento/login', request.url);
        loginUrl.searchParams.set('next', pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}
