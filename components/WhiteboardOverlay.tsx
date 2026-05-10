'use client';

import { useEffect, useRef, MutableRefObject } from 'react';
import { X } from 'lucide-react';
import dynamic from 'next/dynamic';
import '@excalidraw/excalidraw/index.css';

// Lazy-load Excalidraw on the client only — it touches `window` on import.
const Excalidraw = dynamic(
  async () => (await import('@excalidraw/excalidraw')).Excalidraw,
  {
    ssr: false,
    loading: () => <div className="whiteboard-loading">Loading whiteboard…</div>,
  },
);

type AnyElement = { id: string; version?: number; versionNonce?: number; isDeleted?: boolean };

interface WhiteboardOverlayProps {
  initialElements: readonly AnyElement[] | null;
  incomingRef: MutableRefObject<((elements: readonly AnyElement[]) => void) | null>;
  /** Set by the parent so it can force-clear the canvas (e.g. when the host
   * ends the call). Reconciliation can't do this — it merges with version
   * checks, so we need an unconditional wipe. */
  clearRef?: MutableRefObject<(() => void) | null>;
  broadcast: (payload: Record<string, unknown>) => void;
  onClose: () => void;
  /** When false, render the canvas in view-only mode and don't broadcast edits.
   * Non-host participants need the host to grant edit access first. */
  canEdit?: boolean;
}

function elementsSignature(elements: readonly AnyElement[]): string {
  return elements
    .map((e) => `${e.id}:${e.version ?? 0}:${e.versionNonce ?? 0}:${e.isDeleted ? 1 : 0}`)
    .join('|');
}

const WhiteboardOverlay = ({ initialElements, incomingRef, clearRef, broadcast, onClose, canEdit = true }: WhiteboardOverlayProps) => {
  const apiRef = useRef<any>(null);
  const lastSigRef = useRef<string>('');
  const broadcastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply remote elements coming from peers via the LiveKit data channel.
  // Reconciliation is version-based — if remote knows a newer version of an
  // element we keep it; if we have a newer local version we keep ours.
  useEffect(() => {
    incomingRef.current = async (remote) => {
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
    };
    return () => {
      incomingRef.current = null;
    };
  }, [incomingRef]);

  // Ask peers for the current scene when we open the board (late-joiner sync).
  useEffect(() => {
    broadcast({ type: 'whiteboard:request' });
    return () => {
      if (broadcastTimerRef.current) {
        clearTimeout(broadcastTimerRef.current);
        broadcastTimerRef.current = null;
      }
    };
  }, [broadcast]);

  // Expose a clear-the-canvas function the parent can call.
  useEffect(() => {
    if (!clearRef) return;
    clearRef.current = async () => {
      lastSigRef.current = '';
      if (!apiRef.current) return;
      const { CaptureUpdateAction } = await import('@excalidraw/excalidraw');
      apiRef.current.updateScene({
        elements: [],
        captureUpdate: CaptureUpdateAction.NEVER,
      });
    };
    return () => {
      if (clearRef) clearRef.current = null;
    };
  }, [clearRef]);

  const handleApi = async (api: any) => {
    apiRef.current = api;
    if (initialElements && initialElements.length) {
      const { CaptureUpdateAction } = await import('@excalidraw/excalidraw');
      lastSigRef.current = elementsSignature(initialElements);
      api.updateScene({
        elements: initialElements as any,
        captureUpdate: CaptureUpdateAction.NEVER,
      });
    }
  };

  const handleChange = (elements: readonly AnyElement[]) => {
    const sig = elementsSignature(elements);
    if (sig === lastSigRef.current) return;
    lastSigRef.current = sig;
    // View-only participants (non-hosts without granted access) never broadcast.
    if (!canEdit) return;
    // Throttle: collapse rapid pointer-driven changes into one broadcast every ~150ms.
    if (broadcastTimerRef.current) return;
    broadcastTimerRef.current = setTimeout(() => {
      broadcastTimerRef.current = null;
      const latest = apiRef.current?.getSceneElementsIncludingDeleted() ?? elements;
      broadcast({ type: 'whiteboard:op', elements: latest });
    }, 150);
  };

  return (
    <div className="whiteboard-overlay" role="dialog" aria-label="Shared whiteboard">
      <div className="whiteboard-toolbar">
        <span className="whiteboard-toolbar-title">Shared Whiteboard</span>
        <span className="whiteboard-toolbar-hint">
          {canEdit
            ? 'Everyone in the call sees your edits in real time.'
            : 'View only — ask the host for edit access.'}
        </span>
        <div className="whiteboard-toolbar-actions">
          <button type="button" className="whiteboard-toolbar-close" onClick={onClose} aria-label="Close whiteboard">
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="whiteboard-canvas">
        <Excalidraw
          excalidrawAPI={handleApi}
          onChange={handleChange as any}
          theme="dark"
          viewModeEnabled={!canEdit}
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
    </div>
  );
};

export default WhiteboardOverlay;
