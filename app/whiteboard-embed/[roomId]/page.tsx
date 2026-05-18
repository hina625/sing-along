'use client';

import { useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import '@excalidraw/excalidraw/index.css';

/**
 * Embeddable whiteboard for cross-platform sync.
 *
 * Rendered inside the React Native `WebView` (mobile) or any iframe parent.
 * Speaks the same `whiteboard:op` / `whiteboard:request` / `whiteboard:clear`
 * protocol the in-app `LiveKitMeeting` uses on the LiveKit data channel, so
 * mobile draws show up on web and vice versa. The host page is responsible
 * for forwarding messages between this embed and LiveKit.
 *
 * Wire:
 *   Embed → host:   window.parent.postMessage  ||  ReactNativeWebView.postMessage
 *   Host  → embed:  window.postMessage to embed window (iframe) or
 *                   webViewRef.injectJavaScript("window.dispatchEvent(...)") (RN)
 *
 * Payload shape (JSON string in both directions):
 *   { type: 'whiteboard:ready' }
 *   { type: 'whiteboard:request' }
 *   { type: 'whiteboard:op',    elements: AnyElement[] }
 *   { type: 'whiteboard:clear' }
 *
 * The roomId in the URL is informational — sync is host-mediated, not based
 * on a separate Excalidraw room. We never call any external collab service.
 */

type AnyElement = { id: string; version?: number; versionNonce?: number; isDeleted?: boolean };

const Excalidraw = dynamic(
    async () => (await import('@excalidraw/excalidraw')).Excalidraw,
    {
        ssr: false,
        loading: () => (
            <div style={{
                position: 'fixed', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#0A0A0A', color: '#D4AF37',
                fontFamily: 'system-ui, sans-serif',
            }}>
                Loading whiteboard…
            </div>
        ),
    }
);

function elementsSignature(elements: readonly AnyElement[]): string {
    return elements
        .map((e) => `${e.id}:${e.version ?? 0}:${e.versionNonce ?? 0}:${e.isDeleted ? 1 : 0}`)
        .join('|');
}

function postToHost(msg: Record<string, unknown>) {
    if (typeof window === 'undefined') return;
    const payload = JSON.stringify(msg);
    // React Native WebView injects this global.
    const rn = (window as any).ReactNativeWebView;
    if (rn && typeof rn.postMessage === 'function') {
        rn.postMessage(payload);
        return;
    }
    // iframe fallback.
    if (window.parent && window.parent !== window) {
        window.parent.postMessage(payload, '*');
    }
}

export default function WhiteboardEmbed() {
    const apiRef = useRef<any>(null);
    const lastSigRef = useRef<string>('');
    const broadcastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Apply a remote scene to our local Excalidraw — reconcile by version.
    const applyRemote = useCallback(async (remote: readonly AnyElement[]) => {
        if (!apiRef.current) return;
        const sig = elementsSignature(remote);
        if (sig === lastSigRef.current) return;
        const { reconcileElements, CaptureUpdateAction } = await import('@excalidraw/excalidraw');
        const local = apiRef.current.getSceneElementsIncludingDeleted();
        const merged = reconcileElements(local, remote as any, apiRef.current.getAppState());
        lastSigRef.current = elementsSignature(merged);
        apiRef.current.updateScene({
            elements: merged,
            captureUpdate: CaptureUpdateAction.NEVER,
        });
    }, []);

    const clearScene = useCallback(async () => {
        lastSigRef.current = '';
        if (!apiRef.current) return;
        const { CaptureUpdateAction } = await import('@excalidraw/excalidraw');
        apiRef.current.updateScene({
            elements: [],
            captureUpdate: CaptureUpdateAction.NEVER,
        });
    }, []);

    // Handle messages from host.
    // The host may post as a string (RN injects via window.dispatchEvent) or
    // as an object (iframe uses MessageEvent.data of any type) — normalize both.
    useEffect(() => {
        const handle = (ev: MessageEvent) => {
            let raw: any = ev.data;
            if (typeof raw === 'string') {
                try { raw = JSON.parse(raw); } catch { return; }
            }
            if (!raw || typeof raw !== 'object') return;
            if (raw.type === 'whiteboard:op' && Array.isArray(raw.elements)) {
                applyRemote(raw.elements);
            } else if (raw.type === 'whiteboard:clear') {
                clearScene();
            }
        };
        window.addEventListener('message', handle);
        return () => window.removeEventListener('message', handle);
    }, [applyRemote, clearScene]);

    const handleApi = (api: any) => {
        apiRef.current = api;
        // Tell the host we're ready so it can replay the current scene.
        postToHost({ type: 'whiteboard:ready' });
        postToHost({ type: 'whiteboard:request' });
    };

    const handleChange = (elements: readonly AnyElement[]) => {
        const sig = elementsSignature(elements);
        if (sig === lastSigRef.current) return;
        lastSigRef.current = sig;
        if (broadcastTimerRef.current) return;
        broadcastTimerRef.current = setTimeout(() => {
            broadcastTimerRef.current = null;
            const latest = apiRef.current?.getSceneElementsIncludingDeleted() ?? elements;
            postToHost({ type: 'whiteboard:op', elements: latest });
        }, 150);
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: '#1A1A1A',
            }}
        >
            <Excalidraw
                excalidrawAPI={handleApi}
                onChange={handleChange as any}
                theme="dark"
                UIOptions={{
                    canvasActions: {
                        loadScene: false,
                        export: false,
                        saveToActiveFile: false,
                        toggleTheme: false,
                    },
                    tools: { image: false },
                }}
            />
        </div>
    );
}
