'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import axios from 'axios';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { Mic2, Calendar, User as UserIcon, Lock, Globe, AlertTriangle, Clock, Hourglass } from 'lucide-react';
import LiveKitMeeting from '@/components/LiveKitMeeting';
import Loader from '@/components/Loader';

interface TypeParams { id: string }
interface PropsType { params: TypeParams }

interface CountdownTimerProps { endTime: string }

const CountdownTimer: React.FC<CountdownTimerProps> = ({ endTime }) => {
  const { toast } = useToast();
  const router = useRouter();
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const timeLeft = new Date(endTime).getTime() - now.getTime();
      if (timeLeft <= 0) {
        toast({ title: 'Meeting has ended.', duration: 5000 });
        clearInterval(interval);
        router.push('/?show_feedback=1');
        return;
      }
      const minutes = Math.floor(timeLeft / 60000);
      const seconds = Math.floor((timeLeft % 60000) / 1000);
      if ([1, 2, 5].includes(minutes) && seconds === 0) {
        toast({ title: `Less than ${minutes} minute${minutes === 1 ? '' : 's'} left.`, duration: 5000 });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime, toast, router]);
  return null;
};

export interface IRoomDetails {
  end_time: string;
  room_id: string;
  start_time: string;
  user_id: string;
  user_plan: string;
  __v: number;
  _id: string;
  status?: 'private' | 'public';
  // Passcode value is never sent to the client; only the flag.
  passcodeEnabled?: boolean;
}

interface MeetingInfo {
  exists: boolean;
  title: string | null;
  hostFirstName: string | null;
  scheduleTime: string | null;
  startTime: string | null;
  endTime: string | null;
  isScheduledForFuture: boolean;
  hasEnded: boolean;
  isLive: boolean;
  visibility: 'private' | 'public';
  mode: 'worship' | 'business' | 'hybrid';
}

const MODE_LABEL: Record<string, { eyebrow: string; pill: string; emoji: string }> = {
  worship:  { eyebrow: 'Live meeting',   pill: 'Meeting',   emoji: '💼' },
  business: { eyebrow: 'Live meeting',   pill: 'Meeting',   emoji: '💼' },
  // 'hybrid' is the both-toolsets room shape — the default for community workspaces.
  hybrid:   { eyebrow: 'Live gathering', pill: 'Gathering', emoji: '🌍' },
};

type WaitState = 'idle' | 'waiting' | 'admitted' | 'denied';

