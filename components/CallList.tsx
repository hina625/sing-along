'use client';

import Loader from './Loader';
import { useGetCalls, RoomRecording } from '@/hooks/useGetCalls';
import MeetingCard from './MeetingCard';
import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useUser } from '@clerk/nextjs';
import { WorkspaceContext } from '@/providers/WorkspaceProvider';

export interface IRoomDetails {
  end_time: string;
  room_id: string;
  start_time: string;
  user_id: string;
  user_plan: string;
  __v: number;
  _id: string;
  image?: { url: string, public_id: string }
  description?: string;
  user?: {
    avatar: string,
    name: string
  }
  scheduleTime?: string;
}

function formatDateTimeWithDayAndAmPm(date: Date): string {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[date.getDay()]; // Get day name from array based on day index
  const day = String(date.getDate()).padStart(2, '0'); // Get day with leading zero if needed
  let hours = date.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12; // Convert hours to 12-hour format
  const minutes = String(date.getMinutes()).padStart(2, '0'); // Get minutes with leading zero if needed

  return `${dayName}, ${day} ${hours}:${minutes} ${ampm}`;
}

const formatDate = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
};

// Function to get day name from date
const getDayName = (date: Date): string => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return dayNames[date.getDay()];
};

const CallList = ({ type }: { type: 'ended' | 'upcoming' | 'recordings' }) => {
  const { callRecordings, isLoading } = useGetCalls();
  const [meetings, setMeetings] = useState<IRoomDetails[]>([]);
  const { user } = useUser();
  const { activeWorkspace } = useContext(WorkspaceContext);
  const router = useRouter();
  const recordings: RoomRecording[] = callRecordings || [];

  async function getRooms() {
    try {
      if (!user?.id) return;
      const params = new URLSearchParams({ user_id: user.id });
      if (type === 'upcoming') params.set('upcoming', 'true');
      if (activeWorkspace?._id) params.set('workspace_id', activeWorkspace._id);
      const res = await axios.get(`/api/v1/get-rooms?${params.toString()}`);
      setMeetings(res.data.rooms);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    getRooms();
  }, [user, type, activeWorkspace?._id]);

  if (isLoading) return <Loader />;

  const getNoCallsMessage = () => {
    switch (type) {
      case 'ended':
        return 'No Previous Meetings';
      case 'upcoming':
        return 'No Upcoming Meetings';
      case 'recordings':
        return 'No Recordings';
      default:
        return '';
    }
  };

  const noCallsMessage = getNoCallsMessage();

  return (
    <div className='flex items-center justify-center flex-wrap gap-5'>
      {type === 'recordings' ? (
        recordings.length > 0 ? (
          recordings.map((recording: RoomRecording) => (
            <MeetingCard
              key={recording._id}
              icon="/icons/recordings.svg"
              title={recording.title?.substring(0, 20) || 'Recording'}
              date={new Date(recording.startedAt).toLocaleString()}
              isPreviousMeeting={true}
              link={recording.fileUrl || ''}
              handleClick={() => recording.fileUrl && router.push(recording.fileUrl)}
              buttonText="Play"
              buttonIcon1="/icons/play.svg"
            />
          ))
        ) : (
          <div className='flex items-center justify-center h-[60vh]'>
            <h2 className='text-white/90 text-4xl'>{noCallsMessage}</h2>
          </div>
        )
      ) : (
        meetings && meetings.length > 0 ? (
          meetings.map((room: IRoomDetails, idx: number) => (
            <div key={idx} className='w-full max-w-[25rem] !min-h-[13rem] !shadow-md gradient-insta flex flex-col gap-2 rounded-md p-4 !bg-white border border-gray-100'>
              <div className='flex flex-wrap items-start gap-2'>
                <h3 className="text-black/80 text-xl font-bold">Meeting ID: </h3>
                <h3 className="text-black/70 text-xl break-all">{room?.room_id}</h3>
              </div>
              <p className="text-black/60 text-lg font-medium">Start Time: {formatDateTimeWithDayAndAmPm(new Date(room.start_time))}</p>
              <p className="text-black/60 text-lg font-medium">End Time: {formatDateTimeWithDayAndAmPm(new Date(room.end_time))}</p>
              <p className="text-black/60 text-lg font-medium">Date: {formatDate(new Date(room.start_time))}</p>
              <p className="text-black/60 text-lg font-medium">Day: {getDayName(new Date(room.start_time))}</p>
            </div>
          ))
        ) : (
          <div className='flex items-center justify-center h-[60vh]'>
            <h2 className='text-white/90 text-4xl'>{noCallsMessage}</h2>
          </div>
        )
      )}
    </div>
  );
};

export default CallList;
