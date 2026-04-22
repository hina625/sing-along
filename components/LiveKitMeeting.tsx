'use client';

import React, { useEffect, useState, useRef, useMemo, useReducer } from 'react';
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
} from '@livekit/components-react';
import { Track, Participant, Room, RoomEvent, ParticipantEvent, LocalVideoTrack } from 'livekit-client';
import { BackgroundProcessor } from '@livekit/track-processors';
import '@livekit/components-styles';
import { useRouter } from 'next/navigation';
import Loader from './Loader';
import { useToast } from './ui/use-toast';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, 
  Hand, Smile, Captions, 
  MonitorUp, Info, Users, MessageSquare, 
  LayoutTemplate, Shield, X, ChevronUp, 
  Pin, Monitor, AppWindow, Copy, Check, Send,
  Sparkles, Image as ImageIcon, CircleDashed, Eraser
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

function isHandRaised(p: { attributes?: Record<string, string> }) {
  return p.attributes?.[HAND_RAISED_ATTR] === '1';
}

interface LiveKitMeetingProps {
  room: string;
  identity: string;
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
      data-lk-speaking={isSpeaking}
      data-lk-mic={micOn}
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
 * Reaction Tray Component
 */
const ReactionTray = ({ onSelect }: { onSelect: (emoji: string) => void }) => {
  const emojis = ['💖', '👍', '🎉', '👏', '😂', '😮', '😢', '🤔', '👎'];
  return (
    <div className="reaction-tray">
      {emojis.map((emoji) => (
        <div 
          key={emoji} 
          className="reaction-emoji" 
          onClick={() => onSelect(emoji)}
        >
          {emoji}
        </div>
      ))}
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
              ? 'Room transcriptions will show here when your LiveKit pipeline sends them. Speech-to-text in the browser needs Chrome or Edge.'
              : 'Listening to your microphone… Room transcriptions from LiveKit also appear here when available.'}
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
  const scrollRef = useRef<HTMLDivElement>(null);
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
            
            return (
              <div key={msg._id || i} className={`flex flex-col ${isLocal ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-baseline gap-2 mb-1 ${isLocal ? 'flex-row-reverse' : 'flex-row'}`}>
                  <span className="text-xs font-medium text-[#5F6368]">{senderName}</span>
                  <span className="text-[10px] text-[#70757A]">{timestamp}</span>
                </div>
                <div className={`chat-bubble ${isLocal ? 'chat-bubble-local' : 'chat-bubble-remote'} chat-bubble-on-light shadow-sm`}>
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={onSend} className="p-4 bg-white border-t border-[#DADCE0] flex items-center gap-2">
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
const sidebarTitle = (t: 'chat' | 'people' | 'info') => {
  if (t === 'chat') return 'In-call messages';
  if (t === 'people') return 'People';
  return 'Meeting details';
};

const SidebarPanel = ({ 
  type, 
  onClose,
  participants,
  room,
}: { 
  type: 'chat' | 'people' | 'info'; 
  onClose: () => void;
  participants: Participant[];
  room: string;
}) => {
  const [copied, setCopied] = useState(false);
  const meetingUrl = typeof window !== 'undefined' ? window.location.href : '';

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
            {participants.map((p) => (
              <div key={p.sid} className="meet-people-row">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="meet-people-avatar">
                    {p.identity?.charAt(0).toUpperCase()}
                  </div>
                  <span className="meet-people-name truncate">
                    {p.identity}
                    {p.isLocal && <span className="meet-people-you"> (You)</span>}
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
                </div>
              </div>
            ))}
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
}: { 
  room: string, 
  onLeave: () => void,
  activePanel: 'chat' | 'people' | 'info' | null,
  setActivePanel: (panel: 'chat' | 'people' | 'info' | null) => void,
  participantCount: number,
  captionsOn: boolean,
  onCaptionsChange: (next: boolean) => void,
}) => {
  const { localParticipant } = useLocalParticipant();
  const [showReactions, setShowReactions] = useState(false);
  const [handRaised, setHandRaised] = useState(() => isHandRaised(localParticipant));
  const { toast } = useToast();
  
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

  useEffect(() => {
    const applyProcessor = async () => {
      const videoTrack = localParticipant.getTrackPublication(Track.Source.Camera)?.videoTrack as LocalVideoTrack;
      if (!videoTrack) return;

      try {
        if (bgMode === 'none') {
          if (videoTrack.processor) {
            await videoTrack.stopProcessor();
          }
          return;
        }

        if (!processorRef.current) {
          processorRef.current = BackgroundProcessor({ 
            mode: bgMode === 'blur' ? 'background-blur' : 'virtual-background',
            imagePath: bgImage,
            blurRadius: 20,
          });
        }

        if (videoTrack.processor !== processorRef.current) {
          await videoTrack.setProcessor(processorRef.current);
        }

        // Switch modes if already applied
        await processorRef.current.switchTo({
          mode: bgMode === 'blur' ? 'background-blur' : 'virtual-background',
          imagePath: bgImage,
          blurRadius: 20,
        });
      } catch (err) {
        console.error('Failed to apply background processor:', err);
      }
    };

    applyProcessor();
  }, [bgMode, bgImage, localParticipant, localParticipant.isCameraEnabled]);

  const startShare = () => localParticipant.setScreenShareEnabled(true);
  const stopShare = () => localParticipant.setScreenShareEnabled(false);

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
        {showReactions && <ReactionTray onSelect={() => setShowReactions(false)} />}
      </div>

      <div className="meet-bar-left">
        <Clock />
        <span className="meet-bar-sep" aria-hidden>|</span>
        <span className="meet-meeting-code" title="Meeting code">
          {formatRoomId(room)}
        </span>
      </div>

      <div className="meet-bar-center">
        <div className="meet-controls-cluster" role="toolbar" aria-label="Call controls">
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

          <div className={`meet-split-button ${!camEnabled ? 'active-red' : ''}`}>
            <button 
              type="button"
              className="meet-split-button-main"
              title={camEnabled ? 'Turn off camera' : 'Turn on camera'}
              aria-pressed={camEnabled}
              onClick={() => localParticipant.setCameraEnabled(!camEnabled)}
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
                    onClick={() => localParticipant.setCameraEnabled(true, { deviceId: device.deviceId })}
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

          <span className="meet-cluster-divider" aria-hidden />

          <button
            type="button"
            className={`meet-icon-button ${captionsOn ? 'meet-icon-button-active' : ''}`}
            title={captionsOn ? 'Turn off captions' : 'Turn on captions'}
            aria-pressed={captionsOn}
            onClick={() => onCaptionsChange(!captionsOn)}
          >
            <Captions />
          </button>
          <button type="button" className="meet-icon-button" title="React" onClick={() => setShowReactions(!showReactions)}><Smile /></button>
          
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

          <button
            type="button"
            className={`meet-icon-button ${handRaised ? 'meet-icon-button-active' : ''}`}
            title={handRaised ? 'Lower hand' : 'Raise hand'}
            aria-pressed={handRaised}
            onClick={toggleRaiseHand}
          >
            <Hand />
          </button>

          <span className="meet-cluster-divider" aria-hidden />

          <button type="button" className="meet-icon-button hangup" title="Leave call" onClick={onLeave}>
            <PhoneOff />
          </button>
        </div>
      </div>

      <div className="meet-bar-right">
        <button 
          type="button"
          className={`meet-utility-button ${activePanel === 'info' ? 'meet-utility-active' : ''}`} 
          title="Meeting details"
          onClick={() => setActivePanel(activePanel === 'info' ? null : 'info')}
        >
          <Info size={22} />
        </button>
        <button 
          type="button"
          className={`meet-utility-button meet-utility-with-badge ${activePanel === 'people' ? 'meet-utility-active' : ''}`} 
          title="People"
          onClick={() => setActivePanel(activePanel === 'people' ? null : 'people')}
        >
          <Users size={22} />
          {participantCount > 0 && <span className="meet-badge">{participantCount}</span>}
        </button>
        <button 
          type="button"
          className={`meet-utility-button ${activePanel === 'chat' ? 'meet-utility-active' : ''}`} 
          title="Chat with everyone"
          onClick={() => setActivePanel(activePanel === 'chat' ? null : 'chat')}
        >
          <MessageSquare size={22} />
        </button>
        <button type="button" className="meet-utility-button" title="Activities"><LayoutTemplate size={22} /></button>
        <button type="button" className="meet-utility-button" title="Host controls"><Shield size={22} /></button>
      </div>
    </div>
  );
};

const GoogleMeetLayout = ({ room, onLeave }: { room: string, onLeave: () => void }) => {
  const { localParticipant } = useLocalParticipant();
  const lkRoom = useRoomContext();
  const [activePanel, setActivePanel] = useState<'chat' | 'people' | 'info' | null>(null);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [, bumpPeopleUi] = useReducer((n: number) => n + 1, 0);
  const roomParticipants = useParticipants();

  useEffect(() => {
    const onAttrs = () => bumpPeopleUi();
    lkRoom.on(RoomEvent.ParticipantAttributesChanged, onAttrs);
    return () => {
      lkRoom.off(RoomEvent.ParticipantAttributesChanged, onAttrs);
    };
  }, [lkRoom]);

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

  const peopleInCall = roomParticipants;

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

      <div className="meet-stage flex-1 flex overflow-hidden min-h-0 pb-[88px]">
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
          <div className="meet-grid-wrap flex-1 px-4 sm:px-8 flex items-center justify-center transition-all min-h-0">
            <div
              className={`meet-video-grid gap-3 w-full h-full max-h-[calc(100vh-120px)] ${
                participantTracks.length <= 1
                  ? 'grid-cols-1 max-w-5xl'
                  : participantTracks.length <= 2
                    ? 'grid-cols-2 max-w-6xl'
                    : participantTracks.length <= 4
                      ? 'grid-cols-2 grid-rows-2 max-w-6xl'
                      : 'grid-cols-3 max-w-7xl'
              }`}
            >
              {participantTracks.map((t) => (
                <CustomTile key={`${t.participant.sid}-${t.source}`} trackRef={t} />
              ))}
            </div>
          </div>
        )}

        {activePanel && (
          <SidebarPanel 
            type={activePanel} 
            onClose={() => setActivePanel(null)} 
            participants={peopleInCall}
            room={room}
          />
        )}
      </div>

      <GoogleMeetBottomBar 
        room={room} 
        onLeave={onLeave} 
        activePanel={activePanel} 
        setActivePanel={setActivePanel}
        participantCount={peopleInCall.length}
        captionsOn={captionsOn}
        onCaptionsChange={setCaptionsOn}
      />
    </div>
  );
};

const LiveKitMeeting = ({ room, identity, onDisconnected }: LiveKitMeetingProps) => {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const resp = await fetch(
          `/api/livekit/token?room=${encodeURIComponent(room)}&identity=${encodeURIComponent(identity)}`
        );
        const data = await resp.json();

        if (data.token) {
          setToken(data.token);
        } else {
          throw new Error(data.error || 'Failed to fetch token');
        }
      } catch (e: any) {
        console.error('Token fetch error:', e);
        setError(e.message);
        toast({
          title: 'Connection Error',
          description: 'Could not connect to the meeting server.',
          variant: 'destructive',
        });
      }
    };

    fetchToken();
  }, [room, identity, toast]);

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

  const handleLeave = () => {
    if (onDisconnected) {
      onDisconnected();
    } else {
      router.push('/?show_feedback=1');
    }
  };

  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      onDisconnected={handleLeave}
      data-lk-theme="default"
      style={{ height: '100vh' }}
    >
      <LayoutContextProvider>
        <GoogleMeetLayout room={room} onLeave={handleLeave} />
      </LayoutContextProvider>
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
};

export default LiveKitMeeting;



