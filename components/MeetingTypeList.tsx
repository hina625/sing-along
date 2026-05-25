/* eslint-disable camelcase */
'use client';

import { useContext, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import HomeCard from './HomeCard';
import MeetingModal from './MeetingModal';
import { useUser } from '@clerk/nextjs';
import Loader from './Loader';
import { Textarea } from './ui/textarea';
import { useToast } from './ui/use-toast';
import { Input } from './ui/input';
import axios from 'axios';
import { subscriptionContext } from '@/providers/SubscriptionProvider';
import { WorkspaceContext } from '@/providers/WorkspaceProvider';
import { planslist } from '@/constants';
import { IRoomDetails } from './CallList';


function isToday(dateString: string): boolean {
  // Convert the date string to a Date object
  const inputDate = new Date(dateString);

  // Get the current date
  const today = new Date();

  // Compare the year, month, and date of both dates
  return (
    inputDate.getFullYear() === today.getFullYear() &&
    inputDate.getMonth() === today.getMonth() &&
    inputDate.getDate() === today.getDate()
  );
}

// Helpers for the native <input type="date"> and <input type="time"> values,
// which are local-time strings (YYYY-MM-DD and HH:MM) — toISOString() would
// shift by the user's UTC offset and silently roll the day on midnight edges.
const toDateInput = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const toTimeInput = (d: Date) => {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};


const initialValues = {
  dateTime: new Date(),
  description: '',
  link: '',
};

const MeetingTypeList = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [id, setId] = useState('')
  const [meetings, setMeetings] = useState<IRoomDetails[]>([]);
  const [description,setDesc] = useState('')
  const [passcode,setPasscode] = useState('')
  const [status,setStatus] = useState('private')
  const [image,setImage] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [meetingState, setMeetingState] = useState<
    'isScheduleMeeting' | 'isJoiningMeeting' | 'isInstantMeeting' | undefined
  >(undefined);
  const [values, setValues] = useState(initialValues);
  const {subscription} = useContext(subscriptionContext);
  const { activeWorkspace } = useContext(WorkspaceContext);




  const { user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (user && !displayName) {
      setDisplayName(user.fullName || user.username || user.primaryEmailAddress?.emailAddress || '');
    }
  }, [user, displayName]);

  // Auto-open the Schedule modal when the user lands here via a CTA elsewhere
  // (e.g. the "Schedule a Meeting" button on the empty Upcoming page) with
  // ?schedule=open. Strip the param after consuming — preserves the current
  // pathname so we don't bounce the user away from where they landed.
  useEffect(() => {
    if (searchParams.get('schedule') === 'open') {
      setMeetingState('isScheduleMeeting');
      const next = new URLSearchParams(searchParams.toString());
      next.delete('schedule');
      const qs = next.toString();
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '/dashboard/create-meeting';
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }
  }, [searchParams, router]);

  const persistDisplayName = (name: string) => {
    const v = name.trim();
    if (!v || typeof window === 'undefined') return;
    try { sessionStorage.setItem('pendingDisplayName', v); } catch {}
  };

  async function getRooms() {
    try {
      const res = await axios.get(`/api/v1/get-rooms?user_id=${user?.id}`);
      setMeetings(res.data.rooms)
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    getRooms()
  },[user]);




  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if(file){
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
   
  };


  const createMeeting = async () => {
    if ( !user) return;
    if (!displayName.trim()) {
      toast({ title: 'Please enter your display name' });
      return;
    }
    persistDisplayName(displayName);
    if(meetings && meetings.length > 0){
      const todayMeetings = meetings.filter(m => isToday(m.start_time));
      const freeLimit = planslist.free.meetingsPerDay;
      if(subscription == "free" && todayMeetings.length >= freeLimit){
        toast({ title: `You are on our Free Plan, which lets you host ${freeLimit} meetings each day. To host more, please upgrade your plan.` });
        return
      }
    }
    try {
      if (!values.dateTime) {
        toast({ title: 'Please select a date and time' });
        return;
      }
      if (meetingState === 'isScheduleMeeting' && values.dateTime.getTime() <= Date.now()) {
        toast({ title: 'Pick a date and time in the future' });
        return;
      }
      const id = crypto.randomUUID();
      let end_time;
      if(subscription == 'starter'){
        end_time = new Date(Date.now() + 1 * 60 * 60 * 1000).toUTCString()
      }else if(subscription == 'plus'){
        end_time = new Date(Date.now() + 2 * 60 * 60 * 1000).toUTCString()
        // end_time = new Date(Date.now() +  7 * 60 * 1000).toUTCString()
      }else{
        end_time = new Date(Date.now() +  planslist['free'].min * 60 * 1000).toUTCString()
      }
      // isSchedule,description,scheduleTime
      let res;
      if(meetingState === 'isScheduleMeeting'){

        res = await axios.post('/api/v1/create-room',{user_id: user?.id, workspaceId: activeWorkspace?._id || null, room_id: id, user_plan: subscription,start_time: new Date().toUTCString(),end_time,isSchedule:true,description:description,scheduleTime:values.dateTime,status,image,passcodeEnabled: !!passcode.trim(),passcode: passcode.trim() || undefined});
      }else{

         res = await axios.post('/api/v1/create-room',{user_id: user?.id, workspaceId: activeWorkspace?._id || null, room_id: id, user_plan: subscription,start_time: new Date().toUTCString(),end_time,status:'private'});
      }
      setId(id)
      if(res?.data.success){
        // router.push(`/meeting/${id}`);
        router.push(`/dashboard/beforemeet/${id}`);
      }
      toast({
        title: 'Meeting Created',
      });
      setMeetingState(undefined);
    } catch (error: any) {
      console.error(error);
      // Surface server's plan-cap message when 402 (or any structured error).
      const serverMsg = error?.response?.data?.message;
      toast({ title: serverMsg || 'Failed to create Meeting' });
    }
  };

  if ( !user) return <Loader />;

  const meetingLink = `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/beforemeet/${id}`;

  // Mode-aware copy: business → team meetings, community → blended "gathering"
  // wording, worship/hybrid → neutral default (no religion-specific phrasing).
  // Mirrors the split in dashboard/page.tsx.
  const wsMode = activeWorkspace?.mode;
  const isBusinessWs = wsMode === 'business';
  const isCommunityWs = wsMode === 'community';
  const copy = isBusinessWs
    ? {
        startTitle: 'Start Meeting',
        startDesc: 'Get your team in the room',
        joinTitle: 'Join Meeting',
        joinDesc: 'via invitation link',
        scheduleTitle: 'Schedule Meeting',
        scheduleDesc: 'Plan a team sync',
        pastTitle: 'Past Meetings',
        pastDesc: 'Recorded sessions',
        scheduleModalTitle: 'Schedule Meeting',
        joinModalTitle: 'Paste the meeting link',
        joinModalButton: 'Join Meeting',
        instantModalTitle: 'Start Meeting Now',
        instantModalButton: 'Start Meeting',
      }
    : isCommunityWs
    ? {
        startTitle: 'Start Gathering',
        startDesc: 'Bring your community together',
        joinTitle: 'Join Gathering',
        joinDesc: 'via invitation link',
        scheduleTitle: 'Schedule Gathering',
        scheduleDesc: 'Plan your next gathering',
        pastTitle: 'Past Gatherings',
        pastDesc: 'Recorded gatherings & sessions',
        scheduleModalTitle: 'Schedule Gathering',
        joinModalTitle: 'Paste the gathering link',
        joinModalButton: 'Join Gathering',
        instantModalTitle: 'Start Gathering Now',
        instantModalButton: 'Start Gathering',
      }
    : {
        startTitle: 'Start Meeting',
        startDesc: 'Open a room with one click',
        joinTitle: 'Join Meeting',
        joinDesc: 'via invitation link',
        scheduleTitle: 'Schedule Meeting',
        scheduleDesc: 'Plan your next session',
        pastTitle: 'Past Meetings',
        pastDesc: 'Recorded sessions',
        scheduleModalTitle: 'Schedule Meeting',
        joinModalTitle: 'Paste the meeting link',
        joinModalButton: 'Join Meeting',
        instantModalTitle: 'Start Meeting Now',
        instantModalButton: 'Start Meeting',
      };

  return (
    <section className="flex items-center justify-center gap-5 flex-wrap">
      <HomeCard
        img="/icons/add-meeting.svg"
        title={copy.startTitle}
        description={copy.startDesc}
        className="card-gold"
        handleClick={() => setMeetingState('isInstantMeeting')}
      />
      <HomeCard
        img="/icons/join-meeting.svg"
        title={copy.joinTitle}
        description={copy.joinDesc}
        className="card-purple"
        handleClick={() => setMeetingState('isJoiningMeeting')}
      />
      <HomeCard
        img="/icons/schedule.svg"
        title={copy.scheduleTitle}
        description={copy.scheduleDesc}
        className="card-burgundy"
        handleClick={() => setMeetingState('isScheduleMeeting')}
      />
      <HomeCard
        img="/icons/recordings.svg"
        title={copy.pastTitle}
        description={copy.pastDesc}
        className="card-teal"
        handleClick={() => router.push('/dashboard/recordings')}
      />

      {true ? (
        <MeetingModal
          isOpen={meetingState === 'isScheduleMeeting'}
          onClose={() => setMeetingState(undefined)}
          title={copy.scheduleModalTitle}
          className="text-white"
          handleClick={createMeeting}
        >
          <div className="flex flex-col gap-2.5">
            <label className="text-base font-normal leading-[22.4px] text-white/85">
              Your display name
            </label>
            <Input
              placeholder="How you'll appear in the meeting"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="bg-dark-3 text-white placeholder:text-white/40 border border-white/15 focus-visible:border-deep-gold/60 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <div className="flex flex-col gap-2.5">
            <label className="text-base font-normal leading-[22.4px] text-white/85">
              Add a description
            </label>
            <Textarea
              className="bg-dark-3 text-white placeholder:text-white/40 border border-white/15 focus-visible:border-deep-gold/60 focus-visible:ring-0 focus-visible:ring-offset-0"
              onChange={(e) =>
                setDesc(e.target.value)
              }
            />
          </div>
          <div className="flex w-full flex-col gap-2.5">
            <label className="text-base font-normal leading-[22.4px] text-white/85">
              Select Date and Time
            </label>
            {/* Custom date + time picker — native HTML5 inputs render the OS-
                level picker (calendar on desktop, wheel on mobile). No popup
                positioning, no floating-ui, no Tailwind preflight conflicts.
                Min attributes block past dates and (when scheduling for today)
                past times automatically — the browser enforces it. */}
            <div className="flex w-full flex-col gap-2 sm:flex-row">
              <input
                type="date"
                value={toDateInput(values.dateTime)}
                min={toDateInput(new Date())}
                onChange={(e) => {
                  if (!e.target.value) return;
                  const [y, m, d] = e.target.value.split('-').map(Number);
                  const next = new Date(values.dateTime);
                  next.setFullYear(y, m - 1, d);
                  setValues({ ...values, dateTime: next });
                }}
                style={{ colorScheme: 'light dark' }}
                className="w-full sm:flex-1 rounded bg-background-2 text-white border border-white/15 p-2 focus:outline-none focus:border-deep-gold/60"
              />
              <input
                type="time"
                value={toTimeInput(values.dateTime)}
                min={isToday(values.dateTime.toISOString()) ? toTimeInput(new Date()) : undefined}
                onChange={(e) => {
                  if (!e.target.value) return;
                  const [h, m] = e.target.value.split(':').map(Number);
                  const next = new Date(values.dateTime);
                  next.setHours(h, m, 0, 0);
                  setValues({ ...values, dateTime: next });
                }}
                style={{ colorScheme: 'light dark' }}
                className="w-full sm:w-32 rounded bg-background-2 text-white border border-white/15 p-2 focus:outline-none focus:border-deep-gold/60"
              />
            </div>
          </div>


          <div className="flex w-full flex-col gap-2.5">
            <label className="text-base font-normal leading-[22.4px] text-white/85">
              Meeting Type
            </label>
            <select
              onChange={(e) => setStatus(e.target.value)}
              value={status}
              style={{ colorScheme: 'light dark' }}
              className="py-2 px-3 outline-none border rounded-md border-white/15 bg-background-2 text-white focus:border-deep-gold/60"
            >
              <option value={'private'} className="bg-background-2 text-white">Private</option>
              <option value={'public'} className="bg-background-2 text-white">Public</option>
            </select>
          </div>

          <div className="flex w-full flex-col gap-2.5">
            <label className="text-base font-normal leading-[22.4px] text-white/85">
              Passcode <span className="text-white/40 text-sm">(optional)</span>
            </label>
            <Input
              placeholder="Leave blank for no passcode"
              type="text"
              value={passcode}
              autoComplete="off"
              onChange={(e) => setPasscode(e.target.value)}
              className="bg-dark-3 text-white placeholder:text-white/40 border border-white/15 focus-visible:border-deep-gold/60 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <span className="text-sm text-white/40">
              When set, guests must enter this code to join.
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            <label className="text-base font-normal leading-[22.4px] text-white/85">
              Cover Image
            </label>
            <Input
              placeholder="Cover Image"
              type='file'
              accept='image/*'
              onChange={handleImageChange}
              className="bg-dark-3 text-white border border-white/15 file:text-white file:bg-transparent file:border-0 file:mr-3 focus-visible:border-deep-gold/60 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

        </MeetingModal>
      ) : (
        <MeetingModal
          isOpen={meetingState === 'isScheduleMeeting'}
          onClose={() => setMeetingState(undefined)}
          title="Meeting Created"
          handleClick={() => {
            navigator.clipboard.writeText(meetingLink);
            toast({ title: 'Link Copied' });
          }}
          image={'/icons/checked.svg'}
          buttonIcon="/icons/copy.svg"
          className="text-center text-white"
          buttonText="Copy Meeting Link"
        />
      )}

      <MeetingModal
        isOpen={meetingState === 'isJoiningMeeting'}
        onClose={() => setMeetingState(undefined)}
        title={copy.joinModalTitle}
        className="text-center text-white"
        buttonText={copy.joinModalButton}
        handleClick={() => {
          if (!displayName.trim()) {
            toast({ title: 'Please enter your display name' });
            return;
          }
          const raw = (values.link || '').trim();
          if (!raw) {
            toast({ title: 'Paste a meeting link or ID' });
            return;
          }
          // Accept either a bare meeting id or a full URL like
          // /dashboard/beforemeet/<id> or /meeting/<id>. Strip query/hash
          // and take the last non-empty path segment.
          const cleaned = raw.split('?')[0].split('#')[0];
          const id = cleaned.split('/').filter(Boolean).pop() || '';
          if (!id) {
            toast({ title: 'That link doesn’t look like a valid meeting' });
            return;
          }
          persistDisplayName(displayName);
          router.push(`/meeting/${id}`);
        }}
      >
        <div className="flex w-full flex-col gap-2.5 text-left">
          <label className="text-base font-normal leading-[22.4px] text-white/85">
            Your display name
          </label>
          <Input
            placeholder="How you'll appear in the meeting"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="bg-dark-3 text-white placeholder:text-white/40 border border-white/15 focus-visible:border-deep-gold/60 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <div className="flex w-full flex-col gap-2.5 text-left">
          <label className="text-base font-normal leading-[22.4px] text-white/85">
            Meeting link or ID
          </label>
          <Input
            placeholder="Paste link or meeting ID"
            value={values.link}
            onChange={(e) => setValues({ ...values, link: e.target.value })}
            className="bg-dark-3 text-white placeholder:text-white/40 border border-white/15 focus-visible:border-deep-gold/60 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </MeetingModal>

      <MeetingModal
        isOpen={meetingState === 'isInstantMeeting'}
        onClose={() => setMeetingState(undefined)}
        title={copy.instantModalTitle}
        className="text-center text-white"
        buttonText={copy.instantModalButton}
        handleClick={createMeeting}
      >
        <div className="flex w-full flex-col gap-2.5 text-left">
          <label className="text-base font-normal leading-[22.4px] text-white/85">
            Your display name
          </label>
          <Input
            placeholder="How you'll appear in the meeting"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="bg-dark-3 text-white placeholder:text-white/40 border border-white/15 focus-visible:border-deep-gold/60 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </MeetingModal>
    </section>
  );
};

export default MeetingTypeList;
