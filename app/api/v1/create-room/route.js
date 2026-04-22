const { NextResponse } = require("next/server")
import connectDB from '@/lib/connnectDB'
import roomModel from '@/lib/roomModel';
import cloudinary from 'cloudinary';

const cloudinaryConfig = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
}
cloudinary.config(cloudinaryConfig);

export const POST = async (req) => {
    try {
        await connectDB()
        const { user_id, room_id, start_time, user_plan, end_time, isSchedule, description, scheduleTime, status, image } = await req.json();


        console.log(scheduleTime, "AAAAAAA")

        let imageUrl = null;
        let imagePublicId = null;
        if (image) {
            const result = await cloudinary.uploader.upload(image, { folder: 'hgsingalong_meetings' });
            imageUrl = result.secure_url;
            imagePublicId = result.public_id;
        }

        const room = await roomModel.create({ user_id, room_id, start_time, user_plan, end_time, isSchedule, description, scheduleTime, status, image: { url: imageUrl, public_id: imagePublicId } });

        return NextResponse.json({ success: true, message: "Room Create Successfully", room }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

}


export const GET = async (req) => {
    try {
        await connectDB()
        const query = new URLSearchParams(req.url.split('?')[1]);
        const room_id = query.get('room_id');
        const room = await roomModel.findOne({ room_id })

        return NextResponse.json({ success: true, room }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

}


export const PUT = async (req) => {
    try {
        await connectDB()
        const query = new URLSearchParams(req.url.split('?')[1]);
        const room_id = query.get('room_id');
        const { start_time, end_time } = await req.json();

        const room = await roomModel.findOneAndUpdate({ room_id }, { start_time, end_time, isSchedule: false });


        return NextResponse.json({ success: true, room }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

}
