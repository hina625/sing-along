const { NextResponse } = require("next/server")
import connectDB from '@/lib/connnectDB'
import roomModel from '@/lib/roomModel';
import sendEmail from '@/lib/sendEmail'
import { clerkClient } from '@clerk/nextjs/server';


function formatDate(datestring) {
    const date = new Date(datestring)
    let year = date.getFullYear();
    let month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    let day = String(date.getDate()).padStart(2, '0');
    
    let hours = String(date.getHours()).padStart(2, '0');
    let minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export const POST = async (req) => {
    try {
     await connectDB()
     const {room_id, emails,user_id} = await req.json();
     const roomdetails = await roomModel.findOne({room_id});
     const userdetail = await clerkClient.users.getUser(user_id);
     const meesage = `
Hello,

I hope this message finds you well! I would like to invite you to a meeting.

Meeting Details:

Date: ${formatDate(roomdetails.scheduleTime)}
Link: ${process.env.NEXT_PUBLIC_BASE_URL}/meeting/${room_id}

Your insights and contributions would be greatly valued, and I believe this meeting will be beneficial for all participants.

Please let me know if you can attend. Feel free to reach out if you have any questions or if there are additional topics you would like to discuss.

Looking forward to your response!

Best regards,
${userdetail.firstName || ''} ${userdetail.lastName || ''}

     `
     const sendEmailsInBatches = async (emails, batchSize) => {
        for (let i = 0; i < emails.length; i += batchSize) {
            const batch = emails.slice(i, i + batchSize);
            await Promise.all(batch.map(email => {
                return sendEmail(email,`You're Invited to a Meeting.`,meesage)
            }));
        }
    };

    // Send emails in batches of 10
    await sendEmailsInBatches(emails, 10);

     return NextResponse.json({success: true},{status: 200});
    } catch (error) {
     return NextResponse.json({success: false,message: error.message},{status: 500})
    }
     
 }
