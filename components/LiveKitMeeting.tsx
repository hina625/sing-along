'use client';

import React, { useEffect, useState, useRef, useMemo, useReducer, useCallback } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useParticipants,
  useTracks,
  useLocalParticipant,
  ParticipantTile,
  TrackReferenceOrPlaceholder,
  LayoutContextProvider,
  useMediaDevices,
  useRoomContext,
  Chat,
  useTranscriptions,
  useChat,
  useConnectionState,
} from '@livekit/components-react';
import { Track, Participant, Room, RoomEvent, ParticipantEvent, LocalVideoTrack, LocalAudioTrack, AudioPresets } from 'livekit-client';
import { BackgroundProcessor, supportsBackgroundProcessors } from '@livekit/track-processors';
import '@livekit/components-styles';
import { useRouter } from 'next/navigation';
import Loader from './Loader';
import WhiteboardOverlay from './WhiteboardOverlay';
import { useToast } from './ui/use-toast';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  Hand, Smile, Captions,
  MonitorUp, Info, Users, MessageSquare,
  LayoutTemplate, Shield, X, ChevronUp,
  Pin, Monitor, AppWindow, Copy, Check, Send,
  CircleDashed, Eraser, Music, HandHeart, HeartHandshake, Disc, CircleDot,
  StickyNote, PenTool, Paperclip, BookOpen, Share2, Cross, Group, ArrowLeft,
  Play, Pause, FileMusic, Volume2, SkipForward, MoreHorizontal
} from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';

const HAND_RAISED_ATTR = 'lk_hand_raised';
// Published by every client on join so other participants (esp. the host
// running breakout controls) can map a LiveKit identity → app userId.
const LK_USER_ID_ATTR = 'lk_user_id';

/**
 * MediaPipe asset paths for the LiveKit BackgroundProcessor.
 *
 * By default, the processor fetches the segmenter WASM from cdn.jsdelivr.net and
 * the tflite model from storage.googleapis.com. Those CDNs are a single point of
 * failure: if they're slow or blocked (CSP, corporate firewalls), segmentation
 * silently no-ops and you get the "blur the whole frame" / "virtual bg with no
 * person cutout" symptoms.
 *
 * To self-host (recommended for production), drop these files under
 *   sing-along-website/public/livekit-processors/
 *     ├── wasm/                           ← contents of @mediapipe/tasks-vision/wasm
 *     │     (vision_wasm_internal.js, vision_wasm_internal.wasm,
 *     │      vision_wasm_nosimd_internal.js, vision_wasm_nosimd_internal.wasm)
 *     └── selfie_segmenter.tflite          ← from storage.googleapis.com
 *
 * Set NEXT_PUBLIC_LK_PROCESSOR_ASSETS=/livekit-processors in .env to switch over.
 * If the env var is unset we fall back to the upstream CDN URLs.
 */
const LK_PROCESSOR_ASSETS_BASE =
  process.env.NEXT_PUBLIC_LK_PROCESSOR_ASSETS || '';

const lkProcessorAssetPaths = LK_PROCESSOR_ASSETS_BASE
  ? {
      tasksVisionFileSet: `${LK_PROCESSOR_ASSETS_BASE}/wasm`,
      modelAssetPath: `${LK_PROCESSOR_ASSETS_BASE}/selfie_segmenter.tflite`,
    }
  : undefined;

function isHandRaised(p: { attributes?: Record<string, string> }) {
  return p.attributes?.[HAND_RAISED_ATTR] === '1';
}

function formatRoomId(room: string) {
  // Simple formatter to make it look like abc-defg-hij
  const clean = room.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  if (clean.length <= 4) return clean;
  if (clean.length <= 7) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  return `${clean.slice(0, 3)}-${clean.slice(3, 7)}-${clean.slice(7, 10)}`;
}

interface LiveKitMeetingProps {
  room: string;
  identity: string;
  /**
   * Stable user ID (e.g. Clerk user.id). Used for role resolution against the
   * room creator. Falls back to `identity` if not provided.
   */
  userId?: string;
  /**
   * Waiting-room admission key returned by /api/v1/waiting-room. Required for
   * non-host participants — the token route refuses to issue a JWT without it.
   * Hosts (userId === room creator) bypass and don't need a key.
   */
  admitKey?: string;
  onDisconnected?: () => void;
}

/**
 * Real-time Clock Component
 */
const Clock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span>
      {time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
    </span>
  );
};

/**
 * Custom Avatar with solid background colors
 */
const InitialAvatar = ({ participant }: { participant: Participant }) => {
  const identity = participant.identity || 'User';
  const initial = identity.charAt(0).toUpperCase();
  
  const colors = ['#1a73e8', '#ea4335', '#f9ab00', '#34a853', '#9334e6', '#12b5cb'];
  const colorIndex = identity.length % colors.length;
  const bgColor = colors[colorIndex];

  return (
    <div 
      className="meet-initial-avatar" 
      style={{ backgroundColor: bgColor }}
    >
      {initial}
    </div>
  );
};

/**
 * Custom Participant Tile to match Google Meet
 */
const CustomTile = ({ trackRef, isThumb = false }: { trackRef: TrackReferenceOrPlaceholder, isThumb?: boolean }) => {
  const participant = trackRef.participant;
  const [, bumpAttrs] = useReducer((n: number) => n + 1, 0);

  if (!participant) return null;

  useEffect(() => {
    if (!participant) return;
    const onAttr = () => bumpAttrs();
    participant.on(ParticipantEvent.AttributesChanged, onAttr);
    return () => {
      participant.off(ParticipantEvent.AttributesChanged, onAttr);
    };
  }, [participant, bumpAttrs]);

  // Detect if this is the local user's screen share
  const isLocalScreenShare = participant?.isLocal && trackRef.source === Track.Source.ScreenShare;
  
  const isCameraOff = !participant?.isCameraEnabled;
  const isSpeaking = participant?.isSpeaking;
  const micOn = participant?.isMicrophoneEnabled ?? false;

  return (
    <div
      className={`${isThumb ? 'thumb-tile meet-tile' : 'meet-tile'} w-full h-full relative`}
      data-lk-speaking={isSpeaking ? 'true' : 'false'}
      data-lk-mic={micOn ? 'true' : 'false'}
    >
      {isLocalScreenShare ? (
        <PresentingPlaceholder />
      ) : isCameraOff ? (
        <InitialAvatar participant={participant!} />
      ) : (
        <ParticipantTile trackRef={trackRef} />
      )}
      
      {!isLocalScreenShare && (
        <div className="meet-name-tag meet-name-tag-row">
          {participant && isHandRaised(participant) && (
            <Hand size={14} className="meet-hand-on-tile shrink-0" aria-hidden />
          )}
          <span className="truncate">{participant?.identity}</span>
        </div>
      )}

      <button type="button" className="tile-pin" aria-label="Pin tile">
        <Pin size={14} strokeWidth={2.25} />
      </button>
    </div>
  );
};

/**
 * Placeholder shown when YOU are presenting
 */
const PresentingPlaceholder = () => {
  return (
    <div className="presenting-placeholder">
      <div className="presenting-placeholder-icon">
        <MonitorUp size={24} />
      </div>
      <h3 className="presenting-placeholder-title">You're presenting to everyone</h3>
      <p className="presenting-placeholder-subtitle">A presentation placeholder is shown here to avoid an infinity mirror</p>
    </div>
  );
};

/**
 * Reaction Tray — Faith reactions for Worship Mode
 */
const FAITH_REACTIONS: { emoji: string; label: string }[] = [
  { emoji: '🙏', label: 'Amen' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '👏', label: 'Praise' },
  { emoji: '🙌', label: 'Hallelujah' },
  { emoji: '✝️', label: 'Bless' },
];

const ReactionTray = ({ onSelect }: { onSelect: (emoji: string) => void }) => {
  return (
    <div className="reaction-tray">
      {FAITH_REACTIONS.map(({ emoji, label }) => (
        <div
          key={emoji}
          className="reaction-emoji"
          title={label}
          aria-label={label}
          onClick={() => onSelect(emoji)}
        >
          {emoji}
        </div>
      ))}
    </div>
  );
};

/**
 * Floating reactions layer — emojis float up and fade out
 */
type FloatingReaction = { id: string; emoji: string; left: number };

const FloatingReactionsLayer = ({ reactions }: { reactions: FloatingReaction[] }) => {
  return (
    <div className="floating-reactions-layer" aria-hidden>
      {reactions.map((r) => (
        <span
          key={r.id}
          className="floating-reaction"
          style={{ left: `${r.left}%` }}
        >
          {r.emoji}
        </span>
      ))}
    </div>
  );
};

/**
 * Lyrics Overlay — center-screen worship lyrics with fade transitions.
 * Host-controlled: paste lyrics (one verse per blank-line block), step through verses.
 */
const LyricsOverlay = ({
  verses,
  index,
  onPrev,
  onNext,
  onClose,
  isHost,
}: {
  verses: string[];
  index: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  isHost: boolean;
}) => {
  const current = verses[index] || '';
  return (
    <div className="lyrics-overlay" role="region" aria-label="Worship lyrics">
      <button type="button" className="lyrics-close" onClick={onClose} aria-label="Close lyrics">
        <X size={20} />
      </button>
      <div key={`${index}-${current}`} className="lyrics-text">
        {current.split('\n').map((line, i) => (
          <p key={i} className="lyrics-line">{line}</p>
        ))}
      </div>
      {isHost && verses.length > 1 && (
        <div className="lyrics-controls">
          <button type="button" onClick={onPrev} disabled={index === 0}>Prev</button>
          <span className="lyrics-counter">{index + 1} / {verses.length}</span>
          <button type="button" onClick={onNext} disabled={index >= verses.length - 1}>Next</button>
        </div>
      )}
    </div>
  );
};

/**
 * Prayer Request Modal — public/private prayer submission to host queue.
 */
const PrayerRequestModal = ({
  roomId,
  senderId,
  senderName,
  onClose,
  onSubmitted,
}: {
  roomId: string;
  senderId: string;
  senderName: string;
  onClose: () => void;
  onSubmitted: () => void;
}) => {
  const [text, setText] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('private');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const submit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const resp = await fetch('/api/v1/prayer-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          senderId,
          senderName,
          content: text.trim(),
          visibility,
        }),
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.message || 'Failed');
      toast({
        title: '🙏 Prayer received',
        description: visibility === 'public'
          ? 'Shared with everyone in worship.'
          : 'Sent privately to the pastor.',
        className: 'bg-white/10 border-none text-white',
      });
      onSubmitted();
      onClose();
    } catch (e) {
      toast({
        title: 'Could not submit prayer',
        description: e instanceof Error ? e.message : 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="worship-modal-backdrop" onClick={onClose}>
      <div className="worship-modal" onClick={(e) => e.stopPropagation()}>
        <div className="worship-modal-head">
          <span>🙏 Submit Prayer Request</span>
          <button type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <p className="worship-modal-hint">Your request will be lifted up by the leadership team.</p>
        <textarea
          className="worship-modal-input"
          placeholder="Write your prayer request..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          autoFocus
        />
        <div className="worship-modal-radios">
          <label className={visibility === 'public' ? 'active' : ''}>
            <input
              type="radio"
              name="prayer-visibility"
              checked={visibility === 'public'}
              onChange={() => setVisibility('public')}
            />
            Public — share with everyone
          </label>
          <label className={visibility === 'private' ? 'active' : ''}>
            <input
              type="radio"
              name="prayer-visibility"
              checked={visibility === 'private'}
              onChange={() => setVisibility('private')}
            />
            Private — pastor only
          </label>
        </div>
        <button
          type="button"
          className="worship-modal-cta"
          disabled={!text.trim() || submitting}
          onClick={submit}
        >
          {submitting ? 'Submitting...' : 'Submit Prayer'}
        </button>
      </div>
    </div>
  );
};

/**
 * Give Offering Modal — quick in-session donation entry point.
 */
const GiveOfferingModal = ({ onClose }: { onClose: () => void }) => {
  const presets = [10, 25, 50, 100];
  const [amount, setAmount] = useState<number>(25);
  const openDonate = () => {
    if (typeof window !== 'undefined') {
      window.open(`/donate?amount=${amount}`, '_blank', 'noopener');
    }
  };
  return (
    <div className="worship-modal-backdrop" onClick={onClose}>
      <div className="worship-modal worship-modal-give" onClick={(e) => e.stopPropagation()}>
        <div className="worship-modal-head">
          <span>💛 Give Offering</span>
          <button type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <p className="worship-modal-hint">"Each one must give as he has decided in his heart." — 2 Cor 9:7</p>
        <div className="give-presets">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              className={`give-preset ${amount === p ? 'active' : ''}`}
              onClick={() => setAmount(p)}
            >
              ${p}
            </button>
          ))}
        </div>
        <label className="give-custom-label">Or enter custom amount</label>
        <div className="give-custom-wrap">
          <span>$</span>
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(Math.max(1, +e.target.value || 0))}
            className="give-custom-input"
          />
        </div>
        <button type="button" className="worship-modal-cta give-cta" onClick={openDonate}>
          Sow a Seed →
        </button>
        <p className="give-secure">Secure giving via Authorize.net & Stripe</p>
      </div>
    </div>
  );
};

/**
 * Lyrics Composer (host) — paste full song, separate verses with blank lines.
 */
const LyricsComposer = ({
  onStart,
  onClose,
}: {
  onStart: (verses: string[]) => void;
  onClose: () => void;
}) => {
  const [text, setText] = useState('');
  return (
    <div className="lyrics-composer">
      <div className="lyrics-composer-head">
        <span>Start Lyrics Mode</span>
        <button type="button" onClick={onClose} aria-label="Close composer"><X size={18} /></button>
      </div>
      <p className="lyrics-composer-hint">Paste lyrics. Separate verses with a blank line.</p>
      <textarea
        className="lyrics-composer-input"
        placeholder={"Amazing grace, how sweet the sound\nThat saved a wretch like me\n\nI once was lost, but now am found\nWas blind, but now I see"}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        type="button"
        className="lyrics-composer-start"
        disabled={!text.trim()}
        onClick={() => {
          const verses = text
            .split(/\n\s*\n/)
            .map((v) => v.trim())
            .filter(Boolean);
          if (verses.length) onStart(verses);
        }}
      >
        <Music size={16} /> Start Worship Lyrics
      </button>
    </div>
  );
};

/**
 * Captions: LiveKit transcription streams (when server/agent sends them) +
 * browser Speech Recognition for your own mic (Chrome / Edge).
 */
