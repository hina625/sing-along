const { NextResponse } = require("next/server")
import {planslist} from '@/constants'
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const GET = async (req) => {
   try {
    const query = new URLSearchParams(req.url.split('?')[1]);
    const user_id = query.get('user_id');
    const planname = query.get('plan');
    const plan = planslist[planname]

    const session = await stripe.checkout.sessions.create({
      line_items: [
          {
              price_data: {
                  currency: 'usd',
                  product_data: {
                      name: plan.title
                  },
                  unit_amount: plan.price * 100
              },
              quantity: 1
          }       
      ],
      mode: 'payment',
      shipping_address_collection: {
          allowed_countries: ['US', 'BR']
      },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/subscription/complete?session_id={CHECKOUT_SESSION_ID}&user_id=${user_id}&plan=${planname}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/subscription/cancel`
  })
    return NextResponse.redirect(session.url);

   } catch (error) {
    return NextResponse.json({success: false,message: error.message},{status: 500})
   }
    
}