const MeetingPage = ({ params }: PropsType) => {
  const [guestName, setGuestName] = useState('');
  const [signedInName, setSignedInName] = useState('');
  const [joining, setJoining] = useState(false);
  const { user, isLoaded } = useUser();

  // Prefill the editable name input for signed-in users from sessionStorage
  // (set by the create/join modal) with a fall-through to the Clerk profile.
  useEffect(() => {
    if (!user) return;
    let stored = '';
    try { stored = sessionStorage.getItem('pendingDisplayName') || ''; } catch {}
    const initial = stored.trim() || user.fullName || user.username || user.primaryEmailAddress?.emailAddress || `User-${user.id.slice(-4)}`;
    setSignedInName((prev) => prev || initial);
  }, [user]);
  const [roomDetails, setRoomDetails] = useState<IRoomDetails>();
  const [info, setInfo] = useState<MeetingInfo | null>(null);
  const [infoLoading, setInfoLoading] = useState(true);

  // Admission state — guests need an admit_key from /api/v1/waiting-room
  // before the LiveKit token route will issue them a JWT. The host gets
  // an immediate 'admitted' shortcut on the server.
  const [waitState, setWaitState] = useState<WaitState>('idle');
  const [admitKey, setAdmitKey] = useState<string | null>(null);

  // Passcode entry (only relevant when the room is passcode-protected and the
  // viewer isn't the host). joinError surfaces a wrong/missing passcode.
  const [passcode, setPasscode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setInfoLoading(true);
        const [det, meta] = await Promise.all([
          axios.get(`/api/v1/create-room?room_id=${params.id}`),
          axios.get(`/api/v1/meeting-info?room_id=${params.id}`),
        ]);
        if (cancelled) return;
        setRoomDetails(det.data?.room);
        if (meta.data?.success) setInfo(meta.data as MeetingInfo);
      } catch (err) {
        console.error('Failed to load meeting info', err);
      } finally {
        if (!cancelled) setInfoLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [params.id]);

  const identity = useMemo(() => {
    if (user) return signedInName.trim() || user.fullName || user.username || `User-${user.id.slice(-4)}`;
    return guestName.trim();
  }, [user, signedInName, guestName]);

  const isHostOfThisRoom = !!(user?.id && roomDetails?.user_id && user.id === roomDetails.user_id);
  // The host bypasses the passcode; everyone else must enter it when set.
  const needsPasscode = !!roomDetails?.passcodeEnabled && !isHostOfThisRoom;

  // Poll while waiting. Owned entirely by the effect so React's cleanup
  // can't race-kill an interval that was just started elsewhere.
  useEffect(() => {
    if (waitState !== 'waiting' || !admitKey) return;

    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(
          `/api/v1/waiting-room?room_id=${encodeURIComponent(params.id)}&key=${encodeURIComponent(admitKey)}`,
          { cache: 'no-store' }
        );
        const data = await res.json();
        if (cancelled || !data?.success) return;
        if (data.status === 'admitted') setWaitState('admitted');
        else if (data.status === 'denied') setWaitState('denied');
      } catch {
        /* transient — retry next tick */
      }
    };
    tick();
    const id = setInterval(tick, 3000);
    return () => { cancelled = true; clearInterval(id); };
  }, [waitState, admitKey, params.id]);

  const knock = async (displayName: string) => {
    setJoining(true);
    setJoinError(null);
    try {
      const res = await fetch('/api/v1/waiting-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: params.id,
          displayName,
          userId: user?.id || null,
          passcode: passcode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data?.success || !data?.key) {
        // Surface passcode problems inline so the user can correct and retry.
        if (data?.code === 'passcode_required' || data?.code === 'passcode_invalid') {
          setJoinError(data?.message || 'Incorrect passcode.');
          setWaitState('idle');
          return;
        }
        throw new Error(data?.message || 'Could not request entry');
      }
      setAdmitKey(data.key);
      setWaitState(data.status === 'admitted' ? 'admitted' : 'waiting');
    } catch (err) {
      console.error('knock failed', err);
      setJoinError('Could not request entry. Please try again.');
      setWaitState('idle');
    } finally {
      setJoining(false);
    }
  };

  const handleGuestJoin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!guestName.trim() || joining) return;
    await knock(guestName.trim());
  };

  const handleSignedInJoin = async () => {
    if (joining) return;
    await knock(identity);
  };

  if (!isLoaded || infoLoading) return <Loader />;

  // Once admitted (or host bypass), drop straight into LiveKit.
  if (waitState === 'admitted') {
    return (
      <div className="h-screen w-full relative overflow-hidden">
        <LiveKitMeeting
          key={params.id}
          room={params.id}
          identity={identity}
          userId={user?.id}
          admitKey={admitKey || undefined}
          onDisconnected={() => router.push('/?show_feedback=1')}
        />
        {roomDetails?.end_time && <CountdownTimer endTime={roomDetails.end_time} />}
      </div>
    );
  }

  // === Landing page (signed-in OR guest) ===
  return (
    <div className="join-landing">
      <div className="light-ray-container" aria-hidden />

      <div className="join-card">
        {/* Meeting header */}
        <div className="join-card-head">
          <div className="join-card-eyebrow">
            <Mic2 size={14} />
            <span>
              {(() => {
                const m = MODE_LABEL[info?.mode || 'worship'];
                if (info?.isScheduledForFuture) return `Upcoming ${m.pill.toLowerCase()}`;
                if (info?.isLive) return m.eyebrow;
                return `${m.pill} room`;
              })()}
            </span>
          </div>
          <h1 className="join-card-title">
            {info?.title || (info?.hostFirstName
              ? `${info.hostFirstName}'s meeting room`
              : 'Singalong Meeting')}
          </h1>
          {info?.hostFirstName && (
            <p className="join-card-host">
              <UserIcon size={12} /> Hosted by <span>{info.hostFirstName}</span>
            </p>
          )}
          <div className="join-card-meta">
            {info?.mode && (
              <span className="join-card-pill">
                <span aria-hidden>{MODE_LABEL[info.mode].emoji}</span> {MODE_LABEL[info.mode].pill}
              </span>
            )}
            {info?.scheduleTime && (
              <span className="join-card-pill"><Calendar size={12} /> {new Date(info.scheduleTime).toLocaleString()}</span>
            )}
            {info?.visibility && (
              <span className="join-card-pill">
                {info.visibility === 'public' ? <Globe size={12} /> : <Lock size={12} />} {info.visibility}
              </span>
            )}
          </div>
        </div>

        {/* === State branches === */}
        {!info?.exists ? (
          <div className="join-state-error">
            <AlertTriangle size={28} className="text-[#F57C00]" />
            <h3>Worship room not found</h3>
            <p>The link may be invalid or the service has been removed.</p>
          </div>
        ) : info.hasEnded ? (
          <div className="join-state-error">
            <Clock size={28} className="text-white/60" />
            <h3>This service has ended</h3>
            <p>If a recording was made, it will appear in your dashboard.</p>
            <button type="button" className="hero-quick-link hero-quick-link-gold mt-2" onClick={() => router.push('/dashboard')}>
              Go to dashboard
            </button>
          </div>
        ) : waitState === 'waiting' ? (
          <div className="join-state-soon">
            <Hourglass size={28} className="text-white/60" />
            <h3>Waiting for the host to let you in</h3>
            <p>
              {info.hostFirstName ? `${info.hostFirstName} has been notified` : 'The host has been notified'} that{' '}
              <span className="font-medium">{identity}</span> is here. You'll join automatically once approved.
            </p>
            <button
              type="button"
              className="hero-quick-link mt-3"
              onClick={() => { setWaitState('idle'); setAdmitKey(null); }}
            >
              Cancel
            </button>
          </div>
        ) : waitState === 'denied' ? (
          <div className="join-state-error">
            <AlertTriangle size={28} className="text-[#F57C00]" />
            <h3>Host did not let you in</h3>
            <p>You can ask the host directly and try again.</p>
            <button
              type="button"
              className="hero-quick-link hero-quick-link-gold mt-2"
              onClick={() => { setWaitState('idle'); setAdmitKey(null); }}
            >
              Try again
            </button>
          </div>
        ) : info.isScheduledForFuture ? (
          <div className="join-state-soon">
            <h3>Service starts {info.scheduleTime ? new Date(info.scheduleTime).toLocaleString() : 'soon'}</h3>
            <p>You're early — refresh closer to the start time, or join now to test your audio &amp; video.</p>
            {user ? (
              <>
                <div className="join-guest-form" style={{ marginBottom: 0 }}>
                  <label htmlFor="signedInNameEarly" className="join-guest-label">Your display name</label>
                  <input
                    id="signedInNameEarly"
                    type="text"
                    placeholder="How you'll appear in the meeting"
                    value={signedInName}
                    onChange={(e) => setSignedInName(e.target.value)}
                    className="join-guest-input"
                    autoComplete="off"
                    minLength={2}
                  />
                </div>
                {needsPasscode && (
                  <PasscodeField
                    passcode={passcode}
                    setPasscode={(v) => { setPasscode(v); setJoinError(null); }}
                    error={joinError}
                    onEnter={handleSignedInJoin}
                  />
                )}
                <button
                  type="button"
                  className="hero-start-worship mt-3"
                  onClick={handleSignedInJoin}
                  disabled={joining || signedInName.trim().length < 2 || (needsPasscode && !passcode.trim())}
                >
                  <Mic2 size={20} />{joining ? 'Requesting…' : 'Enter early'}
                </button>
              </>
            ) : (
              <GuestForm
                guestName={guestName}
                setGuestName={setGuestName}
                onSubmit={handleGuestJoin}
                joining={joining}
                onSignIn={() => router.push(`/sign-in?redirect_url=${typeof window !== 'undefined' ? window.location.href : ''}`)}
                needsPasscode={needsPasscode}
                passcode={passcode}
                setPasscode={(v) => { setPasscode(v); setJoinError(null); }}
                joinError={joinError}
              />
            )}
          </div>
        ) : user ? (
          <div className="join-action-block">
            <div className="join-guest-form" style={{ marginBottom: 0 }}>
              <label htmlFor="signedInName" className="join-guest-label">Your display name</label>
              <input
                id="signedInName"
                type="text"
                placeholder="How you'll appear in the meeting"
                value={signedInName}
                onChange={(e) => setSignedInName(e.target.value)}
                className="join-guest-input"
                autoComplete="off"
                minLength={2}
              />
            </div>
            {needsPasscode && (
              <PasscodeField
                passcode={passcode}
                setPasscode={(v) => { setPasscode(v); setJoinError(null); }}
                error={joinError}
                onEnter={handleSignedInJoin}
              />
            )}
            <button
              type="button"
              className="hero-start-worship"
              onClick={handleSignedInJoin}
              disabled={joining || signedInName.trim().length < 2 || (needsPasscode && !passcode.trim())}
            >
              <Mic2 size={22} />{joining
                ? 'Requesting…'
                : isHostOfThisRoom
                  ? 'Open as host'
                  : (info?.mode === 'business' ? 'Ask to join' : 'Ask to join worship')}
            </button>
            {!isHostOfThisRoom && info?.hostFirstName && (
              <p className="join-action-foot">{info.hostFirstName} will be asked to let you in.</p>
            )}
          </div>
        ) : (
          <GuestForm
            guestName={guestName}
            setGuestName={setGuestName}
            onSubmit={handleGuestJoin}
            joining={joining}
            onSignIn={() => router.push(`/sign-in?redirect_url=${typeof window !== 'undefined' ? window.location.href : ''}`)}
            needsPasscode={needsPasscode}
            passcode={passcode}
            setPasscode={(v) => { setPasscode(v); setJoinError(null); }}
            joinError={joinError}
          />
        )}
      </div>
    </div>
  );
};

