/* eslint-disable camelcase */
'use client';

import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import HomeCard from './HomeCard';
import MeetingModal from './MeetingModal';
import { useUser } from '@clerk/nextjs';
import Loader from './Loader';
import { Textarea } from './ui/textarea';
import ReactDatePicker from 'react-datepicker';
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


const initialValues = {
  dateTime: new Date(),
  description: '',
  link: '',
};

const MeetingTypeList = () => {
  const router = useRouter();
  const [id, setId] = useState('')
  const [meetings, setMeetings] = useState<IRoomDetails[]>([]);
  const [description,setDesc] = useState('')
  const [passcode,setPasscode] = useState('')
  const [status,setStatus] = useState('private')
  const [image,setImage] = useState<string | null>(null);
  const [meetingState, setMeetingState] = useState<
    'isScheduleMeeting' | 'isJoiningMeeting' | 'isInstantMeeting' | undefined
  >(undefined);
  const [values, setValues] = useState(initialValues);
  const {subscription} = useContext(subscriptionContext);
  const { activeWorkspace } = useContext(WorkspaceContext);
 

 

  const { user } = useUser();
  const { toast } = useToast();

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
  // wording, worship/hybrid → worship copy. Mirrors the split in dashboard/page.tsx.
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
        startTitle: 'Start Worship',
        startDesc: 'Go live with your congregation',
        joinTitle: 'Join Worship',
        joinDesc: 'via invitation link',
        scheduleTitle: 'Schedule Service',
        scheduleDesc: 'Plan Sunday or midweek service',
        pastTitle: 'Past Services',
        pastDesc: 'Recorded worship & sermons',
        scheduleModalTitle: 'Schedule Worship Service',
        joinModalTitle: 'Paste the worship link',
        joinModalButton: 'Join Worship',
        instantModalTitle: 'Start Worship Now',
        instantModalButton: 'Start Worship',
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
            <ReactDatePicker
              selected={values.dateTime}
              onChange={(date) => setValues({ ...values, dateTime: date as Date })}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              timeCaption="time"
              dateFormat="MMMM d, yyyy h:mm aa"
              minDate={new Date()}
              // When picking today, only show time slots that haven't passed yet.
              filterTime={(time) => {
                const selected = values.dateTime || new Date();
                if (!isToday(selected.toISOString())) return true;
                return time.getTime() >= Date.now();
              }}
              wrapperClassName="w-full"
              className="w-full rounded !bg-[#1A1A1A] !text-white border border-white/15 p-2 focus:outline-none focus:border-deep-gold/60"
            />
          </div>


          <div className="flex w-full flex-col gap-2.5">
            <label className="text-base font-normal leading-[22.4px] text-white/85">
              Meeting Type
            </label>
            <select
              onChange={(e) => setStatus(e.target.value)}
              value={status}
              className="py-2 px-3 outline-none border rounded-md border-white/15 !bg-[#1A1A1A] !text-white focus:border-deep-gold/60"
            >
              <option value={'private'} className="bg-[#1A1A1A] text-white">Private</option>
              <option value={'public'} className="bg-[#1A1A1A] text-white">Public</option>
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
          router.push(`/meeting/${id}`);
        }}
      >
        <Input
          placeholder="Meeting link or ID"
          onChange={(e) => setValues({ ...values, link: e.target.value })}
          className="bg-dark-3 text-white placeholder:text-white/40 border border-white/15 focus-visible:border-deep-gold/60 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </MeetingModal>

      <MeetingModal
        isOpen={meetingState === 'isInstantMeeting'}
        onClose={() => setMeetingState(undefined)}
        title={copy.instantModalTitle}
        className="text-center text-white"
        buttonText={copy.instantModalButton}
        handleClick={createMeeting}
      />
    </section>
  );
};

export default MeetingTypeList;
