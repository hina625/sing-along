"use client"
import React, { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import LiveKitMeeting from '@/components/LiveKitMeeting'

interface TypeParams {
  id: string
}

interface PropsType {
  params: TypeParams
}

interface CountdownTimerProps {
  endTime: string;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ endTime }) => {
  const { toast } = useToast();
  const router = useRouter()
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const timeLeft = new Date(endTime).getTime() - now.getTime();

      if (timeLeft <= 0) {
        toast({
          title: 'Meeting has ended.',
          duration: 5000,
        });
        clearInterval(interval);
        return;
      }

      const minutesLeft = Math.floor(timeLeft / 60000);
      const secondsLeft = Math.floor((timeLeft % 60000) / 1000);

      if (minutesLeft === 0 && secondsLeft === 0) {
        clearInterval(interval);
        router.push('/?show_feedback=1')
      } else if (minutesLeft == 1 && secondsLeft == 0) {
        toast({
          title: 'Less than 1 minute left.',
          duration: 5000,
        });
      } else if (minutesLeft == 2 && secondsLeft == 0) {
        toast({
          title: 'Less than 2 minute left.',
          duration: 5000,
        });
      } else if (minutesLeft == 5 && secondsLeft == 0) {
        toast({
          title: 'Less than 5 minute left.',
          duration: 5000,
        });
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
}

const MeetingPage = ({ params }: PropsType) => {
  const [guest, setGuest] = useState(false);
  const [guestName, setGuestName] = useState('')
  const { user, isLoaded } = useUser()
  const [roomDetails, setRoomDetails] = useState<IRoomDetails>();
  const router = useRouter();

  async function getRoomDetails() {
    try {
      const res = await axios.get(`/api/v1/create-room?room_id=${params.id}`);
      setRoomDetails(res.data?.room)
    } catch (error) {
      console.log('Error fetching room details:', error)
    }
  }

  useEffect(() => {
    getRoomDetails();
  }, [params.id])

  const handleGuestJoin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (guestName.trim()) {
      setGuest(true)
    }
  }

  if (!isLoaded) return null;

  const identity = user 
    ? (user.fullName || user.username || `User-${user.id.slice(-4)}`) 
    : guestName;

  return (
    (user || guest) ? (
      <div className="h-screen w-full relative">
        <LiveKitMeeting 
          room={params.id} 
          identity={identity} 
          onDisconnected={() => router.push('/?show_feedback=1')}
        />
        
        {roomDetails?.end_time && (
          <CountdownTimer endTime={roomDetails.end_time} />
        )}
      </div>
    ) : (
      <div className="flex items-center justify-center min-h-screen bg-background-4 relative">
        <div className='absolute bottom-1 left-1 z-0'>
          <img src='/images/bottom-box-shape.png' alt="" />
        </div>
        <div className='absolute right-1 top-1 z-0'>
          <img src='/images/left-plus.png' alt="" />
        </div>
        <div className="w-full max-w-md bg-background-3 rounded-lg shadow-md p-6 sm:p-8 z-10">
          <h1 className="text-2xl font-bold mb-2 text-foregroud-primary blicking">Join as Guest</h1>
          <p className="text-white/80 mb-6">Enter your name to join as a guest.</p>
          <form onSubmit={handleGuestJoin} className="space-y-4">
            <div>
              <label htmlFor="guestName" className="block text-sm font-medium text-white/80 mb-1">
                Name
              </label>
              <input
                id="guestName"
                type="text"
                placeholder="Enter your name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full blicking bg-foregroud-primary text-white py-2 px-4 rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
            >
              Join as Guest
            </button>
          </form>
          <p className="mt-4 text-sm text-white/80">
            Have an account?{' '}
            <button 
              onClick={() => router.push(`/sign-in?redirect_url=${window.location.href}`)}
              className="text-foregroud-primary hover:underline font-semibold"
            >
              Login
            </button>
          </p>
        </div>
      </div>
    )
  )
}

export default MeetingPage