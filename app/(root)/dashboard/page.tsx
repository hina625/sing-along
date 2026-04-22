"use client"
import { planslist } from '@/constants';
import { subscriptionContext } from '@/providers/SubscriptionProvider'
import { useUser } from '@clerk/nextjs';
import axios from 'axios';
import React, { useContext, useEffect, useState } from 'react'
import { Bar, Pie, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement } from 'chart.js';
import Link from 'next/link';
import { FaQuestionCircle } from "react-icons/fa";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement
);

function daysLeftUntil(dateString: string): number {
  // Convert input string to Date object
  const targetDate: Date = new Date(dateString);

  // Get current date
  const currentDate: Date = new Date();

  // Calculate the difference in milliseconds
  const differenceMs: number = targetDate.getTime() - currentDate.getTime();

  // Convert milliseconds to days (1 day = 24 hours * 60 minutes * 60 seconds * 1000 milliseconds)
  const daysLeft: number = Math.ceil(differenceMs / (1000 * 60 * 60 * 24));

  return daysLeft;
}

interface Room {
  room_id: string;
  start_time: string;
  end_time: string;
}


const page = () => {

  const { subscription, details } = useContext(subscriptionContext);
  const [totalroom, setTotalRoom] = useState(0);
  const [roomsDuration, setRoomDuration] = useState(null)
  const [roomLabel, setRoomLabels] = useState(null);
  const [rooms, setRooms] = useState<Room[]>([])
  const { user } = useUser()

  async function getRooms() {
    try {
      const res = await axios.get(`/api/v1/get-rooms?user_id=${user?.id}`);
      setTotalRoom(res.data.rooms?.length)
      setRoomLabels(res.data.rooms.map((room: Room, index: number) => `Room ${index + 1}`))
      const roomDurations = res.data.rooms.map((room: Room) => {
        const startTime = new Date(room.start_time);
        const endTime = new Date(room.end_time);
        return (endTime.getTime() - startTime.getTime()) / (1000 * 60); // Duration in minutes
      });
      setRoomDuration(roomDurations);
      setRooms(res.data.rooms)
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    getRooms()
  }, [])


  const barData = {
    labels: roomLabel || [],
    datasets: [
      {
        label: 'Room Duration (minutes)',
        data: roomsDuration,
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };


  const lineData = {
    labels: rooms?.map(room => new Date(room.start_time).toLocaleDateString()),
    datasets: [
      {
        label: 'Rooms Created Over Time',
        data: rooms?.map((_, index) => index + 1),
        fill: false,
        backgroundColor: 'rgb(75, 192, 192)',
        borderColor: 'rgba(75, 192, 192, 0.2)',
      },
    ],
  };





  return (
    <section className='flex size-full flex-col gap-10 text-white'>

      <div className="flex items-center justify-center flex-col mt-24 mb-16">

        <h2 className=" mt-4 !text-6xl !text-white font-bold">
          Dashboard
        </h2>

      </div>
      <div className='flex items-center justify-center flex-wrap gap-5'>
        <div className='w-[18rem] h-[12rem] card-premium flex items-center justify-center'>
          <div className='flex items-center justify-center flex-col gap-4'>
            <h2 className='text-white text-2xl flex items-center font-bold'>Total Meetings <span className='ml-2 text-white cursor-pointer' title='Total number of meetings will be displayed here that how many meetings you have done.'><FaQuestionCircle /></span></h2>
            <h1 className='text-white text-7xl'>{totalroom}</h1>
          </div>
        </div>


        {
          subscription != 'free' &&
          <div className='w-[18rem] h-[12rem] card-premium flex items-center justify-center'>
            <div className='flex items-center justify-center flex-col gap-4'>
              <h2 className='text-white text-2xl flex items-center font-bold'>Days Left <span className='ml-2 text-white cursor-pointer' title='How many days are left in ending your plan
.'><FaQuestionCircle /></span></h2>
              <h1 className='text-white text-7xl'>{details?.subscription_expire ? daysLeftUntil(details?.subscription_expire) : 0}</h1>
            </div>
          </div>
        }
        {
          subscription != 'free' &&
          <div className='w-[18rem] h-[12rem] card-premium flex items-center justify-center'>
            <div className='flex items-center justify-center flex-col gap-4'>
              <h2 className='text-white text-2xl flex items-center font-bold'>Subcription Date <span className='ml-2 text-white cursor-pointer' title='You can see your current plan date here from start to end date.'><FaQuestionCircle /></span></h2>
              <h1 className='text-white text-xl'>{new Date(details?.subscribe_start).toDateString()} - {new Date(details?.subscription_expire).toDateString()}</h1>
            </div>
          </div>
        }
        
        <div className='w-[18rem] h-[12rem] card-premium flex items-center justify-center'>
          <div className='flex items-center justify-center flex-col gap-4'>
            <h2 className='text-white text-2xl flex items-center font-bold'>Current Plan <span className='ml-2 text-white cursor-pointer' title='You can see your current plan from here if you want to upgrade click on the upgrade button below .'><FaQuestionCircle /></span></h2>
            <h1 className='text-white text-3xl'>{subscription}</h1>
            {
              subscription === 'free' &&
              <Link href={'/plans'} className='py-2 px-4 rounded-md bg-black/30 hover:bg-black/50 transition-all'>UPGRADE NOW</Link>
            }
          </div>
        </div>

        <div className='w-[18rem] h-[12rem] card-premium flex items-center justify-center'>
          <div className='flex items-center justify-center flex-col gap-4'>
            <h2 className='text-white text-2xl flex items-center font-bold '>Meeting Duration <span className='ml-2 text-white cursor-pointer' title='It will shows the meeting duration that how many time of meeting you can do in that plan.'><FaQuestionCircle /></span></h2>
            <h1 className='text-white text-7xl'>{planslist[subscription]?.min}<span className='text-xl text-white/70'>min</span></h1>
          </div>
        </div>
      </div>


    </section>
  )
}

export default page