import { useState, useEffect, useRef } from 'react';
import { X, Send, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { amina } from '@/services/ai';
import { api } from '@/services/api';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);

    // --- Drag Logic ---
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDragging(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        dragRef.current = {
            startX: clientX,
            startY: clientY,
            initialX: position.x,
            initialY: position.y
        };
    };

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging || !dragRef.current) return;

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const deltaX = clientX - dragRef.current.startX;
        const deltaY = clientY - dragRef.current.startY;

        setPosition({
            x: dragRef.current.initialX + deltaX,
            y: dragRef.current.initialY + deltaY
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        dragRef.current = null;
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('touchmove', handleMouseMove, { passive: false });
            window.addEventListener('touchend', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleMouseMove);
            window.removeEventListener('touchend', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleMouseMove);
            window.removeEventListener('touchend', handleMouseUp);
        };
    }, [isDragging, position]); // Need position in dep array because handleMouseMove uses it indirectly via dragRef, but it's safe.

    // ------------------

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
                if (data && data.length > 0) {
                    const mapped: Message[] = data.map((msg: any) => ({
                        id: msg.id,
                        role: msg.role,
                        content: msg.content,
                        timestamp: new Date(msg.created_at)
                    }));
                    setMessages(mapped);
                } else {
                    // Show welcome message if no history
                    setMessages([{
                        id: 'welcome',
                        role: 'assistant',
                        content: 'مرحبا! أنا أمينة، شريكتك في الصالون 🤝\nكيف يمكنني مساعدتك اليوم؟',
                        timestamp: new Date()
                    }]);
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

        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            // 1. Gather Context (using amina for full business context)
            const context = await amina.gatherBusinessContext();

            // 2. Format history for AI (last 10 messages to keep context but save tokens)
            const historyToMap = newMessages.slice(-10);
            const conversationHistory = historyToMap.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content
            }));

            // 3. Send to AI
            const responseText = await amina.chatWithPartner(conversationHistory, context);

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
                variant="ghost"
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
                onClick={(e) => {
                    // Prevent click from firing if we were just dragging
                    if (dragRef.current && (Math.abs(position.x - dragRef.current.initialX) > 5 || Math.abs(position.y - dragRef.current.initialY) > 5)) {
                        e.preventDefault();
                        return;
                    }
                    setIsOpen(!isOpen);
                }}
                className={`fixed bottom-6 right-6 h-16 w-16 p-0 hover:bg-transparent transition-all z-50 ${isOpen ? 'rotate-90 bg-white shadow-xl rounded-full h-12 w-12 hover:bg-slate-100 duration-300' : 'hover:scale-110 drop-shadow-2xl'
                    } ${isDragging ? 'cursor-grabbing duration-0' : 'cursor-grab duration-300'}`}
                style={{
                    transform: `translate(${position.x}px, ${position.y}px) ${isOpen ? 'rotate(90deg)' : ''}`
                }}
            >
                {isOpen
                    ? <X className="w-6 h-6 text-slate-700" />
                    : <img src="/amina-character.png" alt="Amina" className="w-full h-full object-contain filter drop-shadow-[0_4px_8px_rgba(244,63,94,0.4)]" />}
            </Button>

            {/* Chat Window */}
            {isOpen && (
                <Card className="fixed bottom-24 right-6 w-[90vw] md:w-[400px] h-[600px] max-h-[80vh] flex flex-col shadow-2xl z-50 animate-in slide-in-from-bottom-10 fade-in border-slate-200 dark:border-slate-700 overflow-hidden rounded-2xl">
                    {/* Header */}
                    <div className="p-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-white/40 flex-shrink-0">
                                <img src="/amina-character.png" alt="Amina" className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Amina (Partner)</h3>
                                <p className="text-xs text-rose-100 flex items-center gap-1">
                                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                    Online
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/20 hover:text-white rounded-full h-8 w-8"
                            onClick={() => setIsOpen(false)}
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Messages */}
                    <ScrollArea className="flex-1 p-4 bg-slate-50 dark:bg-slate-900/50">
                        <div className="space-y-4">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex-shrink-0 overflow-hidden ${msg.role === 'user' ? 'bg-slate-200 dark:bg-slate-700 flex items-center justify-center' : ''
                                        }`}>
                                        {msg.role === 'user'
                                            ? <User className="w-4 h-4 text-slate-600" />
                                            : <img src="/amina-character.png" alt="Amina" className="w-full h-full object-cover" />}
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
                                    <div className="w-8 h-8 rounded-full overflow-hidden">
                                        <img src="/amina-character.png" alt="Amina" className="w-full h-full object-cover" />
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