const MeetCaptionsStrip = ({
  enabled,
  onClose,
}: {
  enabled: boolean;
  onClose: () => void;
}) => {
  const transcriptions = useTranscriptions();
  const [browserCaption, setBrowserCaption] = useState('');
  const [speechUnsupported, setSpeechUnsupported] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    const w = window as Window & {
      SpeechRecognition?: new () => unknown;
      webkitSpeechRecognition?: new () => unknown;
    };
    const SR = (w.SpeechRecognition || w.webkitSpeechRecognition) as
      | (new () => {
          continuous: boolean;
          interimResults: boolean;
          lang: string;
          onresult: ((ev: { resultIndex: number; results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } } }) => void) | null;
          onerror: (() => void) | null;
          start: () => void;
          stop: () => void;
        })
      | undefined;
    if (!SR) {
      setSpeechUnsupported(true);
      return;
    }
    setSpeechUnsupported(false);
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';
    let finals = '';
    rec.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finals += `${r[0].transcript} `;
        else interim += r[0].transcript;
      }
      setBrowserCaption(`${finals}${interim}`.trim());
    };
    rec.onerror = () => {};
    try {
      rec.start();
    } catch {
      /* ignore */
    }
    return () => {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    };
  }, [enabled]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [transcriptions, browserCaption, enabled]);

  if (!enabled) return null;

  const lkLines = transcriptions
    .map((t) => `${t.participantInfo?.identity ?? '?'}: ${t.text}`)
    .filter((line) => line.length > 2);

  return (
    <div className="meet-captions-strip" role="region" aria-label="Captions">
      <div className="meet-captions-strip-head">
        <span className="meet-captions-title">Captions</span>
        <button type="button" className="meet-captions-close" onClick={onClose} aria-label="Turn off captions">
          <X size={18} />
        </button>
      </div>
      <div className="meet-captions-body" ref={scrollRef}>
        {lkLines.map((line, i) => (
          <p key={`lk-${i}`} className="meet-captions-line meet-captions-lk">
            {line}
          </p>
        ))}
        {browserCaption ? (
          <p className="meet-captions-line meet-captions-local">
            <span className="meet-captions-label">You:</span> {browserCaption}
          </p>
        ) : null}
        {lkLines.length === 0 && !browserCaption && (
          <p className="meet-captions-hint">
            {speechUnsupported
              ? 'Room transcriptions will show here when the system sends them. Speech-to-text in the browser needs Chrome or Edge.'
              : 'Listening to your microphone… Room transcriptions also appear here when available.'}
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * Custom Chat Component for Google Meet Experience
 */
const CustomChat = ({ roomId }: { roomId: string }) => {
  const { chatMessages, send } = useChat();
  const [dbMessages, setDbMessages] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { localParticipant } = useLocalParticipant();

  // Fetch History from DB on Mount
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`/api/v1/chat?roomId=${roomId}`);
        const data = await response.json();
        if (data.success) {
          setDbMessages(data.messages);
        }
      } catch (error) {
        console.error("Failed to fetch chat history:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [roomId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, dbMessages, isLoading]);

  // Combine DB messages and Real-time messages (deduplicated)
  const allMessages = useMemo(() => {
    // Start with DB messages
    const combined = [...dbMessages];
    
    // Add real-time messages that aren't already in DB history
    // We check content + timestamp + identity to deduplicate
    chatMessages.forEach(msg => {
      const isDuplicate = combined.some(dbMsg => 
        dbMsg.content === msg.message && 
        new Date(dbMsg.timestamp).getTime() === msg.timestamp &&
        dbMsg.senderId === msg.from?.identity
      );
      if (!isDuplicate) {
        combined.push({
          _id: msg.timestamp.toString(),
          senderId: msg.from?.identity,
          senderName: msg.from?.identity === localParticipant.identity ? 'You' : (msg.from?.identity || 'Unknown'),
          content: msg.message,
          timestamp: msg.timestamp
        });
      }
    });

    return combined.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [dbMessages, chatMessages, localParticipant.identity]);

  const onSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (message.trim() && send) {
      const currentMessage = message;
      setMessage(''); // Clear input immediately for UX

      try {
        // 1. Send via LiveKit for real-time
        await send(currentMessage);

        // 2. Save to DB for persistence
        await fetch('/api/v1/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId,
            senderId: localParticipant.identity,
            senderName: localParticipant.identity || 'Unknown',
            content: currentMessage
          })
        });
      } catch (err) {
        console.error('Failed to send/save message:', err);
      }
    }
  };

  const onFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // allow re-picking same file later

    if (file.size > 25 * 1024 * 1024) {
      alert('File must be 25 MB or smaller');
      return;
    }

    setUploadingFile(file.name);
    try {
      // 1) Upload to Cloudinary via server route.
      const fd = new FormData();
      fd.append('file', file);
      fd.append('roomId', roomId);
      const uploadRes = await fetch('/api/v1/files/upload', { method: 'POST', body: fd });
      const uploadData = await uploadRes.json();
      if (!uploadData?.success) throw new Error(uploadData?.message || 'Upload failed');

      // 2) Persist as a chat message with file metadata.
      const persistRes = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          senderId: localParticipant.identity,
          senderName: localParticipant.identity || 'Unknown',
          content: '',
          fileUrl: uploadData.file.url,
          fileName: uploadData.file.fileName,
          fileType: uploadData.file.fileType,
          fileSize: uploadData.file.bytes,
        }),
      });
      const persistData = await persistRes.json();

      // 3) Local optimistic insert so the sender sees the file card immediately.
      if (persistData?.success && persistData.message) {
        setDbMessages((cur) => [...cur, persistData.message]);
      }
      // Note: we deliberately DON'T relay via LiveKit chat — that would double
      // the message for the sender (one bubble + one file card) and the dedup
      // check (content + timestamp + identity) doesn't match an empty-content
      // file row against a non-empty text hint. Receivers see the file card on
      // their next chat panel open. A `file:new` data-channel ping with chat
      // refetch is the cleaner long-term path; see notes in PROJECT.md.
    } catch (err: any) {
      alert(err?.message || 'Could not upload file');
    } finally {
      setUploadingFile(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 custom-scrollbar" ref={scrollRef}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a73e8]"></div>
          </div>
        ) : allMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="w-16 h-16 bg-[#F1F3F4] rounded-full flex items-center justify-center mb-4">
              <MessageSquare size={32} className="text-[#5F6368]" />
            </div>
            <p className="text-[#202124] font-medium text-sm">Messages are saved to the database and visible to everyone in the call</p>
          </div>
        ) : (
          allMessages.map((msg, i) => {
            const isLocal = msg.senderId === localParticipant.identity;
            const senderName = isLocal ? 'You' : msg.senderName;
            const timestamp = new Date(msg.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            const hasFile = !!msg.fileUrl;
            const isImage = hasFile && (msg.fileType || '').startsWith('image/');

            return (
              <div key={msg._id || i} className={`flex flex-col ${isLocal ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-baseline gap-2 mb-1 ${isLocal ? 'flex-row-reverse' : 'flex-row'}`}>
                  <span className="text-xs font-medium text-[#5F6368]">{senderName}</span>
                  <span className="text-[10px] text-[#70757A]">{timestamp}</span>
                </div>

                {/* Text bubble (when content exists) */}
                {msg.content && (
                  <div className={`chat-bubble ${isLocal ? 'chat-bubble-local' : 'chat-bubble-remote'} chat-bubble-on-light shadow-sm`}>
                    {msg.content}
                  </div>
                )}

                {/* File attachment */}
                {hasFile && (
                  isImage ? (
                    <a href={msg.fileUrl} target="_blank" rel="noopener" className="chat-file-image-link mt-1">
                      <img src={msg.fileUrl} alt={msg.fileName || 'image'} className="chat-file-image" />
                      <span className="chat-file-image-cap">{msg.fileName}</span>
                    </a>
                  ) : (
                    <a href={msg.fileUrl} target="_blank" rel="noopener" className="chat-file-card mt-1" download={msg.fileName || true}>
                      <span className="chat-file-icon" aria-hidden>📎</span>
                      <span className="chat-file-meta">
                        <span className="chat-file-name">{msg.fileName || 'file'}</span>
                        <span className="chat-file-size">
                          {typeof msg.fileSize === 'number' ? `${Math.max(1, Math.round(msg.fileSize / 1024))} KB` : 'download'}
                        </span>
                      </span>
                    </a>
                  )
                )}
              </div>
            );
          })
        )}
      </div>

      {uploadingFile && (
        <div className="chat-upload-banner">
          <span className="chat-upload-spinner" aria-hidden />
          Uploading <strong>{uploadingFile}</strong>…
        </div>
      )}
      <form onSubmit={onSend} className="p-4 bg-white border-t border-[#DADCE0] flex items-center gap-2">
        <button
          type="button"
          className="chat-attach-btn"
          title="Attach a file"
          aria-label="Attach a file"
          onClick={() => fileInputRef.current?.click()}
          disabled={!!uploadingFile}
        >
          <Paperclip size={18} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={onFilePicked}
          // Permissive accept: images, video, audio, pdf, docs, archives.
          accept="image/*,video/*,audio/*,application/pdf,application/zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
        />
        <div className="flex-1 relative">
          <input
            type="text"
            className="w-full bg-[#f1f3f4] text-[#202124] border-none rounded-full py-3 px-5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20 transition-all placeholder:text-[#5f6368]"
            placeholder="Send a message to everyone"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              message.trim() ? 'bg-[#1a73e8] text-white' : 'text-[#5f6368] cursor-not-allowed'
            }`}
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
};

/**
 * Sidebar Panel Component (Chat, People, Info)
 */
type SidePanel = 'chat' | 'people' | 'info' | 'notes' | 'bible' | 'waiting';

const sidebarTitle = (t: SidePanel) => {
  if (t === 'chat') return 'In-call messages';
  if (t === 'people') return 'People';
  if (t === 'notes') return 'Meeting notes';
  if (t === 'bible') return 'Bible';
  if (t === 'waiting') return 'Waiting room';
  return 'Meeting details';
};

interface WaitingEntry {
  key: string;
  displayName: string;
  userId?: string | null;
  createdAt?: string;
}

const isCohost = (p: { attributes?: Record<string, string> }) => p.attributes?.['lk_cohost'] === '1';

/**
 * MusicPlayer — host-only floating panel that plays an audio file to the whole
 * congregation as a SECOND LiveKit audio track (alongside the mic, so the host
 * can speak over the music).
 *
 * Pipeline: <audio> → audio.captureStream() → MediaStreamTrack →
 *           new LocalAudioTrack → localParticipant.publishTrack(...) with the
 *           music preset (stereo, no DTX, no DSP).
 *
 * Browser support: Chrome/Edge/Firefox have audio.captureStream(); Safari is
 * spotty. We detect at file-pick and surface a friendly error.
 */
interface LibrarySong {
  _id: string;
  title: string;
  artist: string;
  fileUrl: string;
  durationSec: number | null;
}

const MusicPlayer = ({
  localParticipant,
  workspaceId,
  onClose,
  onNowPlayingChange,
}: {
  localParticipant: any; // typed loosely to avoid LiveKit type churn
  workspaceId?: string | null;
  onClose: () => void;
  onNowPlayingChange: (title: string | null) => void;
}) => {
  const { toast } = useToast();
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.6);
  const [tab, setTab] = useState<'library' | 'local'>(workspaceId ? 'library' : 'local');
  const [library, setLibrary] = useState<LibrarySong[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const trackRef = useRef<LocalAudioTrack | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch the workspace's library on mount + when workspace changes.
  useEffect(() => {
    if (!workspaceId) return;
    setLibraryLoading(true);
    fetch(`/api/v1/songs?workspace_id=${encodeURIComponent(workspaceId)}&limit=200`)
      .then((r) => r.json())
      .then((data) => { if (data?.success) setLibrary(data.songs || []); })
      .catch((e) => console.error('library fetch failed', e))
      .finally(() => setLibraryLoading(false));
  }, [workspaceId]);

  // Cleanup on unmount: stop playback, revoke blob URL, unpublish track.
  useEffect(() => {
    return () => {
      try { audioRef.current?.pause(); } catch { /* ignore */ }
      try {
        if (trackRef.current) {
          localParticipant?.unpublishTrack?.(trackRef.current);
          trackRef.current.stop?.();
          trackRef.current = null;
        }
      } catch { /* ignore */ }
      try { if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current); } catch { /* ignore */ }
      onNowPlayingChange(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (s: number) => {
    if (!Number.isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  // Internal: prep an Audio element from any source (blob URL or remote URL).
  const loadAudioSource = (src: string, displayName: string, isBlob: boolean) => {
    const probe = document.createElement('audio');
    if (typeof (probe as any).captureStream !== 'function') {
      toast({
        title: 'Browser not supported',
        description: 'Music Player needs Chrome, Edge, or Firefox.',
        variant: 'destructive',
      });
      return;
    }

    const audio = new Audio();
    audio.src = src;
    audio.crossOrigin = 'anonymous'; // required so captureStream can read remote audio
    audio.volume = volume;
    audio.preload = 'auto';
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
    audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      onNowPlayingChange(null);
    });
    audioRef.current = audio;
    if (isBlob) objectUrlRef.current = src;
    setFileName(displayName);
    setIsPlaying(false);
  };

  const onFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    stop();
    const url = URL.createObjectURL(file);
    loadAudioSource(url, file.name, true);
  };

  const pickFromLibrary = (song: LibrarySong) => {
    stop();
    const display = song.artist ? `${song.title} — ${song.artist}` : song.title;
    loadAudioSource(song.fileUrl, display, false);
  };

  const play = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      await audio.play();
      setIsPlaying(true);

      // Publish the audio stream as a LiveKit track if not already published.
      if (!trackRef.current) {
        const stream = (audio as any).captureStream() as MediaStream;
        const audioTrack = stream.getAudioTracks()[0];
        if (!audioTrack) throw new Error('No audio track available from this file');

        const lkTrack = new LocalAudioTrack(audioTrack, undefined, false);
        await localParticipant.publishTrack(lkTrack, {
          name: 'music',
          source: Track.Source.ScreenShareAudio, // closest semantic match in LiveKit's enum
          audioPreset: AudioPresets.musicHighQualityStereo,
          dtx: false,
          red: false,
          forceStereo: true,
        });
        trackRef.current = lkTrack;
      }

      onNowPlayingChange(fileName);
    } catch (e: any) {
      toast({
        title: 'Could not start music',
        description: e?.message || 'Try a different file.',
        variant: 'destructive',
      });
      setIsPlaying(false);
    }
  };

  const pause = () => {
    audioRef.current?.pause();
    setIsPlaying(false);
  };

  const stop = () => {
    try { audioRef.current?.pause(); } catch { /* ignore */ }
    try {
      if (trackRef.current) {
        localParticipant?.unpublishTrack?.(trackRef.current);
        trackRef.current.stop?.();
        trackRef.current = null;
      }
    } catch { /* ignore */ }
    try { if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current); } catch { /* ignore */ }
    objectUrlRef.current = null;
    audioRef.current = null;
    setFileName(null);
    setIsPlaying(false);
    setDuration(0);
    setCurrentTime(0);
    onNowPlayingChange(null);
  };

  const seek = (sec: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = sec;
    setCurrentTime(sec);
  };

  const setVol = (v: number) => {
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  };

  return (
    <div className="music-player">
      <div className="music-player-head">
        <span className="music-player-title">
          <FileMusic size={16} className="text-deep-gold" /> Music Player
        </span>
        <button type="button" onClick={onClose} aria-label="Close" className="music-player-close">
          <X size={16} />
        </button>
      </div>

      <div className="music-player-body">
        {!fileName ? (
          <>
            {workspaceId && (
              <div className="music-player-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'library'}
                  onClick={() => setTab('library')}
                  className={`music-player-tab ${tab === 'library' ? 'is-active' : ''}`}
                >
                  Library {library.length > 0 && <span className="music-player-tab-count">{library.length}</span>}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'local'}
                  onClick={() => setTab('local')}
                  className={`music-player-tab ${tab === 'local' ? 'is-active' : ''}`}
                >
                  Local file
                </button>
              </div>
            )}

            {tab === 'library' && workspaceId ? (
              libraryLoading ? (
                <p className="music-player-pick-hint" style={{ textAlign: 'center', padding: '24px 0' }}>Loading library…</p>
              ) : library.length === 0 ? (
                <div className="music-player-empty">
                  <FileMusic size={20} className="text-deep-gold opacity-60" />
                  <p>No songs in your library yet.</p>
                  <a href="/dashboard/songs" target="_blank" rel="noopener" className="music-player-empty-link">
                    Add songs in the library →
                  </a>
                </div>
              ) : (
                <ul className="music-player-library">
                  {library.map((s) => (
                    <li key={s._id}>
                      <button type="button" onClick={() => pickFromLibrary(s)} className="music-player-library-item">
                        <Play size={14} className="text-deep-gold" />
                        <span className="music-player-library-title">{s.title}</span>
                        {s.artist && <span className="music-player-library-artist">— {s.artist}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <button type="button" className="music-player-pick" onClick={() => fileInputRef.current?.click()}>
                <FileMusic size={20} />
                <span>Pick an audio file</span>
                <span className="music-player-pick-hint">MP3, WAV, OGG — anything your browser can play</span>
              </button>
            )}
          </>
        ) : (
          <>
            <div className="music-player-now">
              <div className="music-player-now-label">Now playing</div>
              <div className="music-player-now-name" title={fileName}>{fileName}</div>
            </div>

            <input
              type="range"
              className="music-player-seek"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={(e) => seek(Number(e.target.value))}
            />
            <div className="music-player-times">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>

            <div className="music-player-transport">
              {isPlaying ? (
                <button type="button" onClick={pause} className="music-player-play" title="Pause">
                  <Pause size={20} />
                </button>
              ) : (
                <button type="button" onClick={play} className="music-player-play" title="Play">
                  <Play size={20} />
                </button>
              )}
              <button type="button" onClick={stop} className="music-player-stop" title="Stop & unload">
                Stop
              </button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="music-player-change" title="Pick another file">
                Change file
              </button>
            </div>

            <label className="music-player-vol">
              <Volume2 size={14} className="text-deep-gold" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => setVol(Number(e.target.value))}
                aria-label="Host monitor volume"
              />
              <span className="music-player-vol-hint">Your monitor — congregation volume is independent</span>
            </label>
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="audio/*"
          onChange={onFilePicked}
        />
      </div>
    </div>
  );
};

/**
 * Breakout session shape (mirror of breakoutSessionModel).
 */
interface BreakoutGroup { index: number; name: string; roomId: string; }
interface BreakoutSessionShape {
  _id: string;
  parentRoomId: string;
  hostUserId: string;
  groups: BreakoutGroup[];
  // userId → groupIndex (1..N). Mongo serializes Maps as plain objects.
  assignments?: Record<string, number>;
  status: 'active' | 'closed';
  openedAt: string;
}

// Lightweight roster row used by the host assignment UI.
interface BreakoutRosterEntry { userId: string; name: string; }

/**
 * BreakoutStarter — host-only modal to configure groups + (optionally)
 * pre-assign specific participants to specific groups. Unassigned
 * participants still see the picker once breakouts open.
 */
const BreakoutStarter = ({
  onStart,
  onClose,
  roster,
  hostUserId,
}: {
  onStart: (groups: { name: string }[], assignments: Record<string, number>) => Promise<void>;
  onClose: () => void;
  roster: BreakoutRosterEntry[];
  hostUserId: string | null | undefined;
}) => {
  const [count, setCount] = useState(3);
  const [names, setNames] = useState<string[]>(['Group 1', 'Group 2', 'Group 3']);
  const [assignments, setAssignments] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const setGroupCount = (n: number) => {
    const safe = Math.max(2, Math.min(12, n));
    setCount(safe);
    setNames((cur) => {
      const next = [...cur];
      while (next.length < safe) next.push(`Group ${next.length + 1}`);
      return next.slice(0, safe);
    });
    // Drop assignments that point at groups that no longer exist.
    setAssignments((cur) => {
      const next: Record<string, number> = {};
      for (const [uid, idx] of Object.entries(cur)) {
        if (idx >= 1 && idx <= safe) next[uid] = idx;
      }
      return next;
    });
  };

  const updateName = (idx: number, value: string) => {
    setNames((cur) => cur.map((n, i) => (i === idx ? value : n)));
  };

  const setAssignment = (userId: string, groupIndex: number) => {
    setAssignments((cur) => {
      const next = { ...cur };
      if (groupIndex === 0) delete next[userId];
      else next[userId] = groupIndex;
      return next;
    });
  };

  // Round-robin over the roster (excluding the host themselves).
  const autoDistribute = () => {
    const next: Record<string, number> = {};
    const targets = roster.filter((p) => p.userId && p.userId !== hostUserId);
    targets.forEach((p, i) => { next[p.userId] = (i % count) + 1; });
    setAssignments(next);
  };

  const clearAssignments = () => setAssignments({});

  // Hide the host from the pre-assign list — they're the one running the
  // breakout, not a candidate to be put in a group.
  const assignableRoster = roster.filter((p) => p.userId && p.userId !== hostUserId);

  return (
    <div className="worship-modal-backdrop" onClick={onClose}>
      <div className="worship-modal breakout-starter-modal" onClick={(e) => e.stopPropagation()}>
        <div className="worship-modal-head">
          <span>👥 Open Breakout Rooms</span>
          <button type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <p className="worship-modal-hint">Split the room into smaller circles. Pre-assign people if you want, or leave them to pick.</p>

        <label className="altar-prompt-label">Number of groups (2–12)</label>
        <div className="breakout-count-row">
          <button type="button" onClick={() => setGroupCount(count - 1)} disabled={count <= 2} className="breakout-count-btn">−</button>
          <span className="breakout-count-num">{count}</span>
          <button type="button" onClick={() => setGroupCount(count + 1)} disabled={count >= 12} className="breakout-count-btn">+</button>
        </div>

        <label className="altar-prompt-label">Group names</label>
        <div className="breakout-name-list">
          {Array.from({ length: count }).map((_, i) => (
            <input
              key={i}
              type="text"
              value={names[i] || ''}
              onChange={(e) => updateName(i, e.target.value)}
              className="breakout-name-input"
              maxLength={60}
              placeholder={`Group ${i + 1}`}
            />
          ))}
        </div>

        {assignableRoster.length > 0 && (
          <>
            <div className="breakout-roster-head">
              <label className="altar-prompt-label" style={{ margin: 0 }}>Pre-assign participants ({assignableRoster.length})</label>
              <div className="breakout-roster-actions">
                <button type="button" className="breakout-roster-btn" onClick={autoDistribute}>Auto-distribute</button>
                <button type="button" className="breakout-roster-btn" onClick={clearAssignments}>Clear all</button>
              </div>
            </div>
            <div className="breakout-roster-list">
              {assignableRoster.map((p) => (
                <div key={p.userId} className="breakout-roster-row">
                  <span className="breakout-roster-name" title={p.name}>{p.name}</span>
                  <select
                    className="breakout-roster-select"
                    value={assignments[p.userId] || 0}
                    onChange={(e) => setAssignment(p.userId, Number(e.target.value))}
                    disabled={!p.userId}
                  >
                    <option value={0}>— let them pick —</option>
                    {Array.from({ length: count }).map((_, i) => (
                      <option key={i + 1} value={i + 1}>{names[i] || `Group ${i + 1}`}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </>
        )}

        <button
          type="button"
          className="worship-modal-cta"
          disabled={submitting}
          onClick={async () => {
            setSubmitting(true);
            await onStart(
              names.slice(0, count).map((name, i) => ({ name: name.trim() || `Group ${i + 1}` })),
              assignments,
            );
            setSubmitting(false);
          }}
        >
          {submitting ? 'Opening…' : 'Open Breakouts'}
        </button>
      </div>
    </div>
  );
};

/**
 * BreakoutPicker — shown to non-host participants who haven't been pre-assigned
 * to a group. Click a group → router pushes to the child meeting URL.
 */
const BreakoutPicker = ({
  session,
  parentRoomId,
}: {
  session: BreakoutSessionShape;
  parentRoomId: string;
}) => {
  const router = useRouter();

  const join = (group: BreakoutGroup) => {
    router.push(`/meeting/${encodeURIComponent(group.roomId)}?parent=${encodeURIComponent(parentRoomId)}`);
  };

  return (
    <div className="worship-modal-backdrop">
      <div className="worship-modal breakout-picker" onClick={(e) => e.stopPropagation()}>
        <div className="worship-modal-head">
          <span>👥 Pick a Group</span>
        </div>
        <p className="worship-modal-hint">Tap a group to join. You can always return to the main service.</p>
        <div className="breakout-grid">
          {session.groups.map((g) => (
            <button
              key={g.index}
              type="button"
              className="breakout-tile"
              onClick={() => join(g)}
            >
              <span className="breakout-tile-num">{g.index}</span>
              <span className="breakout-tile-name">{g.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * BreakoutManagePanel — host-only control surface shown while a breakout is
 * active. Lists every known participant by current group, lets the host
 * force-move them via a per-chip menu, and provides jump pills so the host
 * can hop directly into any group (or back to Main) in one click.
 *
 * Roster: union of (a) participants currently visible in the host's LiveKit
 * room and (b) anyone we have an assignment for. This way assigned users who
 * are off in a child room still appear and can be moved without the host
 * having to chase them across rooms.
 */
const BreakoutManagePanel = ({
  session,
  parentRoomId,
  currentRoomId,
  roster,
  hostUserId,
  onAssign,
  onClose,
}: {
  session: BreakoutSessionShape;
  parentRoomId: string;
  currentRoomId: string;
  roster: BreakoutRosterEntry[];
  hostUserId: string | null | undefined;
  onAssign: (userId: string, groupIndex: number) => Promise<void>;
  onClose: () => void;
}) => {
  const router = useRouter();
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);

  // Merge roster with anyone-we-have-an-assignment-for, so absent users still show.
  const assignments = session.assignments || {};
  const merged = useMemo(() => {
    const byId = new Map<string, BreakoutRosterEntry>();
    for (const p of roster) if (p.userId) byId.set(p.userId, p);
    for (const uid of Object.keys(assignments)) {
      if (!byId.has(uid)) byId.set(uid, { userId: uid, name: uid });
    }
    return Array.from(byId.values());
  }, [roster, assignments]);

  // Bucket: 0 = Main, 1..N = group index.
  const buckets = new Map<number, BreakoutRosterEntry[]>();
  buckets.set(0, []);
  for (const g of session.groups) buckets.set(g.index, []);
  for (const p of merged) {
    const idx = assignments[p.userId] || 0;
    (buckets.get(idx) || buckets.get(0)!).push(p);
  }

  const jumpTo = (roomId: string) => {
    if (roomId === currentRoomId) return;
    if (roomId === parentRoomId) router.push(`/meeting/${encodeURIComponent(parentRoomId)}`);
    else router.push(`/meeting/${encodeURIComponent(roomId)}?parent=${encodeURIComponent(parentRoomId)}`);
  };

  const renderColumn = (idx: number, title: string, roomId: string) => (
    <div key={idx} className={`breakout-manage-col ${currentRoomId === roomId ? 'is-here' : ''}`}>
      <div className="breakout-manage-col-head">
        <span className="breakout-manage-col-title">{title}</span>
        <button
          type="button"
          className="breakout-manage-jump"
          onClick={() => jumpTo(roomId)}
          disabled={currentRoomId === roomId}
          title={currentRoomId === roomId ? 'You are here' : `Jump to ${title}`}
        >
          {currentRoomId === roomId ? 'Here' : 'Go'}
        </button>
      </div>
      <div className="breakout-manage-col-body">
        {(buckets.get(idx) || []).length === 0 && (
          <div className="breakout-manage-empty">— empty —</div>
        )}
        {(buckets.get(idx) || []).map((p) => (
          <div key={p.userId} className="breakout-manage-chip">
            <span className="breakout-manage-chip-name" title={p.name}>{p.name}</span>
            <button
              type="button"
              className="breakout-manage-chip-menu"
              onClick={() => setOpenMenuFor(openMenuFor === p.userId ? null : p.userId)}
              aria-label="Move participant"
              title="Move"
            >
              ⋯
            </button>
            {openMenuFor === p.userId && (
              <div className="breakout-manage-menu" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="breakout-manage-menu-item"
                  disabled={idx === 0}
                  onClick={async () => { await onAssign(p.userId, 0); setOpenMenuFor(null); }}
                >
                  Move to Main
                </button>
                {session.groups.map((g) => (
                  <button
                    key={g.index}
                    type="button"
                    className="breakout-manage-menu-item"
                    disabled={idx === g.index}
                    onClick={async () => { await onAssign(p.userId, g.index); setOpenMenuFor(null); }}
                  >
                    Move to {g.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="breakout-manage-panel" onClick={() => setOpenMenuFor(null)}>
      <div className="breakout-manage-head">
        <span>👥 Breakout — Host Controls</span>
        <div className="breakout-manage-head-actions">
          <button type="button" onClick={onClose} className="breakout-close-x" title="Close all breakouts">
            Close all
          </button>
        </div>
      </div>
      <div className="breakout-manage-jump-row">
        <span className="breakout-manage-jump-label">Jump:</span>
        <button
          type="button"
          className={`breakout-manage-pill ${currentRoomId === parentRoomId ? 'is-here' : ''}`}
          onClick={() => jumpTo(parentRoomId)}
          disabled={currentRoomId === parentRoomId}
        >
          Main
        </button>
        {session.groups.map((g) => (
          <button
            key={g.index}
            type="button"
            className={`breakout-manage-pill ${currentRoomId === g.roomId ? 'is-here' : ''}`}
            onClick={() => jumpTo(g.roomId)}
            disabled={currentRoomId === g.roomId}
          >
            {g.name}
          </button>
        ))}
      </div>
      <div className="breakout-manage-cols">
        {renderColumn(0, 'Main service', parentRoomId)}
        {session.groups.map((g) => renderColumn(g.index, g.name, g.roomId))}
      </div>
      <p className="breakout-manage-hint">Tap ⋯ on a participant to move them. Moves take effect within ~5 seconds on their device.</p>
    </div>
  );
};

/**
 * Altar Call data shape used across the in-call UI.
 */
interface AltarCallResponder {
  userId: string | null;
  name: string;
  note: string;
  respondedAt: string;
}
interface AltarCallShape {
  _id: string;
  roomId: string;
  type: string;
  prompt: string;
  status: 'active' | 'closed';
  responders: AltarCallResponder[];
  startedAt: string;
}

const ALTAR_PRESETS: { id: string; label: string; prompt: string; emoji: string }[] = [
  { id: 'salvation',    label: 'Salvation',     prompt: 'Come forward to give your life to Jesus.', emoji: '✝️' },
  { id: 'rededication', label: 'Rededication',  prompt: 'Step forward to rededicate your life to the Lord.', emoji: '🙌' },
  { id: 'healing',      label: 'Healing',       prompt: 'Come and receive prayer for healing.', emoji: '💫' },
  { id: 'prayer',       label: 'Prayer',        prompt: 'Come forward — we will pray with you.', emoji: '🙏' },
  { id: 'baptism',      label: 'Baptism',       prompt: 'Respond if the Spirit is moving you to take the next step in baptism.', emoji: '💧' },
];

/**
 * AltarCallStarter — host-only modal to launch an altar call.
 */
const AltarCallStarter = ({
  onStart,
  onClose,
}: {
  onStart: (type: string, prompt: string) => void;
  onClose: () => void;
}) => {
  const [type, setType] = useState<string>('salvation');
  const [prompt, setPrompt] = useState<string>(ALTAR_PRESETS[0].prompt);
  const [submitting, setSubmitting] = useState(false);

  const setPreset = (preset: typeof ALTAR_PRESETS[number]) => {
    setType(preset.id);
    setPrompt(preset.prompt);
  };

  return (
    <div className="worship-modal-backdrop" onClick={onClose}>
      <div className="worship-modal" onClick={(e) => e.stopPropagation()}>
        <div className="worship-modal-head">
          <span>✝️ Call to Altar</span>
          <button type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <p className="worship-modal-hint">Invite the congregation forward. Pick a moment.</p>
        <div className="altar-presets">
          {ALTAR_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreset(p)}
              className={`altar-preset ${type === p.id ? 'is-active' : ''}`}
            >
              <span className="altar-preset-emoji">{p.emoji}</span>
              <span className="altar-preset-label">{p.label}</span>
            </button>
          ))}
        </div>
        <label className="altar-prompt-label">Invitation</label>
        <textarea
          className="worship-modal-input"
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          maxLength={500}
        />
        <button
          type="button"
          className="worship-modal-cta"
          disabled={!prompt.trim() || submitting}
          onClick={async () => {
            setSubmitting(true);
            await onStart(type, prompt.trim());
            setSubmitting(false);
            onClose();
          }}
        >
          {submitting ? 'Calling…' : 'Open Altar'}
        </button>
      </div>
    </div>
  );
};

/**
 * AltarCallOverlay — visible to everyone when an altar call is active.
 * Hosts see live responder list + close button. Members see prompt + Respond button.
 */
const AltarCallOverlay = ({
  call,
  isHost,
  selfUserId,
  selfName,
  onClose,
  onRefresh,
}: {
  call: AltarCallShape;
  isHost: boolean;
  selfUserId?: string;
  selfName: string;
  onClose: () => void;
  onRefresh: () => void;
}) => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [hasResponded, setHasResponded] = useState(false);
  const [note, setNote] = useState('');

  // Detect if the local user has already responded.
  useEffect(() => {
    if (!selfUserId) return;
    setHasResponded(call.responders.some((r) => r.userId === selfUserId));
  }, [call.responders, selfUserId]);

  const respond = async () => {
    if (submitting || hasResponded) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/altar-call/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: call._id, userId: selfUserId || null, name: selfName, note }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not record response');
      setHasResponded(true);
      // Local broadcast hint — parent will fan it out.
      window.dispatchEvent(new CustomEvent('singalong:altar-response', { detail: { name: selfName } }));
      onRefresh();
      toast({
        title: '✝️ Thank you',
        description: 'Your response has been received.',
        className: 'bg-white/10 border-none text-white',
      });
    } catch (e: any) {
      toast({ title: 'Could not record response', description: e?.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="altar-overlay" role="region" aria-label="Altar Call">
      <div className="altar-overlay-rays" aria-hidden />
      <div className="altar-overlay-card">
        <Cross size={36} className="altar-overlay-cross" aria-hidden />
        <div className="altar-overlay-eyebrow">CALL TO ALTAR</div>
        <h2 className="altar-overlay-prompt">{call.prompt}</h2>

        {!isHost && (
          hasResponded ? (
            <div className="altar-responded">
              <span className="altar-responded-mark">✓</span>
              <p>You've responded. Be blessed.</p>
            </div>
          ) : (
            <div className="altar-respond-block">
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note for the pastor (e.g. 'asking for healing')"
                className="altar-respond-note"
                maxLength={300}
              />
              <button
                type="button"
                className="altar-respond-btn"
                onClick={respond}
                disabled={submitting}
              >
                {submitting ? 'Responding…' : 'I Respond 🙌'}
              </button>
            </div>
          )
        )}

        {isHost && (
          <div className="altar-host-block">
            <div className="altar-host-count">
              <span className="altar-host-count-num">{call.responders.length}</span>
              <span className="altar-host-count-label">
                {call.responders.length === 1 ? 'person responding' : 'people responding'}
              </span>
            </div>
            <div className="altar-responders">
              {call.responders.length === 0 ? (
                <p className="altar-responders-empty">Waiting for responses…</p>
              ) : (
                <ul>
                  {call.responders.slice().reverse().map((r, i) => (
                    <li key={`${r.userId || r.name}-${i}`} className="altar-responder">
                      <span className="altar-responder-name">{r.name}</span>
                      {r.note && <span className="altar-responder-note">"{r.note}"</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button type="button" className="altar-close-btn" onClick={onClose}>
              Close Altar Call
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Bible Panel — multi-translation lookup for Worship / Hybrid sessions.
 * Host can "Share with everyone" → broadcast `bible:share` over LiveKit
 * data channel so every participant's panel jumps to the same passage.
 */
const BIBLE_TRANSLATIONS: { id: string; name: string }[] = [
  { id: 'kjv',  name: 'King James Version' },
  { id: 'web',  name: 'World English Bible' },
  { id: 'asv',  name: 'American Standard' },
  { id: 'bsb',  name: 'Berean Standard' },
  { id: 'ylt',  name: "Young's Literal" },
  { id: 'darby', name: 'Darby Translation' },
  { id: 'oeb-cw', name: 'Open English (Commonwealth)' },
  { id: 'bbe',  name: 'Bible in Basic English' },
];

interface BibleVerse {
  reference: string;
  text: string;
  translation: string;
  translationName: string;
  verses: { book: string; chapter: number; verse: number; text: string }[];
}

const BiblePanel = ({
  isHost,
  initialPassage,
  onShare,
  onClearShared,
}: {
  isHost: boolean;
  initialPassage: { ref: string; translation: string } | null;
  onShare: (verse: BibleVerse) => void;
  onClearShared: () => void;
}) => {
  const { toast } = useToast();
  const [reference, setReference] = useState(initialPassage?.ref || 'John 3:16');
  const [translation, setTranslation] = useState(initialPassage?.translation || 'kjv');
  const [verse, setVerse] = useState<BibleVerse | null>(null);
  const [loading, setLoading] = useState(false);

  // Re-fetch when the host shares a different passage to all viewers.
  useEffect(() => {
    if (!initialPassage) return;
    setReference(initialPassage.ref);
    setTranslation(initialPassage.translation);
  }, [initialPassage]);

  const lookup = useCallback(async (refArg?: string, transArg?: string) => {
    const r = (refArg ?? reference).trim();
    const t = (transArg ?? translation).trim();
    if (!r) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/bible/verse?ref=${encodeURIComponent(r)}&translation=${encodeURIComponent(t)}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Lookup failed');
      setVerse(data);
    } catch (e: any) {
      toast({ title: 'Verse not found', description: e?.message, variant: 'destructive' });
      setVerse(null);
    } finally {
      setLoading(false);
    }
  }, [reference, translation, toast]);

  // Auto-load on mount + whenever shared passage changes.
  useEffect(() => {
    if (initialPassage) lookup(initialPassage.ref, initialPassage.translation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPassage?.ref, initialPassage?.translation]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    lookup();
  };

  const share = () => {
    if (!verse) return;
    onShare(verse);
    toast({
      title: '📖 Shared with everyone',
      description: verse.reference,
      className: 'bg-white/10 border-none text-white',
    });
  };

  return (
    <div className="bible-panel">
      <form onSubmit={onSubmit} className="bible-panel-form">
        <select
          value={translation}
          onChange={(e) => { setTranslation(e.target.value); }}
          className="bible-panel-select"
          aria-label="Translation"
        >
          {BIBLE_TRANSLATIONS.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <div className="bible-panel-input-row">
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. John 3:16 or Psalm 23"
            className="bible-panel-input"
          />
          <button type="submit" className="bible-panel-go" disabled={loading || !reference.trim()}>
            {loading ? '…' : 'Go'}
          </button>
        </div>
      </form>

      <div className="bible-panel-body">
        {!verse ? (
          <div className="bible-panel-empty">
            <BookOpen size={28} className="opacity-40 mb-2" />
            <p>Look up any passage. Try <code className="bible-panel-code">Romans 8:28</code>, <code className="bible-panel-code">Psalm 23</code>, or <code className="bible-panel-code">Matthew 5:1-12</code>.</p>
          </div>
        ) : (
          <>
            <div className="bible-panel-meta">
              <span className="bible-panel-ref">{verse.reference}</span>
              <span className="bible-panel-translation">{verse.translationName}</span>
            </div>
            <div className="bible-panel-text">
              {verse.verses && verse.verses.length > 0 ? (
                verse.verses.map((v) => (
                  <p key={`${v.chapter}-${v.verse}`} className="bible-panel-verse">
                    <span className="bible-panel-num">{v.verse}</span>
                    <span>{v.text}</span>
                  </p>
                ))
              ) : (
                <p className="bible-panel-verse"><span>{verse.text}</span></p>
              )}
            </div>
            {isHost && (
              <div className="bible-panel-host-actions">
                <button type="button" className="bible-panel-share" onClick={share}>
                  <Share2 size={14} /> Share with everyone
                </button>
                <button type="button" className="bible-panel-clear" onClick={onClearShared}>
                  Clear
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

/**
 * Meeting Notes panel — shared timestamped log for Business / Hybrid sessions.
 * Anyone in the call can add an entry; host can pin or delete; author can delete own.
 */
interface MeetingNote {
  _id: string;
  roomId: string;
  authorUserId: string | null;
  authorName: string;
  content: string;
  pinned: boolean;
  timestamp: string;
}

const NotesPanel = ({
  roomId,
  authorUserId,
  authorName,
  isHost,
  notesBumpKey,
}: {
  roomId: string;
  authorUserId?: string;
  authorName: string;
  isHost: boolean;
  notesBumpKey: number; // increments when a note:new ping arrives → triggers refetch
}) => {
  const { toast } = useToast();
  const [notes, setNotes] = useState<MeetingNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [composer, setComposer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/notes?roomId=${encodeURIComponent(roomId)}`);
      const data = await res.json();
      if (data?.success) setNotes(data.notes || []);
    } catch (e) {
      console.error('notes fetch failed', e);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => { fetchNotes(); }, [fetchNotes, notesBumpKey]);

  // Auto-scroll to newest entry on growth.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [notes.length]);

  const submit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = composer.trim();
    if (!content || submitting) return;
    setSubmitting(true);
    setComposer('');
    try {
      const res = await fetch('/api/v1/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, authorUserId, authorName, content }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed');
      setNotes((cur) => [...cur, data.note]);
      // Broadcast handled by parent via prop callback if it passes one;
      // for simplicity, the listener side just polls when the bump key changes.
      // We push a manual bump via window event.
      window.dispatchEvent(new CustomEvent('singalong:note-broadcast'));
    } catch (e: any) {
      toast({ title: 'Could not save note', description: e?.message, variant: 'destructive' });
      setComposer(content); // restore
    } finally {
      setSubmitting(false);
    }
  };

  const togglePin = async (note: MeetingNote) => {
    if (!isHost || !authorUserId) return;
    setBusyId(note._id);
    try {
      const res = await fetch('/api/v1/notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: note._id, callerUserId: authorUserId, pinned: !note.pinned }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed');
      setNotes((cur) =>
        cur.map((n) => (n._id === note._id ? { ...n, pinned: !note.pinned } : n))
           .sort((a, b) => Number(b.pinned) - Number(a.pinned) ||
                           new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      );
    } catch (e: any) {
      toast({ title: 'Could not update pin', description: e?.message, variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (note: MeetingNote) => {
    if (!authorUserId) return;
    if (typeof window !== 'undefined' && !window.confirm('Delete this note?')) return;
    setBusyId(note._id);
    try {
      const res = await fetch('/api/v1/notes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: note._id, callerUserId: authorUserId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed');
      setNotes((cur) => cur.filter((n) => n._id !== note._id));
    } catch (e: any) {
      toast({ title: 'Could not delete', description: e?.message, variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="meet-notes-host">
      <div className="meet-notes-list" ref={scrollRef}>
        {loading ? (
          <div className="meet-notes-empty">Loading…</div>
        ) : notes.length === 0 ? (
          <div className="meet-notes-empty">
            <p>📝 No notes yet.</p>
            <p className="meet-notes-empty-hint">Capture decisions, action items, or links — they're saved with the meeting.</p>
          </div>
        ) : (
          notes.map((n) => {
            const ts = new Date(n.timestamp);
            const isMine = !!(authorUserId && n.authorUserId === authorUserId);
            const canDelete = isMine || isHost;
            return (
              <div key={n._id} className={`meet-note-row ${n.pinned ? 'is-pinned' : ''}`}>
                {n.pinned && <div className="meet-note-pin-flag">📌 Pinned</div>}
                <div className="meet-note-head">
                  <span className="meet-note-author">{n.authorName}{isMine && <span className="meet-note-you"> (you)</span>}</span>
                  <span className="meet-note-time">{ts.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                </div>
                <div className="meet-note-body">{n.content}</div>
                <div className="meet-note-actions">
                  {isHost && (
                    <button type="button" disabled={busyId === n._id} onClick={() => togglePin(n)} className="meet-note-action">
                      {n.pinned ? 'Unpin' : 'Pin'}
                    </button>
                  )}
                  {canDelete && (
                    <button type="button" disabled={busyId === n._id} onClick={() => remove(n)} className="meet-note-action meet-note-action-danger">
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      <form onSubmit={submit} className="meet-notes-composer">
        <textarea
          rows={2}
          value={composer}
          onChange={(e) => setComposer(e.target.value)}
          placeholder="Add a note for everyone…"
          maxLength={4000}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button type="submit" disabled={!composer.trim() || submitting}>
          {submitting ? 'Saving…' : 'Add note'}
        </button>
      </form>
    </div>
  );
};

const SidebarPanel = ({
  type,
  onClose,
  participants,
  room,
  isHost,
  callerUserId,
  authorName,
  notesBumpKey,
  isWorshipMode,
  sharedBible,
  onShareBible,
  onClearSharedBible,
  waitingEntries,
  onAdmitGuest,
  onDenyGuest,
  waitingBusyKey,
  allowAnyone,
  allowAnyoneBusy,
  onToggleAllowAnyone,
}: {
  type: SidePanel;
  onClose: () => void;
  participants: Participant[];
  room: string;
  isHost: boolean;
  callerUserId?: string;
  authorName?: string;
  notesBumpKey: number;
  isWorshipMode: boolean;
  sharedBible: { ref: string; translation: string } | null;
  onShareBible: (verse: BibleVerse) => void;
  onClearSharedBible: () => void;
  waitingEntries: WaitingEntry[];
  onAdmitGuest: (key: string) => void;
  onDenyGuest: (key: string) => void;
  waitingBusyKey: string | null;
  allowAnyone: boolean;
  allowAnyoneBusy: boolean;
  onToggleAllowAnyone: (next: boolean) => void;
}) => {
  const { toast } = useToast();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const meetingUrl = typeof window !== 'undefined' ? window.location.href : '';

  const moderate = async (
    action: 'mute' | 'mute-mic' | 'unmute-mic' | 'mute-camera' | 'unmute-camera' | 'remove' | 'promote' | 'demote',
    targetIdentity: string,
  ) => {
    if (!callerUserId) {
      toast({ title: 'Sign in required for moderation', variant: 'destructive' });
      return;
    }
    if (action === 'unmute-mic' || action === 'unmute-camera') {
      toast({
        title: action === 'unmute-mic'
          ? "You can't unmute participants — they must unmute themselves"
          : "You can't turn on a participant's camera — they must enable it themselves",
        className: 'bg-white/10 border-none text-white',
      });
      return;
    }
    const key = `${action}:${targetIdentity}`;
    setBusyAction(key);
    try {
      const res = await fetch('/api/livekit/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, room, targetIdentity, callerUserId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Action failed');
      const labels: Record<string, string> = {
        mute: '🔇 Muted mic',
        'mute-mic': '🔇 Muted mic',
        'unmute-mic': '🎙️ Unmuted mic',
        'mute-camera': '📷 Stopped video',
        'unmute-camera': '📹 Started video',
        remove: 'Removed from worship',
        promote: '✨ Promoted to co-host',
        demote: 'Demoted to member',
      };
      toast({
        title: labels[action] || 'Done',
        description: targetIdentity,
        className: 'bg-white/10 border-none text-white',
      });
    } catch (e: any) {
      toast({
        title: 'Could not complete action',
        description: e?.message || 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const copyJoiningInfo = async () => {
    try {
      await navigator.clipboard.writeText(meetingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const isLightPanel = type === 'chat';

  return (
    <aside
      className={`meet-sidebar ${isLightPanel ? 'meet-sidebar-light' : ''}`}
      aria-label={sidebarTitle(type)}
    >
      <div className={`meet-sidebar-header ${isLightPanel ? 'meet-sidebar-header-light' : ''}`}>
        <div className="meet-sidebar-heading">
          <span>{sidebarTitle(type)}</span>
          {type === 'people' && (
            <span className="meet-sidebar-subcount">{participants.length}</span>
          )}
        </div>
        <button type="button" className={`meet-sidebar-close ${isLightPanel ? 'meet-sidebar-close-light' : ''}`} onClick={onClose} aria-label="Close panel">
          <X size={22} />
        </button>
      </div>

      <div className={`meet-sidebar-content ${isLightPanel ? 'meet-sidebar-content-light chat-panel-content' : ''}`}>
        {type === 'chat' && (
          <div className="meet-lk-chat-host h-full min-h-0 flex flex-col">
            <CustomChat roomId={room} />
          </div>
        )}

        {type === 'people' && (
          <div className="flex flex-col gap-1">
            <p className="meet-people-hint text-sm text-[#9aa0a6] mb-3">
              In the meeting ({participants.length})
            </p>
            {participants.map((p) => {
              const cohost = isCohost(p);
              const showActions = isHost && !p.isLocal;
              return (
                <div key={p.sid} className="meet-people-row">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="meet-people-avatar">
                      {p.identity?.charAt(0).toUpperCase()}
                    </div>
                    <span className="meet-people-name truncate">
                      {p.identity}
                      {p.isLocal && <span className="meet-people-you"> (You)</span>}
                      {cohost && <span className="meet-people-cohost-badge" title="Co-host">Co-host</span>}
                    </span>
                  </div>
                  <div className="meet-people-devices flex gap-2 shrink-0 items-center">
                    {isHandRaised(p) && (
                      <span className="meet-hand-badge" title="Raised hand">
                        <Hand size={16} className="text-[#f9ab00]" />
                      </span>
                    )}
                    {p.isMicrophoneEnabled ? <Mic size={16} className="text-[#9aa0a6]" /> : <MicOff size={16} className="text-[#ea4335]" />}
                    {p.isCameraEnabled ? <Video size={16} className="text-[#9aa0a6]" /> : <VideoOff size={16} className="text-[#ea4335]" />}
                    {showActions && (
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <button type="button" className="meet-people-action-trigger" title="Host actions" aria-label="Host actions">
                            <Shield size={14} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="meet-dropdown-content" align="end" sideOffset={6}>
                          {p.isMicrophoneEnabled ? (
                            <DropdownMenuItem
                              className="meet-dropdown-item"
                              disabled={busyAction === `mute-mic:${p.identity}`}
                              onClick={() => moderate('mute-mic', p.identity)}
                            >
                              <MicOff size={16} className="shrink-0" /> Mute mic
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="meet-dropdown-item"
                              disabled={busyAction === `unmute-mic:${p.identity}`}
                              onClick={() => moderate('unmute-mic', p.identity)}
                            >
                              <Mic size={16} className="shrink-0" /> Unmute mic
                            </DropdownMenuItem>
                          )}
                          {p.isCameraEnabled ? (
                            <DropdownMenuItem
                              className="meet-dropdown-item"
                              disabled={busyAction === `mute-camera:${p.identity}`}
                              onClick={() => moderate('mute-camera', p.identity)}
                            >
                              <VideoOff size={16} className="shrink-0" /> Stop video
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="meet-dropdown-item"
                              disabled={busyAction === `unmute-camera:${p.identity}`}
                              onClick={() => moderate('unmute-camera', p.identity)}
                            >
                              <Video size={16} className="shrink-0" /> Start video
                            </DropdownMenuItem>
                          )}
                          {cohost ? (
                            <DropdownMenuItem
                              className="meet-dropdown-item"
                              disabled={busyAction === `demote:${p.identity}`}
                              onClick={() => moderate('demote', p.identity)}
                            >
                              <Shield size={16} className="shrink-0" /> Remove co-host
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="meet-dropdown-item"
                              disabled={busyAction === `promote:${p.identity}`}
                              onClick={() => moderate('promote', p.identity)}
                            >
                              <Shield size={16} className="shrink-0" /> Promote to co-host
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem
                            className="meet-dropdown-item meet-dropdown-item-danger"
                            disabled={busyAction === `remove:${p.identity}`}
                            onClick={() => {
                              if (typeof window !== 'undefined' &&
                                  !window.confirm(`Remove ${p.identity} from this worship?`)) return;
                              moderate('remove', p.identity);
                            }}
                          >
                            <X size={16} className="shrink-0" /> Remove from call
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {type === 'info' && (
          <div className="flex flex-col gap-6">
            <div>
              <h4 className="meet-info-label">Joining info</h4>
              <p className="meet-info-url break-all">{meetingUrl}</p>
              <button type="button" className="meet-copy-link" onClick={copyJoiningInfo}>
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? 'Copied' : 'Copy joining info'}
              </button>
            </div>
          </div>
        )}

        {type === 'notes' && (
          <NotesPanel
            roomId={room}
            authorUserId={callerUserId}
            authorName={authorName || 'Anonymous'}
            isHost={isHost}
            notesBumpKey={notesBumpKey}
          />
        )}

        {type === 'bible' && (
          <BiblePanel
            isHost={isHost}
            initialPassage={sharedBible}
            onShare={onShareBible}
            onClearShared={onClearSharedBible}
          />
        )}

        {type === 'waiting' && (
          <div className="flex flex-col gap-2">
            <label
              className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3 mb-2"
            >
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-white">Allow anyone to join</span>
                <span className="text-xs text-[#9aa0a6]">
                  {allowAnyone
                    ? 'Guests skip the waiting room and join automatically.'
                    : 'You will approve each new guest from this panel.'}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={allowAnyone}
                disabled={allowAnyoneBusy}
                onClick={() => onToggleAllowAnyone(!allowAnyone)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                  allowAnyone ? 'bg-[#1a73e8]' : 'bg-white/20'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    allowAnyone ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>
            <p className="meet-people-hint text-sm text-[#9aa0a6] mb-3">
              Waiting to join ({waitingEntries.length})
            </p>
            {waitingEntries.length === 0 && (
              <p className="text-sm text-[#9aa0a6]">
                {allowAnyone
                  ? 'Guests are joining automatically.'
                  : 'No one is waiting right now.'}
              </p>
            )}
            {waitingEntries.map((entry) => {
              const admitBusy = waitingBusyKey === `admit:${entry.key}`;
              const denyBusy = waitingBusyKey === `deny:${entry.key}`;
              const anyBusy = !!waitingBusyKey;
              return (
                <div key={entry.key} className="meet-people-row">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="meet-people-avatar">
                      {entry.displayName?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <span className="meet-people-name truncate">{entry.displayName}</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      className="rounded-md bg-[#1a73e8] hover:bg-[#1765c4] disabled:opacity-50 px-3 py-1 text-xs font-medium text-white transition-colors"
                      disabled={anyBusy}
                      onClick={() => onAdmitGuest(entry.key)}
                    >
                      {admitBusy ? 'Admitting…' : 'Admit'}
                    </button>
                    <button
                      type="button"
                      className="rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-50 px-3 py-1 text-xs font-medium text-white transition-colors"
                      disabled={anyBusy}
                      onClick={() => onDenyGuest(entry.key)}
                    >
                      {denyBusy ? 'Denying…' : 'Deny'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};

const GoogleMeetBottomBar = ({
  room,
  onLeave,
  activePanel,
  setActivePanel,
  participantCount,
  captionsOn,
  onCaptionsChange,
  lyricsActive,
  onToggleLyricsComposer,
  onStopLyrics,
  sendReaction,
  onOpenPrayer,
  onOpenGive,
  isHost,
  canModerate,
  recording,
  recordingBusy,
  onStartRecording,
  onStopRecording,
  isWorshipMode,
  isBusinessMode,
  whiteboardOpen,
  onToggleWhiteboard,
  whiteboardAccessState,
  altarActive,
  onOpenAltarStarter,
  onCloseAltar,
  breakoutActive,
  onOpenBreakoutStarter,
  onCloseBreakout,
  musicPlayerOpen,
  onToggleMusicPlayer,
  onEndForAll,
  waitingCount,
}: {
  room: string,
  onLeave: () => void,
  activePanel: SidePanel | null,
  setActivePanel: (panel: SidePanel | null) => void,
  participantCount: number,
  captionsOn?: boolean,
  onCaptionsChange?: (next: boolean) => void,
  lyricsActive: boolean,
  onToggleLyricsComposer: () => void,
  onStopLyrics: () => void,
  sendReaction: (emoji: string) => Promise<void>,
  onOpenPrayer: () => void,
  onOpenGive: () => void,
  isHost: boolean,
  canModerate: boolean,
  recording: { egressId: string; status: string } | null,
  recordingBusy: boolean,
  onStartRecording: () => void,
  onStopRecording: () => void,
  isWorshipMode: boolean,
  isBusinessMode: boolean,
  whiteboardOpen: boolean,
  onToggleWhiteboard: () => void,
  whiteboardAccessState: 'host' | 'idle' | 'pending' | 'granted' | 'denied',
  altarActive: boolean,
  onOpenAltarStarter: () => void,
  onCloseAltar: () => void,
  breakoutActive: boolean,
  onOpenBreakoutStarter: () => void,
  onCloseBreakout: () => void,
  musicPlayerOpen: boolean,
  onToggleMusicPlayer: () => void,
  onEndForAll: () => void,
  waitingCount: number,
}) => {
  const { localParticipant } = useLocalParticipant();
  const [showReactions, setShowReactions] = useState(false);
  const [handRaised, setHandRaised] = useState(() => isHandRaised(localParticipant));
  const [moreOpen, setMoreOpen] = useState(false);
  const moreWrapRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Close the overflow dropup on outside click / ESC. Only active when open.
  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e: MouseEvent) => {
      if (moreWrapRef.current && !moreWrapRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);
  
  const devices = useMediaDevices({ kind: 'videoinput' });
  const mics = useMediaDevices({ kind: 'audioinput' });

  const micEnabled = localParticipant.isMicrophoneEnabled;
  const camEnabled = localParticipant.isCameraEnabled;
  const sharing = localParticipant.isScreenShareEnabled;

  useEffect(() => {
    const syncHand = () => setHandRaised(isHandRaised(localParticipant));
    syncHand();
    localParticipant.on(ParticipantEvent.AttributesChanged, syncHand);
    return () => {
      localParticipant.off(ParticipantEvent.AttributesChanged, syncHand);
    };
  }, [localParticipant]);

  const formatRoomId = (id: string) => {
    if (id.length >= 10 && !id.includes('-')) {
      return `${id.slice(0, 3)}-${id.slice(3, 7)}-${id.slice(7, 10)}`;
    }
    return id;
  };

  // --- Background Processor Logic ---
  const [bgMode, setBgMode] = useState<'none' | 'blur' | 'image'>('none');
  const [bgImage, setBgImage] = useState<string>('');
  const processorRef = useRef<any>(null);
  // Track which mode the live processor was built for, so we know when to
  // tear down + rebuild vs. just re-apply. Mixing modes on a single processor
  // (via switchTo) was leaving the WebGL mask in a stale state, which is what
  // caused the "blur the whole frame" / "image with no person cutout" bugs.
  const processorModeRef = useRef<'blur' | 'image' | null>(null);
  const processorImageRef = useRef<string>('');

  useEffect(() => {
    let isMounted = true;

    const applyProcessor = async () => {
      const trackPub = localParticipant.getTrackPublication(Track.Source.Camera);
      const videoTrack = trackPub?.videoTrack as LocalVideoTrack | undefined;

      // Camera off / track not yet published — TrackPublished listener will retrigger us.
      if (!videoTrack || !camEnabled) return;

      try {
        if (bgMode === 'none') {
          if (processorRef.current) {
            await videoTrack.stopProcessor();
            processorRef.current = null;
            processorModeRef.current = null;
            processorImageRef.current = '';
          }
          return;
        }

        if (bgMode === 'image' && !bgImage) {
          // Image mode picked but no image chosen yet — nothing to apply.
          return;
        }

        if (!supportsBackgroundProcessors()) {
          toast({
            title: 'Background effects unavailable',
            description: 'This browser does not support background blur or virtual backgrounds.',
            variant: 'destructive',
          });
          setBgMode('none');
          return;
        }

        // Rebuild the processor whenever mode changes, or when the image changes
        // in image mode. switchTo() works for hot-swaps but we hit cases where
        // the segmentation mask wouldn't refresh, so a clean rebuild is safer.
        const needsRebuild =
          !processorRef.current ||
          processorModeRef.current !== bgMode ||
          (bgMode === 'image' && processorImageRef.current !== bgImage);

        if (needsRebuild) {
          if (processorRef.current) {
            try { await videoTrack.stopProcessor(); } catch { /* ignore */ }
            processorRef.current = null;
          }

          processorRef.current =
            bgMode === 'blur'
              ? BackgroundProcessor({
                  mode: 'background-blur',
                  blurRadius: 20,
                  assetPaths: lkProcessorAssetPaths,
                })
              : BackgroundProcessor({
                  mode: 'virtual-background',
                  imagePath: bgImage,
                  assetPaths: lkProcessorAssetPaths,
                });

          processorModeRef.current = bgMode;
          processorImageRef.current = bgMode === 'image' ? bgImage : '';
        }

        if (isMounted) {
          await videoTrack.setProcessor(processorRef.current);
        }
      } catch (err: any) {
        console.error('Failed to apply background processor:', err);
        // Reset state so the user can try again from a clean slate.
        processorRef.current = null;
        processorModeRef.current = null;
        processorImageRef.current = '';
        if (isMounted) {
          toast({
            title: 'Could not apply background effect',
            description:
              err?.message ||
              'Background blur / image failed to load. Check your network and try again.',
            variant: 'destructive',
          });
          setBgMode('none');
        }
      }
    };

    const handleTrackUpdate = () => applyProcessor();
    localParticipant.on(ParticipantEvent.TrackPublished, handleTrackUpdate);
    localParticipant.on(ParticipantEvent.TrackUnpublished, handleTrackUpdate);

    applyProcessor();

    return () => {
      isMounted = false;
      localParticipant.off(ParticipantEvent.TrackPublished, handleTrackUpdate);
      localParticipant.off(ParticipantEvent.TrackUnpublished, handleTrackUpdate);
    };
  }, [bgMode, bgImage, localParticipant, camEnabled, toast]);

  const toggleCamera = async () => {
    try {
      if (camEnabled) {
        // If processor is active, stop it before disabling camera
        const videoTrack = localParticipant.getTrackPublication(Track.Source.Camera)?.videoTrack as LocalVideoTrack;
        if (videoTrack) await videoTrack.stopProcessor();
        processorRef.current = null;
        processorModeRef.current = null;
        processorImageRef.current = '';
      }
      await localParticipant.setCameraEnabled(!camEnabled);
    } catch (e: any) {
      toast({
        title: 'Camera Error',
        description: e.message?.replace(/LiveKit/gi, 'System') || 'Could not toggle camera.',
        variant: 'destructive',
      });
    }
  };

  const startShare = async () => {
    try {
      await localParticipant.setScreenShareEnabled(true);
    } catch (e: any) {
      if (e.message !== 'User cancelled screen sharing') {
        toast({
          title: 'Screen Share Failed',
          description: 'Could not start screen sharing. Please check permissions.',
          variant: 'destructive',
        });
      }
    }
  };

  const stopShare = async () => {
    try {
      await localParticipant.setScreenShareEnabled(false);
    } catch (e) {
      console.error('Failed to stop screen share:', e);
    }
  };

  const refreshMicList = async () => {
    try {
      await Room.getLocalDevices('audioinput', true);
    } catch (e) {
      toast({
        title: 'Microphone access',
        description: e instanceof Error ? e.message : 'Allow microphone in the browser prompt.',
        variant: 'destructive',
      });
    }
  };

  const refreshCameraList = async () => {
    try {
      await Room.getLocalDevices('videoinput', true);
    } catch (e) {
      toast({
        title: 'Camera access',
        description: e instanceof Error ? e.message : 'Allow camera in the browser prompt.',
        variant: 'destructive',
      });
    }
  };

  const toggleRaiseHand = async () => {
    const next = !handRaised;
    try {
      await localParticipant.setAttributes({ [HAND_RAISED_ATTR]: next ? '1' : '0' });
      setHandRaised(next);
    } catch (e) {
      console.error(e);
      toast({
        title: 'Could not update raise hand',
        description: e instanceof Error ? e.message : 'Reconnect and try again.',
        variant: 'destructive',
      });
    }
  };

  const dropdownContentProps = {
    className: 'meet-dropdown-content',
    align: 'center' as const,
    side: 'top' as const,
    sideOffset: 10,
    collisionPadding: 16,
  };

  return (
    <div className="meet-bottom-bar relative">
      <div className="reaction-tray-wrap">
        {showReactions && (
          <ReactionTray
            onSelect={async (emoji) => {
              setShowReactions(false);
              await sendReaction(emoji);
            }}
          />
        )}
      </div>

      <div className="meet-bar-left">
        <Clock />
      </div>

      <div className="meet-bar-center">
        <div className="meet-controls-cluster" role="toolbar" aria-label="Call controls">
          <div className="meet-btn-stack">
          <div className={`meet-split-button ${!micEnabled ? 'active-red' : ''}`}>
            <button
              type="button"
              className="meet-split-button-main"
              title={micEnabled ? 'Turn off microphone' : 'Turn on microphone'}
              aria-pressed={micEnabled}
              onClick={() => localParticipant.setMicrophoneEnabled(!micEnabled)}
            >
              {micEnabled ? <Mic /> : <MicOff />}
            </button>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger className="meet-split-button-arrow" title="Microphone options" aria-label="Microphone options">
                <ChevronUp size={14} />
              </DropdownMenuTrigger>
              <DropdownMenuContent {...dropdownContentProps}>
                <DropdownMenuLabel className="meet-dropdown-label px-4 py-2 text-xs text-[#9aa0a6]">
                  Select microphone
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                {mics.length === 0 && (
                  <DropdownMenuItem
                    className="meet-dropdown-item"
                    onSelect={(e) => e.preventDefault()}
                    onClick={refreshMicList}
                  >
                    <Mic className="shrink-0" /> Request access / refresh list
                  </DropdownMenuItem>
                )}
                {mics.map((mic) => (
                  <DropdownMenuItem 
                    key={mic.deviceId || mic.label} 
                    className="meet-dropdown-item"
                    onClick={() => localParticipant.setMicrophoneEnabled(true, { deviceId: mic.deviceId })}
                  >
                    <Mic className="shrink-0" /> <span className="truncate">{mic.label || 'Microphone'}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <span className="meet-btn-label">Microphone</span>
          </div>

          <div className="meet-btn-stack">
          <div className={`meet-split-button ${!camEnabled ? 'active-red' : ''}`}>
            <button
              type="button"
              className="meet-split-button-main"
              title={camEnabled ? 'Turn off camera' : 'Turn on camera'}
              aria-pressed={camEnabled}
              onClick={toggleCamera}
            >
              {camEnabled ? <Video /> : <VideoOff />}
            </button>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger className="meet-split-button-arrow" title="Camera options" aria-label="Camera options">
                <ChevronUp size={14} />
              </DropdownMenuTrigger>
              <DropdownMenuContent {...dropdownContentProps}>
                <DropdownMenuLabel className="meet-dropdown-label px-4 py-2 text-xs text-[#9aa0a6]">
                  Select camera
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                {devices.length === 0 && (
                  <DropdownMenuItem
                    className="meet-dropdown-item"
                    onSelect={(e) => e.preventDefault()}
                    onClick={refreshCameraList}
                  >
                    <Video className="shrink-0" /> Request access / refresh list
                  </DropdownMenuItem>
                )}
                {devices.map((device) => (
                  <DropdownMenuItem 
                    key={device.deviceId || device.label} 
                    className="meet-dropdown-item"
                    onClick={async () => {
                      try {
                        // Stop current processor if switching cameras to prevent crashes
                        const videoTrack = localParticipant.getTrackPublication(Track.Source.Camera)?.videoTrack as LocalVideoTrack;
                        if (videoTrack) await videoTrack.stopProcessor();
                        processorRef.current = null;
                        processorModeRef.current = null;
                        processorImageRef.current = '';

                        await localParticipant.setCameraEnabled(true, { deviceId: device.deviceId });
                      } catch (e: any) {
                        toast({
                          title: 'Camera Switch Failed',
                          description: e.message?.replace(/LiveKit/gi, 'System') || 'Could not switch to the selected camera.',
                          variant: 'destructive',
                        });
                      }
                    }}
                  >
                    <Video className="shrink-0" /> <span className="truncate">{device.label || 'Camera'}</span>
                  </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuLabel className="meet-dropdown-label px-4 py-2 text-xs text-[#9aa0a6]">
                  Visual effects
                </DropdownMenuLabel>
                
                <DropdownMenuItem 
                  className={`meet-dropdown-item ${bgMode === 'none' ? 'bg-white/10 text-white' : ''}`}
                  onClick={() => setBgMode('none')}
                >
                  <Eraser className="shrink-0" size={16} /> <span>None</span>
                </DropdownMenuItem>

                <DropdownMenuItem 
                  className={`meet-dropdown-item ${bgMode === 'blur' ? 'bg-white/10 text-white' : ''}`}
                  onClick={() => setBgMode('blur')}
                >
                  <CircleDashed className="shrink-0" size={16} /> <span>Blur Background</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuLabel className="meet-dropdown-label px-4 py-1 text-[10px] text-[#9aa0a6] uppercase tracking-wider">
                  Background Images
                </DropdownMenuLabel>

                <div className="px-2 pb-2 grid grid-cols-3 gap-1">
                  {[
                    { name: 'Loft', path: '/images/bg.jpg' },
                    { name: 'Worship', path: '/images/worship_hero.png' },
                    { name: 'Choir', path: '/images/gospel_choir.png' },
                  ].map((img) => (
                    <button
                      key={img.path}
                      onClick={() => {
                        setBgMode('image');
                        setBgImage(img.path);
                      }}
                      className={`h-10 rounded overflow-hidden border-2 transition-all hover:scale-105 ${
                        bgMode === 'image' && bgImage === img.path ? 'border-[#1a73e8]' : 'border-transparent'
                      }`}
                      title={img.name}
                    >
                      <img src={img.path} alt={img.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <span className="meet-btn-label">Camera</span>
          </div>

          <span className="meet-cluster-divider meet-overflow-divider" aria-hidden />

          <div
            ref={moreWrapRef}
            className="meet-overflow"
            data-open={moreOpen ? 'true' : 'false'}
            onClick={() => { if (moreOpen) setMoreOpen(false); }}
          >
          <div className="meet-btn-stack">
            <button type="button" className="meet-icon-button" title="React" onClick={() => setShowReactions(!showReactions)}><Smile /></button>
            <span className="meet-btn-label">React</span>
          </div>

          <div className="meet-btn-stack">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`meet-icon-button ${sharing ? 'meet-icon-button-active' : ''}`}
                title={sharing ? 'Stop presenting' : 'Present now'}
                aria-pressed={sharing}
              >
                <MonitorUp />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent {...dropdownContentProps} className="meet-dropdown-content meet-present-menu">
              {sharing ? (
                <DropdownMenuItem className="meet-dropdown-item" onClick={stopShare}>
                  <X className="shrink-0" /> Stop presenting
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem className="meet-dropdown-item" onClick={startShare}>
                    <Monitor className="shrink-0" /> Your entire screen
                  </DropdownMenuItem>
                  <DropdownMenuItem className="meet-dropdown-item" onClick={startShare}>
                    <AppWindow className="shrink-0" /> A window
                  </DropdownMenuItem>
                  <DropdownMenuItem className="meet-dropdown-item" onClick={startShare}>
                    <LayoutTemplate className="shrink-0" /> A tab
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="meet-btn-label">Present</span>
          </div>

          <div className="meet-btn-stack">
          <button
            type="button"
            className={`meet-icon-button ${handRaised ? 'meet-icon-button-active' : ''}`}
            title={handRaised ? 'Lower hand' : 'Raise hand'}
            aria-pressed={handRaised}
            onClick={toggleRaiseHand}
          >
            <Hand />
          </button>
          <span className="meet-btn-label">Raise hand</span>
          </div>

          {isHost && isWorshipMode && (
            <div className="meet-btn-stack">
            <button
              type="button"
              className={`meet-icon-button ${lyricsActive ? 'meet-icon-button-active' : ''}`}
              title={lyricsActive ? 'Stop Lyrics Mode' : 'Start Lyrics Mode'}
              aria-pressed={lyricsActive}
              onClick={() => (lyricsActive ? onStopLyrics() : onToggleLyricsComposer())}
            >
              <Music />
            </button>
            <span className="meet-btn-label">Lyrics</span>
            </div>
          )}

          {isHost && isWorshipMode && (
            <div className="meet-btn-stack">
            <button
              type="button"
              className={`meet-icon-button ${musicPlayerOpen ? 'meet-icon-button-active meet-icon-button-music' : ''}`}
              title={musicPlayerOpen ? 'Close music player' : 'Play audio file to congregation'}
              aria-pressed={musicPlayerOpen}
              onClick={onToggleMusicPlayer}
            >
              <FileMusic />
            </button>
            <span className="meet-btn-label">Music</span>
            </div>
          )}

          {canModerate && (
            <div className="meet-btn-stack">
            <button
              type="button"
              className={`meet-icon-button ${recording ? 'meet-icon-button-recording' : ''}`}
              title={recording ? 'Stop recording' : 'Start recording'}
              aria-pressed={!!recording}
              onClick={recording ? onStopRecording : onStartRecording}
              disabled={recordingBusy}
            >
              {recording ? <CircleDot /> : <Disc />}
            </button>
            <span className="meet-btn-label">Record</span>
            </div>
          )}

          {isBusinessMode && (
            <div className="meet-btn-stack">
            <button
              type="button"
              className={`meet-icon-button ${whiteboardOpen ? 'meet-icon-button-active' : ''} ${whiteboardAccessState === 'pending' ? 'meet-icon-button-pending' : ''}`}
              title={
                whiteboardAccessState === 'pending' ? 'Waiting for host to grant whiteboard access…'
                : whiteboardAccessState === 'denied' ? 'Host denied access — click to ask again'
                : whiteboardAccessState === 'idle' ? 'Ask host for whiteboard edit access'
                : whiteboardOpen ? 'Close shared whiteboard'
                : 'Open shared whiteboard'
              }
              aria-pressed={whiteboardOpen}
              onClick={onToggleWhiteboard}
            >
              <PenTool />
            </button>
            <span className="meet-btn-label">
              {whiteboardAccessState === 'pending' ? 'Pending…' : 'Whiteboard'}
            </span>
            </div>
          )}

          {isWorshipMode && (
            <div className="meet-btn-stack">
            <button
              type="button"
              className="meet-icon-button meet-icon-button-prayer"
              title="Submit Prayer Request"
              onClick={onOpenPrayer}
            >
              <HandHeart />
            </button>
            <span className="meet-btn-label">Prayer</span>
            </div>
          )}

          {isWorshipMode && (
            <div className="meet-btn-stack">
            <button
              type="button"
              className="meet-icon-button meet-icon-button-give"
              title="Give Offering — Sow a Seed"
              onClick={onOpenGive}
            >
              <HeartHandshake />
            </button>
            <span className="meet-btn-label">Give</span>
            </div>
          )}

          {isWorshipMode && isHost && (
            <div className="meet-btn-stack">
            <button
              type="button"
              className={`meet-icon-button meet-icon-button-altar ${altarActive ? 'is-active' : ''}`}
              title={altarActive ? 'Close altar call' : 'Call to altar'}
              aria-pressed={altarActive}
              onClick={altarActive ? onCloseAltar : onOpenAltarStarter}
            >
              <Cross />
            </button>
            <span className="meet-btn-label">Altar</span>
            </div>
          )}

          {isHost && (
            <div className="meet-btn-stack">
            <button
              type="button"
              className={`meet-icon-button meet-icon-button-breakout ${breakoutActive ? 'is-active' : ''}`}
              title={breakoutActive ? 'Close breakout rooms' : 'Open breakout rooms'}
              aria-pressed={breakoutActive}
              onClick={breakoutActive ? onCloseBreakout : onOpenBreakoutStarter}
            >
              <Group />
            </button>
            <span className="meet-btn-label">Breakout</span>
            </div>
          )}

          {/* Mobile-only: pull the right-side utility buttons into the dropup
              since .meet-bar-right is hidden at this viewport. The original
              right-bar still renders on desktop/tablet and stays the source
              of truth for activePanel — these are visual duplicates. */}
          <div className="meet-mobile-utility-overflow">
            <span className="meet-overflow-sep" aria-hidden />
            <div className="meet-btn-stack">
              <button
                type="button"
                className={`meet-icon-button ${activePanel === 'info' ? 'meet-icon-button-active' : ''}`}
                title="Meeting details"
                onClick={() => setActivePanel(activePanel === 'info' ? null : 'info')}
              >
                <Info />
              </button>
              <span className="meet-btn-label">Details</span>
            </div>
            <div className="meet-btn-stack">
              <button
                type="button"
                className={`meet-icon-button meet-utility-with-badge ${activePanel === 'people' ? 'meet-icon-button-active' : ''}`}
                title="People"
                onClick={() => setActivePanel(activePanel === 'people' ? null : 'people')}
              >
                <Users />
                {participantCount > 0 && <span className="meet-badge">{participantCount}</span>}
              </button>
              <span className="meet-btn-label">People</span>
            </div>
            {canModerate && (
              <div className="meet-btn-stack">
                <button
                  type="button"
                  className={`meet-icon-button meet-utility-with-badge ${activePanel === 'waiting' ? 'meet-icon-button-active' : ''}`}
                  title={waitingCount > 0 ? `${waitingCount} waiting to join` : 'Waiting room'}
                  onClick={() => setActivePanel(activePanel === 'waiting' ? null : 'waiting')}
                >
                  <Hand />
                  {waitingCount > 0 && <span className="meet-badge">{waitingCount}</span>}
                </button>
                <span className="meet-btn-label">Waiting</span>
              </div>
            )}
            <div className="meet-btn-stack">
              <button
                type="button"
                className={`meet-icon-button ${activePanel === 'chat' ? 'meet-icon-button-active' : ''}`}
                title="Chat with everyone"
                onClick={() => setActivePanel(activePanel === 'chat' ? null : 'chat')}
              >
                <MessageSquare />
              </button>
              <span className="meet-btn-label">Chat</span>
            </div>
            {isBusinessMode && (
              <div className="meet-btn-stack">
                <button
                  type="button"
                  className={`meet-icon-button ${activePanel === 'notes' ? 'meet-icon-button-active' : ''}`}
                  title="Meeting notes"
                  onClick={() => setActivePanel(activePanel === 'notes' ? null : 'notes')}
                >
                  <StickyNote />
                </button>
                <span className="meet-btn-label">Notes</span>
              </div>
            )}
            {isWorshipMode && (
              <div className="meet-btn-stack">
                <button
                  type="button"
                  className={`meet-icon-button ${activePanel === 'bible' ? 'meet-icon-button-active' : ''}`}
                  title="Bible"
                  onClick={() => setActivePanel(activePanel === 'bible' ? null : 'bible')}
                >
                  <BookOpen />
                </button>
                <span className="meet-btn-label">Bible</span>
              </div>
            )}
          </div>
          </div>

          <div className="meet-btn-stack meet-more-toggle-stack">
            <button
              type="button"
              className={`meet-icon-button meet-more-toggle ${moreOpen ? 'is-active' : ''}`}
              title={moreOpen ? 'Close more options' : 'More options'}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setMoreOpen((v) => !v)}
            >
              <MoreHorizontal />
            </button>
            <span className="meet-btn-label">More</span>
          </div>

          <span className="meet-cluster-divider" aria-hidden />

          <div className="meet-btn-stack">
          <button type="button" className="meet-icon-button hangup" title="Leave call" onClick={onLeave}>
            <PhoneOff />
          </button>
          <span className="meet-btn-label">Leave</span>
          </div>

          {isHost && (
            <div className="meet-btn-stack">
            <button
              type="button"
              className="meet-end-for-all"
              title="End call for everyone"
              onClick={() => {
                if (typeof window !== 'undefined' &&
                    !window.confirm('End the call for everyone? All participants will be disconnected.')) return;
                onEndForAll();
              }}
            >
              <PhoneOff className="meet-end-for-all-icon" />
            </button>
            <span className="meet-btn-label">End all</span>
            </div>
          )}
        </div>
      </div>

      <div className="meet-bar-right">
        <div className="meet-btn-stack">
        <button
          type="button"
          className={`meet-utility-button ${activePanel === 'info' ? 'meet-utility-active' : ''}`}
          title="Meeting details"
          onClick={() => setActivePanel(activePanel === 'info' ? null : 'info')}
        >
          <Info size={22} />
        </button>
        <span className="meet-btn-label">Details</span>
        </div>
        <div className="meet-btn-stack">
        <button
          type="button"
          className={`meet-utility-button meet-utility-with-badge ${activePanel === 'people' ? 'meet-utility-active' : ''}`}
          title="People"
          onClick={() => setActivePanel(activePanel === 'people' ? null : 'people')}
        >
          <Users size={22} />
          {participantCount > 0 && <span className="meet-badge">{participantCount}</span>}
        </button>
        <span className="meet-btn-label">People</span>
        </div>
        {canModerate && (
          <div className="meet-btn-stack">
          <button
            type="button"
            className={`meet-utility-button meet-utility-with-badge ${activePanel === 'waiting' ? 'meet-utility-active' : ''}`}
            title={waitingCount > 0 ? `${waitingCount} waiting to join` : 'Waiting room'}
            onClick={() => setActivePanel(activePanel === 'waiting' ? null : 'waiting')}
          >
            <Hand size={22} />
            {waitingCount > 0 && <span className="meet-badge">{waitingCount}</span>}
          </button>
          <span className="meet-btn-label">Waiting</span>
          </div>
        )}
        <div className="meet-btn-stack">
        <button
          type="button"
          className={`meet-utility-button ${activePanel === 'chat' ? 'meet-utility-active' : ''}`}
          title="Chat with everyone"
          onClick={() => setActivePanel(activePanel === 'chat' ? null : 'chat')}
        >
          <MessageSquare size={22} />
        </button>
        <span className="meet-btn-label">Chat</span>
        </div>
        {isBusinessMode && (
          <div className="meet-btn-stack">
          <button
            type="button"
            className={`meet-utility-button ${activePanel === 'notes' ? 'meet-utility-active' : ''}`}
            title="Meeting notes"
            onClick={() => setActivePanel(activePanel === 'notes' ? null : 'notes')}
          >
            <StickyNote size={22} />
          </button>
          <span className="meet-btn-label">Notes</span>
          </div>
        )}
        {isWorshipMode && (
          <div className="meet-btn-stack">
          <button
            type="button"
            className={`meet-utility-button ${activePanel === 'bible' ? 'meet-utility-active' : ''}`}
            title="Bible"
            onClick={() => setActivePanel(activePanel === 'bible' ? null : 'bible')}
          >
            <BookOpen size={22} />
          </button>
          <span className="meet-btn-label">Bible</span>
          </div>
        )}
      </div>

    </div>
  );
};

const GoogleMeetLayout = ({ room, onLeave, userId }: { room: string, onLeave: () => void, userId?: string }) => {
  const { localParticipant } = useLocalParticipant();
  const lkRoom = useRoomContext();
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [activePanel, setActivePanel] = useState<SidePanel | null>(null);
  const [notesBumpKey, setNotesBumpKey] = useState(0);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  // Per-participant whiteboard edit-access state. Host is implicitly granted
  // and bypasses this; non-hosts must request access via the host before they
  // can draw. View access is unrestricted — everyone sees the canvas when the
  // host opens it.
  const [myWhiteboardAccess, setMyWhiteboardAccess] =
    useState<'idle' | 'pending' | 'granted' | 'denied'>('idle');
  // Whiteboard scene cache + push-to-overlay handler. The cache survives the
  // overlay being closed, so re-opening shows the latest scene without round-tripping.
  const whiteboardSceneRef = useRef<any[] | null>(null);
  const whiteboardIncomingRef = useRef<((elements: readonly any[]) => void) | null>(null);
  const whiteboardClearRef = useRef<(() => void) | null>(null);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [peopleUiTick, bumpPeopleUi] = useReducer((n: number) => n + 1, 0);
  const roomParticipants = useParticipants();
  const { toast } = useToast();

  // --- Floating reactions state ---
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const spawnFloatingReaction = (emoji: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const left = 20 + Math.random() * 60; // 20–80% across width
    setFloatingReactions((cur: FloatingReaction[]) => [...cur, { id, emoji, left }]);
    setTimeout(() => {
      setFloatingReactions((cur: FloatingReaction[]) => cur.filter((r) => r.id !== id));
    }, 3500);
  };

  // --- Role resolution (Phase 2) ---
  // Server returns 'host' if the local user is the room creator.
  // Defaults to non-host until the response lands, so worship controls stay safe.
  const [role, setRole] = useState<'host' | 'member' | 'guest'>('guest');
  // Per-session mode (Phase 3): drives which toolset is visible.
  // Defaults to 'worship' until role lookup lands so we don't strip controls
  // for an instant before the server responds.
  const [roomMode, setRoomMode] = useState<'worship' | 'business' | 'hybrid'>('worship');
  const [roomWorkspaceId, setRoomWorkspaceId] = useState<string | null>(null);
  const isWorshipMode = roomMode === 'worship' || roomMode === 'hybrid';
  const isBusinessMode = roomMode === 'business' || roomMode === 'hybrid';
  // Co-host elevation comes from a LiveKit participant attribute set by the host
  // via /api/livekit/moderate (action: 'promote'). Re-evaluated on AttributesChanged
  // events thanks to the existing bumpPeopleUi reducer wired to ParticipantAttributesChanged.
  const isCohostLocal = isCohost(localParticipant);
  // canModerate → only the room creator (host); server also enforces.
  const canModerate = role === 'host';
  // canLeadWorship → host OR co-host; controls Lyrics composer & Music Mode.
  const isHost = canModerate || isCohostLocal;
  // Refs mirror these for use inside long-lived event listeners (the
  // RoomEvent.DataReceived handler is attached once and won't see updated
  // closure values when the role lookup or local participant lands later).
  const canModerateRef = useRef(canModerate);
  const localIdentityRef = useRef<string | undefined>(localParticipant?.identity);
  useEffect(() => { canModerateRef.current = canModerate; }, [canModerate]);
  useEffect(() => { localIdentityRef.current = localParticipant?.identity; }, [localParticipant?.identity]);
  useEffect(() => {
    let cancelled = false;
    const lookupId = userId || localParticipant?.identity;
    if (!lookupId) return;
    fetch(`/api/v1/room-role?room_id=${encodeURIComponent(room)}&user_id=${encodeURIComponent(lookupId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.success && (data.role === 'host' || data.role === 'member' || data.role === 'guest')) {
          setRole(data.role);
        }
        if (data?.mode === 'worship' || data?.mode === 'business' || data?.mode === 'hybrid') {
          setRoomMode(data.mode);
        }
        if (typeof data?.workspaceId === 'string') {
          setRoomWorkspaceId(data.workspaceId);
        }
      })
      .catch((err) => console.error('role lookup failed', err));
    return () => { cancelled = true; };
  }, [room, userId, localParticipant?.identity]);

  // --- Waiting room (host-only) ---
  // Hosts poll /api/v1/waiting-room for pending guests and can admit/deny.
  // Non-hosts skip the poll entirely — both for cost and because the listing
  // endpoint refuses non-hosts anyway.
  const [waitingEntries, setWaitingEntries] = useState<WaitingEntry[]>([]);
  const [waitingBusyKey, setWaitingBusyKey] = useState<string | null>(null);
  const previousWaitingCountRef = useRef<number>(0);
  // Host policy toggle. When on, server auto-admits knockers and the token
  // route stops gating, so the host doesn't have to click Admit each time.
  const [allowAnyone, setAllowAnyone] = useState(false);
  const [allowAnyoneBusy, setAllowAnyoneBusy] = useState(false);

  useEffect(() => {
    if (!canModerate) return;
    let cancelled = false;
    fetch(`/api/v1/waiting-room/policy?room_id=${encodeURIComponent(room)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.success) return;
        setAllowAnyone(!!data.allowAnyone);
      })
      .catch((err) => console.error('policy lookup failed', err));
    return () => { cancelled = true; };
  }, [canModerate, room]);

  const toggleAllowAnyone = useCallback(async (next: boolean) => {
    if (!userId || allowAnyoneBusy) return;
    setAllowAnyoneBusy(true);
    // Optimistic — flip the UI immediately, roll back on failure.
    setAllowAnyone(next);
    try {
      const res = await fetch('/api/v1/waiting-room/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: room, allowAnyone: next, callerUserId: userId }),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message || 'Could not update policy');
      // Switching ON also bulk-admits anyone already waiting server-side, so
      // clear the local list to match — the next poll tick would do this too,
      // but immediate feedback is nicer.
      if (next) {
        setWaitingEntries([]);
        previousWaitingCountRef.current = 0;
      }
      toast({
        title: next ? '🔓 Anyone can join — no approval needed' : '🔒 Waiting room is on',
        className: 'bg-white/10 border-none text-white',
      });
    } catch (e: any) {
      setAllowAnyone(!next);
      toast({
        title: 'Could not update policy',
        description: e?.message || 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setAllowAnyoneBusy(false);
    }
  }, [userId, room, allowAnyoneBusy, toast]);

  useEffect(() => {
    if (!canModerate || !userId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(
          `/api/v1/waiting-room?host=1&room_id=${encodeURIComponent(room)}&user_id=${encodeURIComponent(userId)}`
        );
        const data = await res.json();
        if (cancelled || !data?.success) return;
        const next: WaitingEntry[] = Array.isArray(data.entries) ? data.entries : [];
        setWaitingEntries(next);
        if (next.length > previousWaitingCountRef.current) {
          const arrived = next.length - previousWaitingCountRef.current;
          toast({
            title: arrived === 1
              ? `👋 ${next[next.length - 1]?.displayName || 'Someone'} is waiting to join`
              : `👋 ${arrived} people are waiting to join`,
            className: 'bg-white/10 border-none text-white',
          });
        }
        previousWaitingCountRef.current = next.length;
      } catch {
        /* transient — retry next tick */
      }
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, [canModerate, userId, room, toast]);

  const decideOnGuest = useCallback(async (key: string, decision: 'admit' | 'deny') => {
    if (!userId) return;
    setWaitingBusyKey(`${decision}:${key}`);
    try {
      const res = await fetch('/api/v1/waiting-room/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: room, key, decision, callerUserId: userId }),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message || 'Decision failed');
      // Drop the entry locally so the UI updates immediately rather than waiting
      // for the next poll tick.
      setWaitingEntries((prev) => {
        const next = prev.filter((e) => e.key !== key);
        previousWaitingCountRef.current = next.length;
        return next;
      });
    } catch (e: any) {
      toast({
        title: 'Could not update waiting room',
        description: e?.message || 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setWaitingBusyKey(null);
    }
  }, [userId, room, toast]);

  const admitGuest = useCallback((key: string) => decideOnGuest(key, 'admit'), [decideOnGuest]);
  const denyGuest = useCallback((key: string) => decideOnGuest(key, 'deny'), [decideOnGuest]);

  // --- Lyrics Mode state ---
  const [lyricsVerses, setLyricsVerses] = useState<string[]>([]);
  const [lyricsIndex, setLyricsIndex] = useState(0);
  const [showComposer, setShowComposer] = useState(false);
  const lyricsActive = lyricsVerses.length > 0;

  // --- Prayer Request modal state ---
  const [showPrayerModal, setShowPrayerModal] = useState(false);

  // --- Give Offering modal state ---
  const [showGiveModal, setShowGiveModal] = useState(false);

  // --- Whiteboard toggle helpers ---
  // Host (and co-host): opens/closes the overlay for everyone via broadcast.
  // Non-host with edit access: toggles their own overlay locally; the host's
  // open broadcast still surfaces it for everyone, this just lets them hide.
  // Non-host without access: clicking sends an edit-access request to the host.
  const canEditWhiteboard = isHost || myWhiteboardAccess === 'granted';
  const toggleWhiteboard = () => {
    if (isHost) {
      const next = !showWhiteboard;
      setShowWhiteboard(next);
      broadcast({ type: next ? 'whiteboard:open' : 'whiteboard:close' });
      return;
    }
    if (canEditWhiteboard) {
      setShowWhiteboard((prev) => !prev);
      return;
    }
    if (myWhiteboardAccess === 'pending') {
      toast({
        description: 'Whiteboard access request is still pending…',
        className: 'bg-white/10 border-none text-white',
      });
      return;
    }
    const requesterName = localParticipant?.name || localParticipant?.identity || 'A guest';
    broadcast({
      type: 'whiteboard:access-request',
      identity: localParticipant?.identity,
      name: requesterName,
    });
    setMyWhiteboardAccess('pending');
    toast({
      description: 'Asked the host for whiteboard edit access.',
      className: 'bg-white/10 border-none text-white',
    });
  };

  // --- Music Player state ---
  // The actual audio publish happens inside <MusicPlayer/>; this state just
  // controls panel visibility + relays "now playing" to all participants.
  const [showMusicPlayer, setShowMusicPlayer] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  const handleNowPlayingChange = (title: string | null) => {
    setNowPlaying(title);
    broadcast({ type: 'music:now-playing', title });
  };

  // --- Bible "shared passage" state ---
  // When the host clicks "Share with everyone" we broadcast { ref, translation };
  // every participant's BiblePanel reacts by re-fetching that passage so the
  // congregation reads along.
  const [sharedBible, setSharedBible] = useState<{ ref: string; translation: string } | null>(null);
  const shareBible = (verse: BibleVerse) => {
    const payload = { ref: verse.reference, translation: verse.translation };
    setSharedBible(payload);
    broadcast({ type: 'bible:share', ...payload });
  };
  const clearSharedBible = () => {
    setSharedBible(null);
    broadcast({ type: 'bible:clear' });
  };

  // --- Breakout session state ---
  const [breakoutSession, setBreakoutSession] = useState<BreakoutSessionShape | null>(null);
  const [showBreakoutStarter, setShowBreakoutStarter] = useState(false);
  // Whether the LOCAL participant is currently sitting in a child breakout room.
  // Detected via the URL — see refetchBreakout below.
  const [isInsideBreakout, setIsInsideBreakout] = useState(false);
  const [parentRoomFromUrl, setParentRoomFromUrl] = useState<string | null>(null);

  // Publish our app userId as a participant attribute so the host's breakout
  // panel can map LiveKit identities → userIds. One-shot on mount.
  useEffect(() => {
    if (!userId || !localParticipant) return;
    if (localParticipant.attributes?.[LK_USER_ID_ATTR] === userId) return;
    localParticipant.setAttributes({ [LK_USER_ID_ATTR]: userId }).catch((err) => {
      console.error('failed to publish lk_user_id', err);
    });
  }, [userId, localParticipant]);

  // Roster used by BreakoutStarter / BreakoutManagePanel. We include only
  // participants who have published a userId — anyone without one can't be
  // assigned because the server keys assignments by userId. `peopleUiTick`
  // is in the deps so attribute publishes that arrive after the first render
  // (a guest joining seconds before the host opens the modal) cause a
  // recompute and the guest appears in the list.
  const breakoutRoster = useMemo<BreakoutRosterEntry[]>(() => {
    const out: BreakoutRosterEntry[] = [];
    const seen = new Set<string>();
    const push = (uid: string | undefined | null, name: string) => {
      if (!uid || seen.has(uid)) return;
      seen.add(uid);
      out.push({ userId: uid, name: name || uid });
    };
    // Local user first (so the host sees themselves at the top).
    push(userId || undefined, localParticipant?.identity || 'You');
    for (const p of roomParticipants) {
      if (p === localParticipant) continue;
      const uid = p.attributes?.[LK_USER_ID_ATTR];
      push(uid, p.identity || uid || 'Participant');
    }
    return out;
  }, [roomParticipants, localParticipant, userId, peopleUiTick]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const parent = sp.get('parent');
    setParentRoomFromUrl(parent);
    setIsInsideBreakout(!!parent);
  }, []);

  // Use the parent room id for breakout polling so child rooms also see "active" state.
  const breakoutPollRoom = parentRoomFromUrl || room;

  const refetchBreakout = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/breakout?parentRoomId=${encodeURIComponent(breakoutPollRoom)}`);
      const data = await res.json();
      if (data?.success) setBreakoutSession(data.session || null);
    } catch (e) {
      console.error('breakout refetch failed', e);
    }
  }, [breakoutPollRoom]);

  useEffect(() => { refetchBreakout(); }, [refetchBreakout]);

  // Cross-room polling. Data-channel messages don't traverse LiveKit rooms,
  // so we poll the parent's breakout session whenever a session is known to
  // exist (or we're sitting in a child room awaiting one). This drives both
  // session-end detection and force-move propagation.
  useEffect(() => {
    const sessionActive = !!breakoutSession && breakoutSession.status === 'active';
    if (!sessionActive && !isInsideBreakout) return;
    const t = setInterval(() => { refetchBreakout(); }, 5000);
    return () => clearInterval(t);
  }, [breakoutSession?._id, breakoutSession?.status, isInsideBreakout, refetchBreakout]);

  // Auto-route: react to (a) the host force-moving the local user to a
  // different group, (b) the session ending while we're in a child room.
  // Only the host (canModerate) is exempt — they roam freely via jump pills.
  useEffect(() => {
    if (!userId) return;
    if (canModerate) return;

    // Session ended → bounce child-room participants back to main.
    if (!breakoutSession || breakoutSession.status !== 'active') {
      if (isInsideBreakout && parentRoomFromUrl) {
        toast({
          title: 'Breakout ended — returning to main service',
          className: 'bg-white/10 border-none text-white',
        });
        router.push(`/meeting/${parentRoomFromUrl}`);
      }
      return;
    }

    const target = breakoutSession.assignments?.[userId] || 0;
    const currentGroup = isInsideBreakout
      ? (breakoutSession.groups.find((g) => g.roomId === room)?.index || 0)
      : 0;
    if (target === currentGroup) return;

    if (target === 0) {
      // Host moved them back to the main service.
      if (isInsideBreakout && parentRoomFromUrl) {
        toast({
          title: 'Returning you to the main service',
          className: 'bg-white/10 border-none text-white',
        });
        router.push(`/meeting/${parentRoomFromUrl}`);
      }
      return;
    }

    const targetGroup = breakoutSession.groups.find((g) => g.index === target);
    if (!targetGroup) return;
    const parentId = parentRoomFromUrl || room;
    toast({
      title: `Joining ${targetGroup.name}`,
      className: 'bg-white/10 border-none text-white',
    });
    router.push(`/meeting/${encodeURIComponent(targetGroup.roomId)}?parent=${encodeURIComponent(parentId)}`);
  }, [
    breakoutSession,
    userId,
    canModerate,
    isInsideBreakout,
    parentRoomFromUrl,
    room,
    router,
    toast,
  ]);

  const startBreakout = async (groups: { name: string }[], assignments: Record<string, number>) => {
    if (!userId) {
      toast({ title: 'Sign in required', variant: 'destructive' });
      return;
    }
    try {
      const res = await fetch('/api/v1/breakout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', parentRoomId: room, hostUserId: userId, groups, assignments }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not open breakouts');
      setBreakoutSession(data.session);
      setShowBreakoutStarter(false);
      broadcast({ type: 'breakout:open', id: data.session._id });
      toast({
        title: '👥 Breakout rooms open',
        description: `${data.session.groups.length} groups ready.`,
        className: 'bg-white/10 border-none text-white',
      });
    } catch (e: any) {
      toast({ title: 'Could not open breakouts', description: e?.message, variant: 'destructive' });
    }
  };

  const assignParticipant = async (targetUserId: string, groupIndex: number) => {
    if (!breakoutSession || !userId) return;
    try {
      const res = await fetch('/api/v1/breakout', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: breakoutSession._id,
          hostUserId: userId,
          action: 'assign',
          userId: targetUserId,
          groupIndex,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not move participant');
      // Optimistic local update so the host's UI reflects the move immediately;
      // the next poll will reconcile with the server.
      setBreakoutSession((prev) => {
        if (!prev) return prev;
        const nextAssignments = { ...(prev.assignments || {}) };
        if (groupIndex === 0) delete nextAssignments[targetUserId];
        else nextAssignments[targetUserId] = groupIndex;
        return { ...prev, assignments: nextAssignments };
      });
      broadcast({ type: 'breakout:assigned' });
    } catch (e: any) {
      toast({ title: 'Could not move participant', description: e?.message, variant: 'destructive' });
    }
  };

  const closeBreakout = async () => {
    if (!breakoutSession || !userId) return;
    try {
      const res = await fetch('/api/v1/breakout', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: breakoutSession._id, hostUserId: userId, status: 'closed' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not close');
      setBreakoutSession(null);
      broadcast({ type: 'breakout:close' });
    } catch (e: any) {
      toast({ title: 'Could not close breakouts', description: e?.message, variant: 'destructive' });
    }
  };

  // --- Altar Call state (host triggers; broadcast to all; persisted to DB) ---
  const [altarCall, setAltarCall] = useState<AltarCallShape | null>(null);
  const [showAltarStarter, setShowAltarStarter] = useState(false);

  const refetchAltar = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/altar-call?roomId=${encodeURIComponent(room)}`);
      const data = await res.json();
      if (data?.success) setAltarCall(data.call || null);
    } catch (e) {
      console.error('altar refetch failed', e);
    }
  }, [room]);

  // Look up active altar on mount so re-joiners see it immediately.
  useEffect(() => {
    refetchAltar();
  }, [refetchAltar]);

  const startAltarCall = async (type: string, promptText: string) => {
    if (!userId) {
      toast({ title: 'Sign in required to call to altar', variant: 'destructive' });
      return;
    }
    try {
      const res = await fetch('/api/v1/altar-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', roomId: room, hostUserId: userId, type, prompt: promptText }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not start altar call');
      setAltarCall(data.call);
      broadcast({ type: 'altar:open', id: data.call._id });
      toast({
        title: '✝️ Altar is open',
        description: 'The congregation can now respond.',
        className: 'bg-white/10 border-none text-white',
      });
    } catch (e: any) {
      toast({ title: 'Could not start altar call', description: e?.message, variant: 'destructive' });
    }
  };

  const closeAltarCall = async () => {
    if (!altarCall || !userId) return;
    try {
      const res = await fetch('/api/v1/altar-call', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: altarCall._id, hostUserId: userId, status: 'closed' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not close');
      setAltarCall(null);
      broadcast({ type: 'altar:close' });
    } catch (e: any) {
      toast({ title: 'Could not close altar', description: e?.message, variant: 'destructive' });
    }
  };

  // Host-only: end the call for everyone. Deletes the LiveKit room — every
  // participant (including host) is disconnected immediately by the server.
  const endCallForAll = async () => {
    if (!userId) {
      toast({ title: 'Sign in required to end the call', variant: 'destructive' });
      return;
    }
    try {
      // Tell every peer to wipe their whiteboard before they get disconnected.
      // publishData doesn't echo to sender, so clear the host's local copy by hand.
      try {
        broadcast({ type: 'whiteboard:clear' });
      } catch { /* ignore — we're tearing down anyway */ }
      whiteboardSceneRef.current = null;
      whiteboardClearRef.current?.();
      setShowWhiteboard(false);
      setMyWhiteboardAccess('idle');

      const res = await fetch('/api/livekit/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end', room, callerUserId: userId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not end call');
      // Server will disconnect us too; onLeave is the local fallback for UI cleanup.
      onLeave?.();
    } catch (e: any) {
      toast({ title: 'Could not end call', description: e?.message, variant: 'destructive' });
    }
  };

  // --- Recording state ---
  const [recording, setRecording] = useState<{ egressId: string; status: string } | null>(null);
  const [recordingBusy, setRecordingBusy] = useState(false);

  // Poll for active recording on mount + every 10s while recording.
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/livekit/recording?roomId=${encodeURIComponent(room)}&status=recording`);
        const data = await res.json();
        if (cancelled) return;
        const active = data?.recordings?.[0];
        if (active) setRecording({ egressId: active.egressId, status: active.status });
        else setRecording(null);
      } catch {
        /* ignore */
      }
    };
    poll();
    const t = setInterval(poll, 10000);
    return () => { cancelled = true; clearInterval(t); };
  }, [room]);

  const startRecording = async () => {
    if (!userId) {
      toast({ title: 'Sign in required to record', variant: 'destructive' });
      return;
    }
    setRecordingBusy(true);
    try {
      const res = await fetch('/api/livekit/recording', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', room, callerUserId: userId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not start recording');
      setRecording({ egressId: data.recording.egressId, status: data.recording.status });
      toast({ title: '🔴 Recording started', className: 'bg-white/10 border-none text-white' });
    } catch (e: any) {
      toast({ title: 'Recording failed', description: e?.message, variant: 'destructive' });
    } finally {
      setRecordingBusy(false);
    }
  };

  const stopRecording = async () => {
    if (!userId || !recording) return;
    setRecordingBusy(true);
    try {
      const res = await fetch('/api/livekit/recording', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop', room, callerUserId: userId, egressId: recording.egressId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not stop recording');
      setRecording(null);
      toast({ title: '⏹ Recording stopped — uploading…', className: 'bg-white/10 border-none text-white' });
    } catch (e: any) {
      toast({ title: 'Stop failed', description: e?.message, variant: 'destructive' });
    } finally {
      setRecordingBusy(false);
    }
  };

  const broadcast = async (payload: Record<string, unknown>) => {
    try {
      const data = new TextEncoder().encode(JSON.stringify(payload));
      await localParticipant.publishData(data, { reliable: true });
    } catch (err) {
      console.error('publishData failed', err);
    }
  };

  const sendReaction = async (emoji: string) => {
    spawnFloatingReaction(emoji);
    await broadcast({ type: 'reaction', emoji });
  };

  const startLyrics = async (verses: string[]) => {
    setLyricsVerses(verses);
    setLyricsIndex(0);
    setShowComposer(false);
    await broadcast({ type: 'lyrics:start', verses, index: 0 });
  };
  const stopLyrics = async () => {
    setLyricsVerses([]);
    setLyricsIndex(0);
    await broadcast({ type: 'lyrics:stop' });
  };
  const stepLyrics = async (delta: 1 | -1) => {
    setLyricsIndex((i: number) => {
      const next = Math.max(0, Math.min(lyricsVerses.length - 1, i + delta));
      broadcast({ type: 'lyrics:index', index: next });
      return next;
    });
  };

  useEffect(() => {
    const onAttrs = () => bumpPeopleUi();
    const onData = (payload: Uint8Array, participant?: Participant) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data.type === 'reaction') {
          spawnFloatingReaction(data.emoji);
          toast({
            description: `${participant?.identity || 'Someone'} sent ${data.emoji}`,
            className: "bg-white/10 border-none text-white w-fit mx-auto rounded-full px-4 py-1 mb-20",
          });
        } else if (data.type === 'lyrics:start') {
          setLyricsVerses(Array.isArray(data.verses) ? data.verses : []);
          setLyricsIndex(typeof data.index === 'number' ? data.index : 0);
        } else if (data.type === 'lyrics:stop') {
          setLyricsVerses([]);
          setLyricsIndex(0);
        } else if (data.type === 'lyrics:index') {
          setLyricsIndex(typeof data.index === 'number' ? data.index : 0);
        } else if (data.type === 'note:new') {
          // Someone added a meeting note → trigger panel refetch.
          setNotesBumpKey((k) => k + 1);
        } else if (data.type === 'whiteboard:open') {
          setShowWhiteboard(true);
        } else if (data.type === 'whiteboard:close') {
          setShowWhiteboard(false);
        } else if (data.type === 'whiteboard:op') {
          if (Array.isArray(data.elements)) {
            whiteboardSceneRef.current = data.elements;
            whiteboardIncomingRef.current?.(data.elements);
          }
        } else if (data.type === 'whiteboard:request') {
          // A peer just opened the board and wants the current scene.
          // Anyone holding cached state replays it — last write wins on the requester.
          if (whiteboardSceneRef.current && whiteboardSceneRef.current.length) {
            broadcast({ type: 'whiteboard:op', elements: whiteboardSceneRef.current });
          }
        } else if (data.type === 'whiteboard:clear') {
          // Host ended the call — wipe local cache and the canvas, close the
          // overlay so anyone who reopens starts blank.
          whiteboardSceneRef.current = null;
          whiteboardClearRef.current?.();
          setShowWhiteboard(false);
          // Reset edit access — a fresh session means re-asking next time.
          setMyWhiteboardAccess('idle');
        } else if (data.type === 'whiteboard:access-request') {
          // Host-only: prompt allow/deny inline in a toast.
          if (!canModerateRef.current) return;
          const requesterId = typeof data.identity === 'string' ? data.identity : '';
          const requesterName = typeof data.name === 'string' ? data.name : 'Someone';
          if (!requesterId) return;
          let toastObj: { dismiss: () => void } | null = null;
          const respond = (allow: boolean) => {
            broadcast({
              type: allow ? 'whiteboard:access-granted' : 'whiteboard:access-denied',
              identity: requesterId,
            });
            toastObj?.dismiss();
          };
          toastObj = toast({
            title: 'Whiteboard access request',
            description: (
              <div className="flex flex-col gap-2">
                <span>{requesterName} wants edit access.</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => respond(true)}
                    className="rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 py-1 text-sm font-medium text-white"
                  >
                    Allow
                  </button>
                  <button
                    type="button"
                    onClick={() => respond(false)}
                    className="rounded-md bg-red-600/80 hover:bg-red-500 px-3 py-1 text-sm font-medium text-white"
                  >
                    Deny
                  </button>
                </div>
              </div>
            ),
            className: 'bg-white/10 border-none text-white',
          });
        } else if (data.type === 'whiteboard:access-granted') {
          if (data.identity && data.identity === localIdentityRef.current) {
            setMyWhiteboardAccess('granted');
            toast({
              description: 'Host granted whiteboard edit access.',
              className: 'bg-emerald-500/15 border-none text-white',
            });
          }
        } else if (data.type === 'whiteboard:access-denied') {
          if (data.identity && data.identity === localIdentityRef.current) {
            setMyWhiteboardAccess('denied');
            toast({
              description: 'Host denied whiteboard edit access.',
              variant: 'destructive',
            });
          }
        } else if (data.type === 'bible:share') {
          if (typeof data.ref === 'string' && typeof data.translation === 'string') {
            setSharedBible({ ref: data.ref, translation: data.translation });
          }
        } else if (data.type === 'bible:clear') {
          setSharedBible(null);
        } else if (data.type === 'altar:open' || data.type === 'altar:close' || data.type === 'altar:response') {
          // Any altar event triggers a refetch — keeps overlay + responders fresh.
          refetchAltar();
        } else if (data.type === 'breakout:open' || data.type === 'breakout:close' || data.type === 'breakout:assigned') {
          refetchBreakout();
        } else if (data.type === 'music:now-playing') {
          setNowPlaying(typeof data.title === 'string' ? data.title : null);
        }
      } catch (e) {
        console.error('Failed to parse incoming data:', e);
      }
    };

    // Bridge: NotesPanel dispatches a window event after saving a note.
    // We forward it to all participants so their panels refetch.
    const onLocalNoteAdded = () => {
      broadcast({ type: 'note:new' });
    };
    // Same bridge pattern for altar responses.
    const onLocalAltarResponse = () => {
      broadcast({ type: 'altar:response' });
    };

    lkRoom.on(RoomEvent.ParticipantAttributesChanged, onAttrs);
    lkRoom.on(RoomEvent.DataReceived, onData);
    if (typeof window !== 'undefined') {
      window.addEventListener('singalong:note-broadcast', onLocalNoteAdded);
      window.addEventListener('singalong:altar-response', onLocalAltarResponse);
    }

    return () => {
      lkRoom.off(RoomEvent.ParticipantAttributesChanged, onAttrs);
      lkRoom.off(RoomEvent.DataReceived, onData);
      if (typeof window !== 'undefined') {
        window.removeEventListener('singalong:note-broadcast', onLocalNoteAdded);
        window.removeEventListener('singalong:altar-response', onLocalAltarResponse);
      }
    };
  }, [lkRoom, toast, refetchAltar, refetchBreakout]);

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ]
  );

  const screenShareTrack = useMemo(
    () => tracks.find((t) => t.source === Track.Source.ScreenShare),
    [tracks]
  );
  const participantTracks = useMemo(
    () => tracks.filter((t) => t.source === Track.Source.Camera),
    [tracks]
  );
  const isLocalPresenting = localParticipant.isScreenShareEnabled;

  const toggleCamera = async () => {
    const devices = await Room.getLocalDevices('videoinput');
    if (devices.length < 2) return;
    
    const currentDeviceId = localParticipant.getTrackPublication(Track.Source.Camera)?.videoTrack?.mediaStreamTrack.getSettings().deviceId;
    const nextDevice = devices.find(d => d.deviceId !== currentDeviceId) || devices[0];
    
    if (nextDevice) {
      await localParticipant.setCameraEnabled(false);
      await localParticipant.setCameraEnabled(true, { deviceId: nextDevice.deviceId });
    }
  };

  const showFloatingTile = isMobile 
    ? participantTracks.length >= 2 
    : participantTracks.length > 4;

  const peopleInCall = roomParticipants;
  const connectionState = useConnectionState();

  if (connectionState === 'connecting') return <Loader label="Connecting to Meeting..." />;
  if (connectionState === 'reconnecting') return <Loader label="Reconnecting to Meeting..." />;

  return (
    <div className="meet-bg meet-root h-screen w-full flex flex-col overflow-hidden text-white">
      {isLocalPresenting && (
        <div className="meet-status-overlay" role="status">
          <span className="meet-status-text">You’re presenting to everyone</span>
          <button 
            type="button"
            className="stop-presenting-btn"
            onClick={() => localParticipant.setScreenShareEnabled(false)}
          >
            Stop presenting
          </button>
        </div>
      )}

      <MeetCaptionsStrip enabled={captionsOn} onClose={() => setCaptionsOn(false)} />

      {recording && (
        <div className="recording-indicator" role="status" aria-live="polite">
          <span className="recording-dot" />
          <span>REC</span>
        </div>
      )}

      <FloatingReactionsLayer reactions={floatingReactions} />

      {lyricsActive && isWorshipMode && (
        <LyricsOverlay
          verses={lyricsVerses}
          index={lyricsIndex}
          onPrev={() => stepLyrics(-1)}
          onNext={() => stepLyrics(1)}
          onClose={stopLyrics}
          isHost={isHost}
        />
      )}

      {showComposer && isHost && (
        <LyricsComposer onStart={startLyrics} onClose={() => setShowComposer(false)} />
      )}

      {showPrayerModal && (
        <PrayerRequestModal
          roomId={room}
          senderId={localParticipant.identity}
          senderName={localParticipant.identity}
          onClose={() => setShowPrayerModal(false)}
          onSubmitted={() => {
            broadcast({ type: 'prayer:new' });
          }}
        />
      )}

      {showGiveModal && (
        <GiveOfferingModal onClose={() => setShowGiveModal(false)} />
      )}

      {showWhiteboard && isBusinessMode && (
        <WhiteboardOverlay
          initialElements={whiteboardSceneRef.current}
          incomingRef={whiteboardIncomingRef}
          clearRef={whiteboardClearRef}
          broadcast={broadcast}
          canEdit={canEditWhiteboard}
          onClose={() => {
            setShowWhiteboard(false);
            // Only the host's close is global; non-hosts close their own
            // overlay locally (the host's broadcast still controls everyone).
            if (isHost) broadcast({ type: 'whiteboard:close' });
          }}
        />
      )}

      {altarCall && isWorshipMode && (
        <AltarCallOverlay
          call={altarCall}
          isHost={canModerate}
          selfUserId={userId}
          selfName={localParticipant?.identity || 'Friend'}
          onClose={closeAltarCall}
          onRefresh={refetchAltar}
        />
      )}

      {showAltarStarter && canModerate && (
        <AltarCallStarter
          onStart={startAltarCall}
          onClose={() => setShowAltarStarter(false)}
        />
      )}

      {/* Music Player: host-only floating panel; only mounted when open. */}
      {showMusicPlayer && canModerate && isWorshipMode && (
        <MusicPlayer
          localParticipant={localParticipant}
          workspaceId={roomWorkspaceId}
          onClose={() => setShowMusicPlayer(false)}
          onNowPlayingChange={handleNowPlayingChange}
        />
      )}

      {/* "Now playing" pill — visible to everyone when the host is playing audio. */}
      {nowPlaying && (
        <div className="now-playing-pill" role="status">
          <FileMusic size={13} className="text-deep-gold" />
          <span className="now-playing-label">Now playing:</span>
          <span className="now-playing-name" title={nowPlaying}>{nowPlaying}</span>
        </div>
      )}

      {/* Breakout: host gets the management panel; non-hosts who weren't pre-assigned see a picker. */}
      {breakoutSession && canModerate && (
        <BreakoutManagePanel
          session={breakoutSession}
          parentRoomId={parentRoomFromUrl || room}
          currentRoomId={room}
          roster={breakoutRoster}
          hostUserId={userId}
          onAssign={assignParticipant}
          onClose={closeBreakout}
        />
      )}
      {breakoutSession && !canModerate && !isInsideBreakout
        && !(userId && breakoutSession.assignments?.[userId]) && (
          <BreakoutPicker
            session={breakoutSession}
            parentRoomId={room}
          />
        )}

      {/* Inside a child breakout room: persistent banner with "Return to main service". */}
      {isInsideBreakout && parentRoomFromUrl && (
        <div className="breakout-return-banner" role="status">
          <Group size={14} className="text-deep-gold" />
          <span>You're in a breakout group.</span>
          <button
            type="button"
            onClick={() => router.push(`/meeting/${parentRoomFromUrl}`)}
            className="breakout-return-btn"
          >
            <ArrowLeft size={14} /> Return to main service
          </button>
        </div>
      )}

      {showBreakoutStarter && canModerate && (
        <BreakoutStarter
          onStart={startBreakout}
          onClose={() => setShowBreakoutStarter(false)}
          roster={breakoutRoster}
          hostUserId={userId}
        />
      )}

      <div className="meet-stage flex-1 flex overflow-hidden min-h-0 pb-[100px] sm:pb-[88px] relative">
        {/* Mobile Top Bar (Google Meet Style) */}
        <div className="meet-mobile-top-bar sm:hidden">
          <button type="button" className="meet-mobile-util" onClick={toggleCamera} title="Switch camera">
            <Video size={20} />
          </button>
        </div>

        {screenShareTrack ? (
          <div className="meet-presentation-wrap flex flex-1 min-h-0 overflow-hidden">
            <div className="presentation-container">
              <div className="presentation-toolbar" aria-hidden>
                <span className="presentation-toolbar-label">
                  {isLocalPresenting ? 'You are presenting' : 'Presentation'}
                </span>
              </div>
              <div className="presentation-main">
                {isLocalPresenting ? (
                  <PresentingPlaceholder />
                ) : (
                  <ParticipantTile trackRef={screenShareTrack} />
                )}
              </div>
            </div>
            <aside className="presentation-sidebar" aria-label="Video strip">
              <div className="presentation-sidebar-label">In call</div>
              <div className="presentation-sidebar-tiles">
                {participantTracks.map((t) => (
                  <CustomTile key={`${t.participant.sid}-${t.source}`} trackRef={t} isThumb={true} />
                ))}
              </div>
            </aside>
          </div>
        ) : (
          <div className="meet-grid-wrap flex-1 px-4 sm:px-8 flex items-center justify-center transition-all min-h-0 relative">
            <div
              className={`meet-video-grid gap-3 w-full h-full max-h-[calc(100vh-120px)] ${
                showFloatingTile
                  ? 'grid-cols-1 sm:grid-cols-2 max-w-6xl' 
                  : participantTracks.length === 4
                    ? 'grid-cols-2 max-w-6xl' // 2x2 for 4 users
                    : participantTracks.length === 3
                      ? 'grid-cols-1 sm:grid-cols-3 max-w-7xl'
                      : participantTracks.length === 2
                        ? 'grid-cols-1 sm:grid-cols-2 max-w-6xl'
                        : 'grid-cols-1 max-w-5xl'
              }`}
            >
              {showFloatingTile
                ? /* Show only remote in grid */
                  participantTracks
                    .filter((t) => !t.participant.isLocal)
                    .map((t) => <CustomTile key={`${t.participant.sid}-${t.source}`} trackRef={t} />)
                : /* Show everyone in grid */
                  participantTracks.map((t) => (
                    <CustomTile key={`${t.participant.sid}-${t.source}`} trackRef={t} />
                  ))}
            </div>

            {/* Floating Local Tile: Based on device-specific threshold */}
            {showFloatingTile && (
              <div className="local-floating-tile">
                {participantTracks.find((t) => t.participant.isLocal) && (
                  <CustomTile 
                    trackRef={participantTracks.find((t) => t.participant.isLocal)!} 
                    isThumb={true} 
                  />
                )}
              </div>
            )}
          </div>
        )}

        {activePanel && (
          <SidebarPanel
            type={activePanel}
            onClose={() => setActivePanel(null)}
            participants={peopleInCall}
            room={room}
            isHost={canModerate}
            callerUserId={userId}
            authorName={localParticipant?.identity || 'Anonymous'}
            notesBumpKey={notesBumpKey}
            isWorshipMode={isWorshipMode}
            sharedBible={sharedBible}
            onShareBible={shareBible}
            onClearSharedBible={clearSharedBible}
            waitingEntries={waitingEntries}
            onAdmitGuest={admitGuest}
            onDenyGuest={denyGuest}
            waitingBusyKey={waitingBusyKey}
            allowAnyone={allowAnyone}
            allowAnyoneBusy={allowAnyoneBusy}
            onToggleAllowAnyone={toggleAllowAnyone}
          />
        )}
      </div>

      <GoogleMeetBottomBar
        room={room}
        onLeave={onLeave}
        activePanel={activePanel}
        setActivePanel={setActivePanel}
        participantCount={peopleInCall.length}
        lyricsActive={lyricsActive}
        onToggleLyricsComposer={() => setShowComposer((s: boolean) => !s)}
        onStopLyrics={stopLyrics}
        sendReaction={sendReaction}
        onOpenPrayer={() => setShowPrayerModal(true)}
        onOpenGive={() => setShowGiveModal(true)}
        isHost={isHost}
        canModerate={canModerate}
        recording={recording}
        recordingBusy={recordingBusy}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        isWorshipMode={isWorshipMode}
        isBusinessMode={isBusinessMode}
        whiteboardOpen={showWhiteboard}
        onToggleWhiteboard={toggleWhiteboard}
        whiteboardAccessState={isHost ? 'host' : myWhiteboardAccess}
        altarActive={!!altarCall}
        onOpenAltarStarter={() => setShowAltarStarter(true)}
        onCloseAltar={closeAltarCall}
        breakoutActive={!!breakoutSession}
        onOpenBreakoutStarter={() => setShowBreakoutStarter(true)}
        onCloseBreakout={closeBreakout}
        musicPlayerOpen={showMusicPlayer}
        onToggleMusicPlayer={() => setShowMusicPlayer((s: boolean) => !s)}
        onEndForAll={endCallForAll}
        waitingCount={waitingEntries.length}
      />
    </div>
  );
};

const LiveKitMeeting = ({ room, identity, userId, admitKey, onDisconnected }: LiveKitMeetingProps) => {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  // Set when the parent forces a remount (e.g. switching between a parent
  // room and one of its breakouts via `key={room}`). LiveKit fires its
  // onDisconnected during teardown — without this guard we'd interpret the
  // remount as a user-initiated leave and bounce them to the feedback page.
  const isUnmountingRef = useRef(false);
  // Reset on (re)mount so React 18 StrictMode's dev mount→unmount→remount
  // dance doesn't leave the ref stuck `true` and silently swallow Leave clicks.
  useEffect(() => {
    isUnmountingRef.current = false;
    return () => { isUnmountingRef.current = true; };
  }, []);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        // userId lets the server short-circuit the host past the waiting room.
        // admit_key is required for everyone else — set by the meeting page once
        // the host clicks Admit.
        const params = new URLSearchParams({ room, identity });
        if (userId) params.set('user_id', userId);
        if (admitKey) params.set('admit_key', admitKey);
        const resp = await fetch(`/api/livekit/token?${params.toString()}`);
        const data = await resp.json();

        if (data.token) {
          setToken(data.token);
        } else {
          throw new Error(data.error || 'Failed to fetch token');
        }
      } catch (e: any) {
        console.error('Token fetch error:', e);
        setError('We couldn’t connect you to the meeting. Please try again.');
        toast({
          title: 'Connection Error',
          description: 'Could not connect to the meeting. Please try again.',
          variant: 'destructive',
        });
      }
    };

    fetchToken();
  }, [room, identity, userId, admitKey, toast]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#202124] text-white p-4">
        <h2 className="text-2xl font-bold mb-4">Oops! Something went wrong.</h2>
        <p className="text-gray-400 mb-6">{error}</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="bg-blue-600 px-6 py-2 rounded-md hover:bg-blue-700 transition"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (!token) return <Loader />;

  // User-initiated leave (UI button). Always navigates — no isUnmounting guard.
  const handleLeave = () => {
    if (onDisconnected) {
      onDisconnected();
    } else {
      router.push('/?show_feedback=1');
    }
  };

  // LiveKit room disconnect event. Guarded against StrictMode's dev
  // mount→unmount→remount dance, which fires a phantom disconnect we
  // must not interpret as a user-initiated leave.
  const handleRoomDisconnected = () => {
    if (isUnmountingRef.current) return;
    handleLeave();
  };

  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || ''}
      onDisconnected={handleRoomDisconnected}
      onError={(err) => {
        if (isUnmountingRef.current) return;
        console.error('LiveKit room error:', err);
        toast({
          title: 'Connection Error',
          description: 'We hit a snag with the meeting. Please try again.',
          variant: 'destructive',
        });
      }}
      data-lk-theme="default"
      style={{ height: '100vh' }}
    >
      <LayoutContextProvider>
        <GoogleMeetLayout room={room} onLeave={handleLeave} userId={userId} />
      </LayoutContextProvider>
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
};

export default LiveKitMeeting;



