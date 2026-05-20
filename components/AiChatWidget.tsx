'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Bot, X, Send } from 'lucide-react';
import axios from 'axios';

type ChatRole = 'user' | 'assistant';

interface ChatMessage {
    role: ChatRole;
    content: string;
}

const SESSION_KEY = 'singalong.aichat.sessionId';

const generateSessionId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const AiChatWidget = () => {
    const pathname = usePathname();
    const { user } = useUser();

    const [isOpen, setIsOpen] = useState(false);
    const [sessionId, setSessionId] = useState<string>('');
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'assistant',
            content:
                "Hi! I'm the Sing Along Assistant. Ask me about features, plans, how to start a meeting, or anything about the platform.",
        },
    ]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    // Holds the partial assistant reply while it's being "typed" out.
    // null = no active stream; string = currently revealing characters.
    const [typing, setTyping] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // The widget should NOT appear inside a meeting room or the whiteboard embed
    // (the embed is loaded inside the mobile app's WebView whiteboard panel).
    const isInsideMeeting = useMemo(() => {
        if (!pathname) return false;
        return pathname.startsWith('/meeting/') || pathname.startsWith('/whiteboard-embed/');
    }, [pathname]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        let id = window.localStorage.getItem(SESSION_KEY);
        if (!id) {
            id = generateSessionId();
            window.localStorage.setItem(SESSION_KEY, id);
        }
        setSessionId(id);
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen, typing, sending]);

    // Clean up the typewriter timer on unmount so it doesn't fire into a dead component.
    useEffect(() => {
        return () => {
            if (typingTimer.current) clearTimeout(typingTimer.current);
        };
    }, []);

    if (isInsideMeeting) return null;

    const streamReply = (reply: string) => {
        // Reveal the assistant reply 2 chars at a time so it feels like real typing
        // without being painfully slow on longer answers.
        setTyping('');
        let i = 0;
        const tick = () => {
            i = Math.min(i + 2, reply.length);
            setTyping(reply.slice(0, i));
            if (i < reply.length) {
                typingTimer.current = setTimeout(tick, 18);
            } else {
                typingTimer.current = null;
                setMessages((m) => [...m, { role: 'assistant', content: reply }]);
                setTyping(null);
            }
        };
        tick();
    };

    const send = async () => {
        const text = input.trim();
        if (!text || sending || typing !== null || !sessionId) return;

        const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
        setMessages(next);
        setInput('');
        setSending(true);

        try {
            const { data } = await axios.post('/api/v1/ai-chat', {
                message: text,
                sessionId,
                userId: user?.id || null,
                // Only forward conversation history (skip the initial greeting).
                history: next.slice(1, -1),
            });

            const reply: string =
                data?.reply || "Sorry, I couldn't generate a response. Please try again.";
            setSending(false);
            streamReply(reply);
        } catch (err: any) {
            console.error('AI chat error:', err);
            setSending(false);
            streamReply(
                "I'm having trouble reaching the assistant right now. Please try again in a moment, or contact support via /contact-us."
            );
        }
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    return (
        <>
            {/* Floating launcher */}
            {!isOpen && (
                <button
                    type="button"
                    aria-label="Open Sing Along Assistant"
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-5 right-5 z-[9998] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-900/30 transition hover:scale-105 hover:shadow-emerald-700/40 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                >
                    <Bot className="h-7 w-7" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
                    </span>
                </button>
            )}

            {/* Chat panel */}
            {isOpen && (
                <div
                    role="dialog"
                    aria-label="Sing Along Assistant"
                    className="fixed bottom-5 right-5 z-[9999] flex h-[32rem] max-h-[calc(100dvh-2.5rem)] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#101418] text-white shadow-2xl"
                >
                    <div className="flex items-center justify-between bg-gradient-to-r from-emerald-600 to-emerald-800 px-4 py-3">
                        <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                                <Bot className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold leading-tight">Sing Along Assistant</p>
                                <p className="text-[11px] opacity-80">Ask me anything about the platform</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            aria-label="Close chat"
                            onClick={() => setIsOpen(false)}
                            className="rounded-full p-1 transition hover:bg-white/15"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#0c0f12] px-3 py-4">
                        {messages.map((m, i) => (
                            <div
                                key={i}
                                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    style={{ color: '#ffffff' }}
                                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-snug ${m.role === 'user'
                                            ? 'bg-emerald-600 rounded-br-sm'
                                            : 'bg-white/10 rounded-bl-sm'
                                        }`}
                                >
                                    {m.content}
                                </div>
                            </div>
                        ))}
                        {sending && typing === null && (
                            <div className="flex justify-start">
                                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-white/10 px-3 py-2.5">
                                    <span className="aichat-typing-dot" style={{ animationDelay: '0ms' }} />
                                    <span className="aichat-typing-dot" style={{ animationDelay: '180ms' }} />
                                    <span className="aichat-typing-dot" style={{ animationDelay: '360ms' }} />
                                </div>
                            </div>
                        )}
                        {typing !== null && (
                            <div className="flex justify-start">
                                <div
                                    style={{ color: '#ffffff' }}
                                    className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-white/10 px-3 py-2 text-sm leading-snug"
                                >
                                    {typing}
                                    <span className="aichat-typing-caret">▍</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="shrink-0 border-t border-white/10 bg-[#101418] p-2">
                        <div className="flex items-end gap-2">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={onKeyDown}
                                placeholder="Ask about plans, features, how-to…"
                                rows={1}
                                style={{ color: '#ffffff', backgroundColor: '#161b1f' }}
                                className="max-h-28 flex-1 resize-none rounded-xl border border-white/10 px-3 py-2 text-sm placeholder:text-white/40 focus:border-emerald-500 focus:outline-none"
                                disabled={sending || typing !== null}
                            />
                            <button
                                type="button"
                                onClick={send}
                                disabled={sending || typing !== null || !input.trim()}
                                aria-label="Send message"
                                className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AiChatWidget;
