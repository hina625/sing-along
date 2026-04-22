const { NextResponse } = require("next/server")
import connectDB from '@/lib/connnectDB'
import subscriptionModel from '@/lib/userModel';

export const POST = async () => {
    await connectDB()
    return NextResponse.json({message: 'hello world'});
}

export const GET = async (req) => {
   try {
    await connectDB()
    const user_id = new URLSearchParams(req.url.split('?')[1]).get('user_id');
    const now = new Date();


    const alls = await subscriptionModel.find();
    
   
    const subscription = await subscriptionModel.findOne({
      user_id
    });

    

    if(!subscription){
        return NextResponse.json({
            plan: 'free'
        })
    }
    if(now > new Date(subscription.subscription_expire)){
        return NextResponse.json({
            plan: 'free'
        }) 
    }
    return NextResponse.json({
        plan: subscription.subscription,
        details: subscription
    })
   } catch (error) {
    return NextResponse.json({success: false,message: error.message},{status: 500})
   }
    
}