interface PasscodeFieldProps {
  passcode: string;
  setPasscode: (v: string) => void;
  error: string | null;
  onEnter?: () => void;
}

/** Shared passcode input — used on both the signed-in and guest join paths. */
const PasscodeField = ({ passcode, setPasscode, error, onEnter }: PasscodeFieldProps) => (
  <div className="join-passcode-wrap">
    <label htmlFor="meetingPasscode" className="join-guest-label">
      <Lock size={12} className="inline mr-1 -mt-0.5" /> Meeting passcode
    </label>
    <input
      id="meetingPasscode"
      type="text"
      inputMode="text"
      placeholder="Enter passcode"
      value={passcode}
      onChange={(e) => setPasscode(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) { e.preventDefault(); onEnter(); } }}
      className="join-guest-input"
      autoComplete="off"
      aria-invalid={!!error}
    />
    {error && <p className="join-passcode-error">{error}</p>}
  </div>
);

interface GuestFormProps {
  guestName: string;
  setGuestName: (v: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  joining: boolean;
  onSignIn: () => void;
  needsPasscode?: boolean;
  passcode?: string;
  setPasscode?: (v: string) => void;
  joinError?: string | null;
}

const GuestForm = ({ guestName, setGuestName, onSubmit, joining, onSignIn, needsPasscode, passcode, setPasscode, joinError }: GuestFormProps) => {
  const valid = guestName.trim().length >= 2 && (!needsPasscode || !!(passcode || '').trim());
  return (
    <form onSubmit={onSubmit} className="join-guest-form">
      <label htmlFor="guestName" className="join-guest-label">Your name</label>
      <input
        id="guestName"
        type="text"
        placeholder="e.g. Sister Mary"
        value={guestName}
        onChange={(e) => setGuestName(e.target.value)}
        className="join-guest-input"
        autoComplete="off"
        autoFocus
        required
        minLength={2}
      />
      {needsPasscode && setPasscode && (
        <PasscodeField passcode={passcode || ''} setPasscode={setPasscode} error={joinError ?? null} />
      )}
      <button type="submit" className="hero-start-worship mt-2" disabled={!valid || joining}>
        <Mic2 size={20} />{joining ? 'Requesting…' : 'Ask to join'}
      </button>
      <p className="join-guest-foot">
        Have an account?{' '}
        <button type="button" onClick={onSignIn} className="join-guest-signin">
          Sign in
        </button>
      </p>
    </form>
  );
};

export default MeetingPage;
