'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, ShieldCheck } from 'lucide-react';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = searchParams.get('next') || '/monitoramento';

    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/monitoring/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.error || 'Não foi possível entrar.');
                return;
            }

            router.replace(next);
            router.refresh();
        } catch {
            setError('Erro de conexão. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#14082F] text-white p-4">
            <div className="glass-card w-full max-w-sm p-8">
                <div className="flex flex-col items-center mb-8 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#8858F1] to-[#C9B1FD] flex items-center justify-center shadow-lg mb-4">
                        <ShieldCheck className="text-white" size={28} />
                    </div>
                    <h1 className="text-xl font-black italic">Monitoramento WhatsApp</h1>
                    <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mt-1">Acesso restrito do cliente</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="password"
                            autoFocus
                            placeholder="Senha de acesso"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#B9F32E] transition-all"
                        />
                    </div>

                    {error && <p className="text-red-400 text-xs font-bold">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading || !password}
                        className="w-full rounded-2xl bg-[#B9F32E] px-6 py-3 text-sm text-[#14082F] font-black hover:bg-[#a3d628] disabled:opacity-50 transition-all"
                    >
                        {loading ? 'Entrando...' : 'ENTRAR'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={null}>
            <LoginForm />
        </Suspense>
    );
}
