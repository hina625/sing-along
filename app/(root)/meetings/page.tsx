'use client'
import { IRoomDetails } from '@/components/CallList';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react'
import { CalendarIcon } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from 'next/link';

function isOneHourLeft(startTime:string) {
  const targetTime:any = new Date(startTime);
  const currentTime:any = new Date();

  // Calculate the difference in milliseconds
  const difference = targetTime - currentTime;

  // Check if the time is over or 1 hour (3600000 ms) or less remains
  return difference <= 3600000;
}

const CountdownTimer = ({ startTime }: {startTime: string}) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const updateTimer = () => {
      const targetTime:any = new Date(startTime);
      const currentTime:any = new Date();
      const difference = targetTime - currentTime;

      if (difference <= 0) {
        setTimeLeft("Meeting in Progress");
      } else {
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / (1000 * 60)) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    };

    // Update the timer every second
    const timerId = setInterval(updateTimer, 1000);
    return () => clearInterval(timerId);
  }, [startTime]);

  return (
    <>{timeLeft}</>
  );
};

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

function isToday(dateString: string) {
  const inputDate = new Date(dateString);
  const today = new Date();

  return (
    inputDate.getFullYear() === today.getFullYear() &&
    inputDate.getMonth() === today.getMonth() &&
    inputDate.getDate() === today.getDate()
  );
}


// Function to get day name from date
const getDayName = (date: Date): string => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return dayNames[date.getDay()];
};

const page = () => {
  const [publicRooms, setPublicRooms] = useState<IRoomDetails[]>([]);
  const router = useRouter()
  const fallbackImage = '/images/avatar-3.png'

  async function getPublicRooms() {
    try {
      const res = await axios.get(`/api/v1/get-rooms?public=true`);

      setPublicRooms(res.data?.rooms);
    } catch (error) {
      console.log(error)

    }
  }

  useEffect(() => {
    getPublicRooms();
  }, [])


  return (
    <section className='min-h-screen bg-background-4 p-6 relative'>
      <div className='absolute top-1 left-1 z-0'>
        <img src='/images/left-plus.png' />
      </div>
      <div className='absolute bottom-0 right-0 z-0'>
        <img src='/images/bottom-line.png' />
      </div>
      <h1 className='text-white text-center font-bold mb-10 mt-5' style={{ fontSize: '3rem' }}>Public Meetings</h1>
      <div className='flex items-center justify-center flex-wrap gap-5'>
        {
          publicRooms && publicRooms.map((room: IRoomDetails, idex: number) => (
            <div className="w-[21rem] min-h-[29rem] bg-background-3 rounded-lg shadow text-white relative z-50">
              <div className='flex items-center justify-center p-1'>

                <img className="rounded-t-lg w-full h-[17rem] object-cover" src={room.image?.url || fallbackImage} alt="" />
              </div>

              <div className="px-3 py-2">
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3 mb-3'>
                    <Avatar>
                      <AvatarImage src={room.user?.avatar} alt={room.user?.name} />
                      <AvatarFallback>{room.user?.name.slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <h2 className='font-medium'>{room.user?.name}</h2>
                  </div>

                  <p className="mb-3 font-light text-gray-50 my-2 mx-1 opacity-70"><CountdownTimer startTime={room.scheduleTime as string} /></p>
                </div>
                <p className="mb-3 font-normal text-gray-50 my-2 mx-1">{room.description?.slice(0, 100)}</p>
                <button disabled={!isOneHourLeft(room.scheduleTime as string)} className='disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'>
                  {
                    isOneHourLeft(room.scheduleTime as string) &&
                    <Link href={`/meeting/${room._id}`} className="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-foregroud-primary rounded-lg  outline-none">
                      JOIN NOW
                      <svg className="rtl:rotate-180 w-3.5 h-3.5 ms-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5h12m0 0L9 1m4 4L9 9" />
                      </svg>
                    </Link>
                  }

                  {
                    !isOneHourLeft(room.scheduleTime as string) &&
                    <span className="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-foregroud-primary rounded-lg  outline-none">
                      JOIN NOW
                      <svg className="rtl:rotate-180 w-3.5 h-3.5 ms-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5h12m0 0L9 1m4 4L9 9" />
                      </svg>
                    </span>
                  }
                </button>
              </div>
            </div>
          ))
        }


        {
          publicRooms.length == 0 &&
          <div className='flex items-center justify-center h-[60vh]'>
            <h2 className='text-white/90 text-4xl'>No Previous meetings</h2>
          </div>
        }

      </div>
    </section>

  )
}

export default page