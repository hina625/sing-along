import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';

export const GET = async (req) => {
  try {
    const { data: users } = await clerkClient.users.getUserList({
      limit: 50, // Adjust as needed
    });

    const members = users.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.emailAddresses[0]?.emailAddress,
      imageUrl: user.imageUrl,
      lastSignInAt: user.lastSignInAt,
    }));

    return NextResponse.json({ success: true, members }, { status: 200 });
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
};
