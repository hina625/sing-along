'use client'
import Footer from '@/components/Footer'
import Navbar2 from '@/components/Navbar2'
import { useToast } from '@/components/ui/use-toast'
import { planslist } from '@/constants'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'
import { useRouter } from 'next/navigation';
import React, { useState } from 'react'

interface props 
{
  searchParams: {
    plan?: string
  }
}

const page = ({searchParams}:props) => {
  const planKey = searchParams?.plan || '';
  const currentPlan = planslist[planKey];

  const [cardNumber,setCardNumber] = useState('');
  const [expire,setExpire] = useState('');
  const [cvv,setCvv] = useState('');
  const [loading, setLoading] = useState(false);
  const {user} = useUser();
  const {toast} = useToast();
  const router = useRouter()


  const handleCardNumberChange = (e:React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/\D/g, ''); // Remove all non-digit characters
    const formattedCardNumber = input.replace(/(\d{4})(?=\d)/g, '$1-'); // Add hyphen every 4 digits
    setCardNumber(formattedCardNumber.slice(0, 19)); // Limit to 19 characters (16 digits + 3 hyphens)
  };

  const handleExpiryDateChange = (e:React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/\D/g, ''); // Remove all non-digit characters
    const formattedExpiryDate = input.replace(/(\d{2})(?=\d)/, '$1/'); // Add slash after 2 digits
    setExpire(formattedExpiryDate.slice(0, 5)); // Limit to 5 characters (MM/YY)
  };

 

  const handlePayment = async (e: React.FormEvent<HTMLFormElement>) => {
    try {
      e.preventDefault();
      setLoading(true)
      if(!searchParams.plan){
        toast({
          title: 'please select plan.'
        })
        return
      }
      
      if(!user){
        toast({
          title: 'please login first.'
        })
        return
      }

      if(!cardNumber || !cvv || !expire){
        toast({
          title: 'please fill all fields.'
        })
        return
      }

      const res = await axios.post(`/api/v1/payment`,{
        cardNumber: cardNumber.replaceAll('-',''),
        expiryMonth: expire.split('/')[0],
        expiryYear: expire.split('/')[1],
        cvv: cvv,
        amount: currentPlan?.price || 0,
        email: user?.primaryEmailAddress?.emailAddress,
        firstName: `${user?.firstName || ''} ${user?.lastName || ''}`,
        user_id: user.id,
        plan: planKey,
      
      },{
        headers: {
          'Content-Type': 'application/json'
        }
      });
      setLoading(false);

      if(res.data.success){
        router.push(`/success?session_id=${res.data.transactionId}`);
      }
      
    } catch (error : any) {
      setLoading(false)
      toast({
        title: error?.response?.data?.message
      });
      console.log(error.message);
    }
  }

  return (
    <div className='zeeshan !bg-bg-dark min-h-screen'>
      <Navbar2 />
      <section className="slice !bg-bg-dark !pt-[10rem] md:!pt-[8rem] pb-12 antialiased relative overflow-hidden">
        {/* Background Effects */}
        <div className="light-ray-container opacity-20"></div>
        <div className="pattern-bg absolute inset-0 opacity-10"></div>

        <div className='absolute bottom-1 left-1 z-0 hidden sm:block'>
          <img src='/images/bottom-box-shape.png' alt="shape" />
        </div>
        <div className='absolute bottom-0 right-0 z-0 hidden sm:block'>
          <img src='/images/bottom-line.png' alt="shape" />
        </div>
        <div className='absolute top-20 left-0 z-0 opacity-20 hidden sm:block'>
          <img src='/images/left-plus.png' alt="shape" />
        </div>

        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div>
            <h2 className="main-header text-2xl sm:text-3xl lg:text-4xl mb-6 sm:mb-8">
              Checkout
            </h2>

            <div className="mt-4 sm:mt-8 lg:flex lg:items-start lg:gap-12">
              <form
                onSubmit={handlePayment}
                className="w-full card-awesome-black soft-glow !p-4 sm:!p-6 lg:max-w-xl"
              >
                <h3 className="text-lg sm:text-xl font-bold text-white border-b border-white/10 pb-3">Payment Details</h3>

                <div className="col-span-2 sm:col-span-1">
                  <label
                    htmlFor="card-number-input"
                    className="mb-1.5 block text-sm font-medium text-white/90"
                  >
                    Card Number*
                  </label>
                  <input
                    type="text"
                    id="card-number-input"
                    className="block w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white placeholder-white/30 focus:border-deep-gold focus:ring-1 focus:ring-deep-gold outline-none transition-all"
                    placeholder="xxxx-xxxx-xxxx-xxxx"
                    required
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label
                      htmlFor="card-expiration-input"
                      className="mb-1.5 block text-sm font-medium text-white/90"
                    >
                      <span className="sm:hidden">Expiry*</span>
                      <span className="hidden sm:inline">Expiration Date*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="card-expiration-input"
                        type="text"
                        className="block w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white placeholder-white/30 focus:border-deep-gold focus:ring-1 focus:ring-deep-gold outline-none transition-all"
                        placeholder="MM/YY"
                        required
                        value={expire}
                        onChange={handleExpiryDateChange}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label
                      htmlFor="cvv-input"
                      className="mb-1.5 flex items-center gap-1 text-sm font-medium text-white/90"
                    >
                      CVV*
                    </label>
                    <input
                      type="number"
                      id="cvv-input"
                      className="block w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white placeholder-white/30 focus:border-deep-gold focus:ring-1 focus:ring-deep-gold outline-none transition-all"
                      placeholder="•••"
                      required
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      maxLength={3}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary-worship w-full py-3.5 text-base sm:text-lg"
                >
                  {loading ? 'Processing...' : `Pay $${currentPlan?.price || 0}.00 Now`}
                </button>

                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3 sm:p-4">
                  <div className="flex items-center justify-center gap-2 text-emerald-400">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-bold uppercase tracking-wider">Secure Checkout</span>
                  </div>
                  <p className="mt-2 text-center text-xs text-white/60 leading-relaxed">
                    Your information is protected with <span className="text-white/85 font-semibold">256-bit SSL encryption</span>. Card details are tokenized by our payment gateway and are never stored on our servers.
                  </p>
                  <div className="mt-3 flex flex-col items-center text-center gap-2 pt-3 border-t border-white/10 sm:flex-row sm:justify-center sm:gap-3">
                    <img
                      src="/images/an.svg"
                      alt="Authorize.Net — Secure Payment Processor"
                      className="logo-an h-7 w-auto shrink-0"
                    />
                    <p className="text-xs text-white/60">
                      Secure payments powered by <span className="text-deep-gold font-semibold">Authorize.Net</span>
                    </p>
                  </div>
                </div>
              </form>

              <div className="mt-6 sm:mt-8 grow lg:mt-0">
                <div className="space-y-3 card-awesome-black !p-4 sm:!p-6 w-full lg:max-w-md">
                  <h3 className="text-lg sm:text-xl font-bold text-white border-b border-white/10 pb-2 whitespace-nowrap">Order Summary</h3>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Selected Plan</span>
                      <span className="text-white font-semibold uppercase">{currentPlan?.title || 'None'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Base Price</span>
                      <span className="text-white font-medium">
                        ${(currentPlan?.price || 0) + (currentPlan?.saving || 0)}.00
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Savings</span>
                      <span className="text-green-500 font-medium">
                        -${currentPlan?.saving || 0}.00
                      </span>
                    </div>

                    <div className="pt-3 mt-1 border-t border-white/10 flex items-center justify-between">
                      <span className="text-lg sm:text-xl font-bold text-white">Total</span>
                      <span className="text-xl sm:text-2xl font-bold text-gradient">
                        ${currentPlan?.price || 0}.00
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-center gap-6 opacity-60">
                  <img
                    className="logo-brand h-8 w-auto"
                    src="https://flowbite.s3.amazonaws.com/blocks/e-commerce/brand-logos/paypal.svg"
                    alt="paypal"
                  />
                  <img
                    className="logo-brand h-8 w-auto"
                    src="https://flowbite.s3.amazonaws.com/blocks/e-commerce/brand-logos/visa.svg"
                    alt="visa"
                  />
                  <img
                    className="logo-brand h-8 w-auto"
                    src="https://flowbite.s3.amazonaws.com/blocks/e-commerce/brand-logos/mastercard.svg"
                    alt="mastercard"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>

  )
}

export default page