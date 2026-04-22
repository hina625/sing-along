const { NextResponse } = require("next/server")
import connectDB from '@/lib/connnectDB'
import roomModel from '@/lib/roomModel';
import { clerkClient } from '@clerk/nextjs/server';


export const GET = async (req) => {
  try {
    await connectDB()
    const query = new URLSearchParams(req.url.split('?')[1]);
    const user_id = query.get('user_id');
    const upcoming = query.get('upcoming');
    const ispublic = query.get('public');
    let rooms;
    if (ispublic) {
      let now = new Date();
      now.setHours(now.getHours() - 2);
      rooms = await roomModel.find({ scheduleTime: { $gt: now }, status: 'public' })
      rooms = JSON.parse(JSON.stringify(rooms));

      for (let index = 0; index < rooms.length; index++) {
        const room = rooms[index];
        const userdetail = await clerkClient.users.getUser(room.user_id)
        rooms[index].user = {
          avatar: userdetail.imageUrl,
          name: `${userdetail.firstName || ''} ${userdetail.lastName || ''}`
        }
      }
      return NextResponse.json({ success: true, rooms }, { status: 200 });
    }


    if (upcoming) {
      const currentTime = new Date(); // Get the current time

      rooms = await roomModel.find({
        user_id,
        isSchedule: true,
        scheduleTime: { $gt: currentTime }
      });

    } else {
      rooms = await roomModel.find({ user_id, isSchedule: false })
    }

    return NextResponse.json({ success: true, rooms }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }

}
