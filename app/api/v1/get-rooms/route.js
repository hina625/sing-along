const { NextResponse } = require("next/server")
import connectDB from '@/lib/connnectDB'
import roomModel from '@/lib/roomModel';
import { clerkClient } from '@clerk/nextjs/server';
import { requirePermission } from '@/lib/permissions';


export const GET = async (req) => {
  try {
    await connectDB()
    const query = new URLSearchParams(req.url.split('?')[1]);
    const user_id = query.get('user_id');
    const upcoming = query.get('upcoming');
    const ispublic = query.get('public');
    const workspace_id = query.get('workspace_id');
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

    // Workspace-scoped reads need view permission on meetings.
    if (workspace_id && user_id) {
      const denied = await requirePermission({
        workspaceId: workspace_id, userId: user_id, resource: 'meetings', action: 'view',
      });
      if (denied) return denied;
    }

    // Scoping rule:
    //   - workspace_id given → return everything in the workspace (any member
    //     who passed the meetings.view check above can see all rooms hosted
    //     in their workspace, not just rooms they personally created).
    //   - workspace_id missing → legacy fallback that filters by host user_id
    //     so pre-workspace personal meetings still surface.
    const baseFilter = workspace_id ? { workspaceId: workspace_id } : { user_id };

    if (upcoming) {
      const currentTime = new Date(); // Get the current time

      rooms = await roomModel.find({
        ...baseFilter,
        isSchedule: true,
        scheduleTime: { $gt: currentTime }
      });

    } else {
      rooms = await roomModel.find({ ...baseFilter, isSchedule: false })
    }

    return NextResponse.json({ success: true, rooms }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }

}
