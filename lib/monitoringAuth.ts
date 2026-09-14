// Autenticação simples (senha única) para o painel do cliente em
// /monitoramento. Usa apenas Web Crypto (crypto.subtle), então funciona
// tanto no middleware (Edge runtime) quanto nas rotas de API (Node runtime)
// sem depender do módulo 'crypto' do Node.

const encoder = new TextEncoder();

async function getKey(secret: string): Promise<CryptoKey> {
    return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
        'sign',
        'verify',
    ]);
}

function toHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

function fromHex(hex: string): ArrayBuffer {
    const matches = hex.match(/.{1,2}/g) || [];
    return new Uint8Array(matches.map((b) => parseInt(b, 16))).buffer as ArrayBuffer;
}

const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 horas

export async function createSessionToken(secret: string): Promise<string> {
    const expires = Date.now() + SESSION_TTL_MS;
    const payload = `ok.${expires}`;
    const key = await getKey(secret);
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    return `${payload}.${toHex(signature)}`;
}

export async function verifySessionToken(token: string | undefined | null, secret: string | undefined): Promise<boolean> {
    if (!token || !secret) return false;

    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const [marker, expiresStr, sigHex] = parts;
    if (marker !== 'ok') return false;

    const expires = Number(expiresStr);
    if (!expires || Number.isNaN(expires) || Date.now() > expires) return false;

    try {
        const key = await getKey(secret);
        const payload = `${marker}.${expiresStr}`;
        return await crypto.subtle.verify('HMAC', key, fromHex(sigHex), encoder.encode(payload));
    } catch {
        return false;
    }
}

export function timingSafeEqualString(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

export const SESSION_COOKIE_NAME = 'kommo_monitor_session';
export const SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;
