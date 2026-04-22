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
  const [status,setStatus] = useState('private')
  const [image,setImage] = useState<string | null>(null);
  const [meetingState, setMeetingState] = useState<
    'isScheduleMeeting' | 'isJoiningMeeting' | 'isInstantMeeting' | undefined
  >(undefined);
  const [values, setValues] = useState(initialValues);
  const {subscription} = useContext(subscriptionContext);
 

 

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
      if(subscription == "free" && todayMeetings.length >= 3){
        toast({ title: 'You are on our Free Plan, which lets you host 3 meetings each day. To host more, please upgrade your plan.' });
        return
      }
    }
    try {
      if (!values.dateTime) {
        toast({ title: 'Please select a date and time' });
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

        res = await axios.post('/api/v1/create-room',{user_id: user?.id, room_id: id, user_plan: subscription,start_time: new Date().toUTCString(),end_time,isSchedule:true,description:description,scheduleTime:values.dateTime,status,image});
      }else{

         res = await axios.post('/api/v1/create-room',{user_id: user?.id, room_id: id, user_plan: subscription,start_time: new Date().toUTCString(),end_time,status:'private'});
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
    } catch (error) {
      console.error(error);
      toast({ title: 'Failed to create Meeting' });
    }
  };

  if ( !user) return <Loader />;

  const meetingLink = `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/beforemeet/${id}`;

  return (
    <section className="flex items-center justify-center gap-5 flex-wrap">
      <HomeCard
        img="/icons/add-meeting.svg"
        title="New Meeting"
        description="Start an instant meeting"
        className="card-gold"
        handleClick={() => setMeetingState('isInstantMeeting')}
      />
      <HomeCard
        img="/icons/join-meeting.svg"
        title="Join Meeting"
        description="via invitation link"
        className="card-purple"
        handleClick={() => setMeetingState('isJoiningMeeting')}
      />
      <HomeCard
        img="/icons/schedule.svg"
        title="Schedule Meeting"
        description="Plan your meeting"
        className="card-burgundy"
        handleClick={() => setMeetingState('isScheduleMeeting')}
      />
      <HomeCard
        img="/icons/recordings.svg"
        title="View Recordings"
        description="Meeting Recordings"
        className="card-teal"
        handleClick={() => router.push('/recordings')}
      />

      {true ? (
        <MeetingModal
          isOpen={meetingState === 'isScheduleMeeting'}
          onClose={() => setMeetingState(undefined)}
          title="Create Meeting"
          handleClick={createMeeting}
        >
          <div className="flex flex-col gap-2.5">
            <label className="text-base font-normal leading-[22.4px] text-black/90">
              Add a description
            </label>
            <Textarea
              className="bg-transparent border-gray-400"
              onChange={(e) =>
                setDesc(e.target.value)
              }
            />
          </div>
          <div className="flex w-full flex-col gap-2.5">
            <label className="text-base font-normal leading-[22.4px] text-black/90">
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
              className="w-full rounded bg-dark-3 p-2 focus:outline-none"
            />
          </div>
          

          <div className="flex w-full flex-col gap-2.5">
            <label className="text-base font-normal leading-[22.4px] text-black/90">
              Meeting Type
            </label>
            <select onChange={(e) => setStatus(e.target.value)} value={status} className='py-2 px-3 outline-none border rounded-md border-gray-400 bg-transparent'>
              <option value={'private'}>Private</option>
              <option value={'public'}>Public</option>
            </select>
          </div>

          <div className="flex flex-col gap-2.5">
            <label className="text-base font-normal leading-[22.4px] text-black/90">
              Cover Image
            </label>
            <Input
              placeholder="Cover Image"
              type='file'
              accept='image/*'
              onChange={handleImageChange}
              className="border-none bg-dark-3 focus-visible:ring-0 focus-visible:ring-offset-0"
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
          className="text-center"
          buttonText="Copy Meeting Link"
        />
      )}

      <MeetingModal
        isOpen={meetingState === 'isJoiningMeeting'}
        onClose={() => setMeetingState(undefined)}
        title="Type the link here"
        className="text-center"
        buttonText="Join Meeting"
        handleClick={() => router.push(`/meeting/${values.link}`)}
      >
        <Input
          placeholder="Meeting link"
          onChange={(e) => setValues({ ...values, link: e.target.value })}
          className="border-none bg-dark-3 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </MeetingModal>

      <MeetingModal
        isOpen={meetingState === 'isInstantMeeting'}
        onClose={() => setMeetingState(undefined)}
        title="Start an Instant Meeting"
        className="text-center"
        buttonText="Start Meeting"
        handleClick={createMeeting}
      />
    </section>
  );
};

export default MeetingTypeList;
