const { NextResponse } = require("next/server")
import connectDB from '@/lib/connnectDB'
import subscriptionModel from '@/lib/userModel';
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);


export const GET = async (req) => {
   try {
    await connectDB()
    const  query = new URLSearchParams(req.url.split('?')[1]);
    const user_id = query.get('user_id');
    const plan = query.get('plan');
    const session_id = query.get('session_id')
    
    const result = await stripe.checkout.sessions.retrieve(session_id, { expand: ['payment_intent.payment_method'] });
    const subscription_expire = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000))
    const user = await subscriptionModel.findOne({user_id})
   
    if(user){
      user.subscription = plan;
      user.subscribe_start = new Date(Date.now());
      user.subscription_expire = subscription_expire;
      await user.save();
    }else{
       await subscriptionModel.create({user_id,subscription:plan,subscribe_start: new Date(Date.now()), subscription_expire})
    }


    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id=${session_id}`);
   } catch (error) {
    return NextResponse.json({success: false,message: error.message},{status: 500})
   }
    
}
