interface Mensagem {
    id: number;
    direcao: 'enviada' | 'recebida';
    conteudo: string;
    tipo_mensagem: string;
    timestamp: string;
}

export default function ChatBubble({ mensagem }: { mensagem: Mensagem }) {
    const isEnviada = mensagem.direcao === 'enviada';
    const hora = new Date(mensagem.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className={`flex ${isEnviada ? 'justify-end' : 'justify-start'} mb-2`}>
            <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-md ${
                    isEnviada
                        ? 'bg-[#8858F1] text-white rounded-br-sm'
                        : 'bg-white/10 text-gray-100 border border-white/10 rounded-bl-sm'
                }`}
            >
                {mensagem.tipo_mensagem !== 'texto' && (
                    <p className="text-[10px] uppercase tracking-wider opacity-60 font-bold mb-1">
                        {mensagem.tipo_mensagem}
                    </p>
                )}
                <p className="whitespace-pre-wrap break-words">{mensagem.conteudo}</p>
                <p className={`text-[10px] mt-1 text-right ${isEnviada ? 'text-white/70' : 'text-gray-400'}`}>{hora}</p>
            </div>
        </div>
    );
}
