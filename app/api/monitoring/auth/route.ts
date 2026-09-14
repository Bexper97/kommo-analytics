import { NextResponse } from 'next/server';
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, timingSafeEqualString } from '@/lib/monitoringAuth';

export async function POST(request: Request) {
    const secret = process.env.CLIENT_DASHBOARD_SECRET;
    const clientPassword = process.env.CLIENT_DASHBOARD_PASSWORD;

    if (!secret || !clientPassword) {
        return NextResponse.json(
            { error: 'Login do painel não configurado. Defina CLIENT_DASHBOARD_SECRET e CLIENT_DASHBOARD_PASSWORD.' },
            { status: 500 }
        );
    }

    let password = '';
    try {
        const body = await request.json();
        password = String(body?.password || '');
    } catch {
        return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
    }

    if (!password || !timingSafeEqualString(password, clientPassword)) {
        return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 });
    }

    const token = await createSessionToken(secret);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return response;
}

export async function DELETE() {
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE_NAME, '', { path: '/', maxAge: 0 });
    return response;
}
