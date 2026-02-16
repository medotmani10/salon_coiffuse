import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { amina, sarah } from '@/services/ai';
import { api } from '@/services/api';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'مرحبا! أنا أمينة، شريكتك في الصالون 🤝',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    // Load history on mount
    useEffect(() => {
        const loadHistory = async () => {
            if (isOpen) {
                setIsLoading(true);
                const { data } = await api.chat.getHistory(50); // increased limit
                if (data) {
                    const mapped: Message[] = data.map((msg: any) => ({
                        id: msg.id,
                        role: msg.role,
                        content: msg.content,
                        timestamp: new Date(msg.created_at)
                    }));
                    setMessages(mapped);
                }
                setIsLoading(false);
            }
        };
        loadHistory();
    }, [isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // 1. Gather Context (using amina for full business context)
            const context = await amina.gatherBusinessContext();

            // 2. Send to AI (using amina for partner chat inside the app)
            const responseText = await amina.chatWithPartner(userMessage.content, context);

            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: responseText,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.\nDésolé, une erreur de connexion s\'est produite.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* ... (Floating Button) */}
            <Button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl z-50 transition-all duration-300 ${isOpen ? 'rotate-90 bg-slate-200 text-slate-800 hover:bg-slate-300' : 'bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:scale-110'
                    }`}
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-7 h-7" />}
            </Button>

            {/* Chat Window */}
            {isOpen && (
                <Card className="fixed bottom-24 right-6 w-[90vw] md:w-[400px] h-[600px] max-h-[80vh] flex flex-col shadow-2xl z-50 animate-in slide-in-from-bottom-10 fade-in border-slate-200 dark:border-slate-700 overflow-hidden rounded-2xl">
                    {/* Header */}
                    <div className="p-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-full">
                            <Bot className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Amina (Partner)</h3>
                            <p className="text-xs text-rose-100 flex items-center gap-1">
                                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                Online
                            </p>
                        </div>
                    </div>

                    {/* Messages */}
                    <ScrollArea className="flex-1 p-4 bg-slate-50 dark:bg-slate-900/50">
                        <div className="space-y-4">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-slate-200 dark:bg-slate-700' : 'bg-rose-100 dark:bg-rose-900/30'
                                        }`}>
                                        {msg.role === 'user' ? <User className="w-4 h-4 text-slate-600" /> : <Bot className="w-4 h-4 text-rose-600" />}
                                    </div>
                                    <div className={`p-3 rounded-2xl max-w-[80%] text-sm whitespace-pre-wrap ${msg.role === 'user'
                                        ? 'bg-rose-500 text-white rounded-tr-none'
                                        : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-tl-none shadow-sm'
                                        }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                                        <Bot className="w-4 h-4 text-rose-600" />
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 border p-3 rounded-2xl rounded-tl-none flex items-center gap-1">
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                                    </div>
                                </div>
                            )}
                            <div ref={scrollRef} />
                        </div>
                    </ScrollArea>

                    {/* Input */}
                    <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSend();
                            }}
                            className="flex gap-2"
                        >
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Type your message..."
                                className="flex-1 bg-slate-50 dark:bg-slate-900 border-none focus-visible:ring-1 focus-visible:ring-rose-500"
                            />
                            <Button type="submit" size="icon" disabled={!input.trim() || isLoading} className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl">
                                <Send className="w-5 h-5" />
                            </Button>
                        </form>
                    </div>
                </Card>
            )}
        </>
    );
}
