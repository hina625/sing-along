'use client'
import { useToast } from '@/components/ui/use-toast'
import { planslist } from '@/constants'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'
import { useRouter } from 'next/navigation';
import React, { useMemo, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import MeetingModal from '@/components/MeetingModal'
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';


interface props {
  searchParams: {
    plan: string
  }
}


const methodsContent = {
  "cash": {
    heading: "Cash App Payment",
    content: "Please use this $Cashtag on your Cash App.",
    id: "$HallelujahGospel"
  },
  "zelle": {
    heading: "Zelle Payment",
    content: "Please use this Zelle number on your Zelle App.",
    id: "9255942138"
  },
  "venmo": {
    heading: "Venmo Payment",
    content: "Please use this Venmo number on your Venmo App.",
    id: "9255942138"
  },
}

const page = ({ searchParams }: props) => {
  const [cardNumber, setCardNumber] = useState('');
  const [expire, setExpire] = useState('');
  const [donationAmount, setdonationAmount] = useState<number>(5);
  const [firstname, setFirstName] = useState('');
  const [lastname, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [cvv, setCvv] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash'|'zelle'|'venmo' | undefined>(undefined);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  // const heading = useMemo(() => methodsContent[paymentMethod]?.heading,[paymentMethod]);
  // const content = useMemo(() => methodsContent[paymentMethod]?.content,[paymentMethod]);
  // const id = useMemo(() => methodsContent[paymentMethod]?.id,[paymentMethod]);

  const heading = useMemo(() => {
    if (!paymentMethod) return "";
    return methodsContent[paymentMethod]?.heading || "";
  }, [paymentMethod]);


  const content = useMemo(() => {
    if (!paymentMethod) return "";
    return methodsContent[paymentMethod]?.content || "";
  }, [paymentMethod]);

  const id = useMemo(() => {
    if (!paymentMethod) return "";
    return methodsContent[paymentMethod]?.id || "";
  }, [paymentMethod]);
  



  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/\D/g, ''); // Remove all non-digit characters
    const formattedCardNumber = input.replace(/(\d{4})(?=\d)/g, '$1-'); // Add hyphen every 4 digits
    setCardNumber(formattedCardNumber.slice(0, 19)); // Limit to 19 characters (16 digits + 3 hyphens)
  };

  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/\D/g, ''); // Remove all non-digit characters
    const formattedExpiryDate = input.replace(/(\d{2})(?=\d)/, '$1/'); // Add slash after 2 digits
    setExpire(formattedExpiryDate.slice(0, 5)); // Limit to 5 characters (MM/YY)
  };



  const handlePayment = async (e: React.FormEvent<HTMLFormElement>) => {
    try {
      e.preventDefault();
      setLoading(true);

      if (!cardNumber || !cvv || !expire) {
        toast({
          title: 'please fill all fields.'
        })
        return
      }

      const payload = {
        cardNumber: cardNumber.replaceAll('-', ''),
        expiryMonth: expire.split('/')[0],
        expiryYear: expire.split('/')[1],
        cvv: cvv,
        amount: donationAmount,
        email: email,
        firstName: `${firstname || ''}`,
        lastName: `${lastname || ''}`,
        ...(isRecurring && { frequency }),
      };

      const endpoint = isRecurring ? `/api/v1/donate/recurring` : `/api/v1/donate`;
      const res = await axios.post(endpoint, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      setLoading(false);

      if (res.data.success) {
        const donorName = encodeURIComponent(`${firstname || ''} ${lastname || ''}`.trim());
        if (isRecurring) {
          toast({
            title: '🎉 Partnership Support Received Successfully!',
            description: `Your ${frequency} partnership of $${donationAmount} is scheduled.`,
          });
          router.push(`/success?subscription_id=${res.data.subscriptionId}&recurring=1&amount=${donationAmount}&name=${donorName}&frequency=${frequency}`);
        } else {
          router.push(`/success?session_id=${res.data.transactionId}&amount=${donationAmount}&name=${donorName}`);
        }
      }

    } catch (error: any) {
      setLoading(false)
      toast({
        title: error?.response?.data?.message || error?.message || 'Donation failed. Please try again.',
      });
      console.log(error.message);
    }
  }

  return (
    <main className="relative">
      <Navbar />

      <div className="flex">
        <Sidebar />

        <section className="flex min-h-screen flex-1 flex-col px-6 pb-6 pt-48 lg:pt-44 max-md:pb-14 sm:px-14 bg-background-4 relative overflow-x-hidden">
          <img src='/images/golden-pattern.png' className='absolute top-0 left-[50%] -translate-x-[50%] z-1 h-[40rem] max-w-none opacity-40' />
          
          <div className="w-full z-20 mt-4 md:mt-8">
            <div className="mx-auto max-w-5xl">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl md:text-5xl font-bold text-white">
                  Partner with Us
                </h2>
                <div className="hidden md:block">
                   <p className="text-white/60 text-sm">Your partnership keeps this community growing.</p>
                </div>
              </div>

              <div className="mt-6 sm:mt-8 lg:flex lg:items-start lg:gap-12">
                <form
                  onSubmit={handlePayment}
                  className="w-full rounded-2xl bg-background-3/40 backdrop-blur-xl border border-white/10 p-5 shadow-2xl sm:p-6 lg:max-w-xl lg:p-8 card-premium"
                >
                  <div className="mb-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-white/80">
                        First Name*
                      </label>
                      <input
                        type="text"
                        className="block w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder-white/30 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                        placeholder="First Name"
                        required
                        value={firstname}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-white/80">
                        Last Name*
                      </label>
                      <input
                        type="text"
                        className="block w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder-white/30 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                        placeholder="Last Name"
                        required
                        value={lastname}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-white/80">
                      Email Address*
                    </label>
                    <input
                      type="email"
                      className="block w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder-white/30 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                      placeholder="email@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-white/80">
                      Physical Address*
                    </label>
                    <input
                      type="text"
                      className="block w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder-white/30 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                      placeholder="Your Address"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>

                  <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-white/80">
                      Amount ($)*
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50">$</span>
                      <input
                        type="number"
                        className="block w-full rounded-xl border border-white/10 bg-white/5 p-3 pl-8 text-sm text-white placeholder-white/30 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                        placeholder="0.00"
                        min={5}
                        required
                        value={donationAmount}
                        onChange={(e) => setdonationAmount(+e.target.value)}
                      />
                    </div>
                  </div>

                  {/* === Recurring toggle === */}
                  <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isRecurring}
                        onChange={(e) => setIsRecurring(e.target.checked)}
                        className="h-4 w-4 accent-orange-500"
                      />
                      <span className="text-white/90 text-sm font-medium">Make this a recurring contribution</span>
                    </label>
                    {isRecurring && (
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {(['weekly', 'monthly', 'yearly'] as const).map((freq) => (
                          <button
                            type="button"
                            key={freq}
                            onClick={() => setFrequency(freq)}
                            className={`py-2 px-3 rounded-lg text-sm font-semibold transition-all border ${
                              frequency === freq
                                ? 'bg-gradient-to-r from-[#5A2D82] to-[#D4AF37] text-white border-transparent shadow-md'
                                : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            {freq[0].toUpperCase() + freq.slice(1)}
                          </button>
                        ))}
                      </div>
                    )}
                    {isRecurring && (
                      <p className="mt-3 text-xs text-white/55 italic">
                        ${donationAmount} will be charged every {frequency === 'monthly' ? 'month' : frequency === 'weekly' ? 'week' : 'year'} until you cancel. Cancel any time from your dashboard.
                      </p>
                    )}
                  </div>

                  <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-white/80">
                      Card Number*
                    </label>
                    <input
                      type="text"
                      className="block w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder-white/30 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                      placeholder="xxxx-xxxx-xxxx-xxxx"
                      required
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                    />
                  </div>

                  <div className="mb-6 grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-white/80">
                        Expiration (MM/YY)*
                      </label>
                      <input
                        type="text"
                        className="block w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder-white/30 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                        placeholder="12/25"
                        required
                        value={expire}
                        onChange={handleExpiryDateChange}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-white/80">
                        CVV*
                      </label>
                      <input
                        type="number"
                        className="block w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder-white/30 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                        placeholder="•••"
                        required
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        maxLength={3}
                      />
                    </div>
                  </div>

                  <button
                    disabled={loading}
                    type="submit"
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-600 to-orange-400 text-white font-bold text-lg shadow-lg hover:shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </span>
                    ) : isRecurring ? `Partner ${frequency[0].toUpperCase() + frequency.slice(1)}` : 'Partner with Us'}
                  </button>

                  <div className="relative my-6 flex items-center">
                    <div className="flex-grow border-t border-white/10"></div>
                    <span className="mx-4 text-xs font-bold text-white/30 uppercase tracking-widest">or</span>
                    <div className="flex-grow border-t border-white/10"></div>
                  </div>

                  <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'cash'|'zelle'|'venmo')}>
                    <SelectTrigger className="w-full h-12 rounded-xl bg-white/5 border-white/10 text-white focus:ring-orange-500">
                      <SelectValue placeholder="Other Payment Methods" />
                    </SelectTrigger>
                    <SelectContent className="bg-background-3 border-white/10 text-white">
                      <SelectItem value="cash">Cash App</SelectItem>
                      <SelectItem value="zelle">Zelle</SelectItem>
                      <SelectItem value="venmo">Venmo</SelectItem>
                    </SelectContent>
                  </Select>
                </form>

                <div className="mt-8 grow lg:mt-0 lg:sticky lg:top-24 lg:self-start">
                  <div className="rounded-2xl bg-gradient-to-br from-orange-600/20 to-orange-400/5 border border-white/10 p-6 lg:p-8 shadow-xl">
                    <h3 className="text-xl font-bold text-white mb-4">Our Mission</h3>
                    <p className="text-white/80 leading-relaxed italic">
                      "Join us in sustaining and expanding this important work. Your partnership not only supports our community but also empowers us to reach more people with our message of hope and connection. Together, we can make a lasting impact."
                    </p>
                  </div>

                  <div className="mt-6 grid grid-cols-3 gap-6 items-center opacity-60 hover:opacity-100 transition-opacity">
                    <img className="h-6 w-auto mx-auto grayscale invert" src="https://flowbite.s3.amazonaws.com/blocks/e-commerce/brand-logos/paypal.svg" alt="PayPal" />
                    <img className="h-6 w-auto mx-auto grayscale invert" src="https://flowbite.s3.amazonaws.com/blocks/e-commerce/brand-logos/visa.svg" alt="Visa" />
                    <img className="h-6 w-auto mx-auto grayscale invert" src="https://flowbite.s3.amazonaws.com/blocks/e-commerce/brand-logos/mastercard.svg" alt="Mastercard" />
                  </div>

                  <p className="mt-4 text-sm text-white/40 text-center lg:text-left">
                    Securely processed via <span className="text-orange-500/80 font-semibold">Authorize.net</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <MeetingModal
        isOpen={!!paymentMethod}
        onClose={() => setPaymentMethod(undefined) }
        title={heading}
        className="text-center"
        isButtonShow={false}
      >
         <div className="py-6 space-y-4">
           <p className="text-lg text-white/80">{content}</p>
           <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
             <p className="text-3xl font-bold text-orange-500 tracking-wider">{id}</p>
           </div>
           <p className="text-sm text-white/40">Please screenshot your payment for confirmation.</p>
         </div>
      </MeetingModal>
    </main>
  )
}

export default page