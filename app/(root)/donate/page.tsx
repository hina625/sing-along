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

      const res = await axios.post(`/api/v1/donate`, {
        cardNumber: cardNumber.replaceAll('-', ''),
        expiryMonth: expire.split('/')[0],
        expiryYear: expire.split('/')[1],
        cvv: cvv,
        amount: donationAmount,
        email: email,
        firstName: `${firstname || ''}`,
        lastName: `${lastname || ''}`,
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      setLoading(false);

      if (res.data.success) {
        router.push(`/success?session_id=${res.data.transactionId}`);
      }

    } catch (error: any) {
      setLoading(false)
      toast({
        title: error?.response?.data?.message
      });
      console.log(error.message);
    }
  }

  return (
    <>
      <section className="bg-background-3 py-8 antialiased  md:py-16 min-h-[100vh] flex items-center justify-center">
        <div className='absolute bottom-1 left-1 z-0'>
          <img src='/images/bottom-box-shape.png' />
        </div>
        <div className='absolute bottom-0 right-0 z-0'>
          <img src='/images/bottom-line.png' />
        </div>
        <div className="mx-auto max-w-screen-xl px-4 2xl:px-0">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-xl font-semibold text-gradient sm:text-2xl">
              Donate
            </h2>
            <div className="mt-6 sm:mt-8 lg:flex lg:items-start lg:gap-12">
              <form
                onSubmit={handlePayment}
                className="w-full rounded-lg bg-background-4 p-4 shadow-sm  sm:p-6 lg:max-w-xl lg:p-8"
              >
                <div className="mb-6 grid grid-cols-2 gap-4">
                  <div>
                    <label

                      className="mb-2 block text-sm font-medium text-white dark:text-white"
                    >
                      First Name*{" "}
                    </label>
                    <div className="relative">

                      <input


                        type="text"
                        className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-black focus:border-primary-500 focus:ring-primary0"
                        placeholder="First Name"
                        required
                        value={firstname}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      className="mb-2 flex items-center gap-1 text-sm font-medium text-white dark:text-white"
                    >
                      Last Name*


                    </label>
                    <input
                      type="text"

                      aria-describedby="helper-text-explanation"
                      className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-black focus:border-primary-500 focus:ring-primary0"
                      placeholder="•••"
                      required
                      value={lastname}
                      onChange={(e) => setLastName(e.target.value)}

                    />
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1 mb-5">
                  <label
                    className="mb-2 block text-sm font-medium text-white "
                  >
                    {" "}
                    Email*{" "}
                  </label>
                  <input
                    type="email"
                    className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 pe-10 text-sm text-black focus:border-primary-500 focus:ring-primary-500"
                    placeholder="Email"
                    // pattern="^4[0-9]{12}(?:[0-9]{3})?$"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="col-span-2 sm:col-span-1 mb-5">
                  <label
                    className="mb-2 block text-sm font-medium text-white "
                  >
                    {" "}
                    Address*{" "}
                  </label>
                  <input
                    type="text"
                    className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 pe-10 text-sm text-black focus:border-primary-500 focus:ring-primary-500"
                    placeholder="Address"
                    // pattern="^4[0-9]{12}(?:[0-9]{3})?$"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                <div className="col-span-2 sm:col-span-1 mb-5">
                  <label
                    className="mb-2 block text-sm font-medium text-white "
                  >
                    {" "}
                    Donation Amount*{" "}
                  </label>
                  <input
                    type="number"
                    className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 pe-10 text-sm text-black focus:border-primary-500 focus:ring-primary-500"
                    placeholder="Amount"
                    min={5}
                    required
                    value={donationAmount}
                    onChange={(e) => setdonationAmount(+e.target.value)}
                  />
                </div>



                <div className="col-span-2 sm:col-span-1 mb-5">
                  <label
                    htmlFor="card-number-input"
                    className="mb-2 block text-sm font-medium text-white "
                  >
                    {" "}
                    Card number*{" "}
                  </label>
                  <input
                    type="text"
                    id="card-number-input"
                    className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 pe-10 text-sm text-black focus:border-primary-500 focus:ring-primary-500"
                    placeholder="xxxx-xxxx-xxxx-xxxx"
                    // pattern="^4[0-9]{12}(?:[0-9]{3})?$"
                    required
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                  />
                </div>



                <div className="mb-6 grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="card-expiration-input"
                      className="mb-2 block text-sm font-medium text-white dark:text-white"
                    >
                      Card expiration*{" "}
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5">
                        <svg
                          className="h-4 w-4 text-gray-500 dark:text-gray-400"
                          aria-hidden="true"
                          xmlns="http://www.w3.org/2000/svg"
                          width={24}
                          height={24}
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5 5a1 1 0 0 0 1-1 1 1 0 1 1 2 0 1 1 0 0 0 1 1h1a1 1 0 0 0 1-1 1 1 0 1 1 2 0 1 1 0 0 0 1 1h1a1 1 0 0 0 1-1 1 1 0 1 1 2 0 1 1 0 0 0 1 1 2 2 0 0 1 2 2v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a2 2 0 0 1 2-2ZM3 19v-7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Zm6.01-6a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm2 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm6 0a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm-10 4a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm6 0a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm2 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <input

                        datepicker-format="mm/yy"
                        id="card-expiration-input"
                        type="text"
                        className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 ps-9 text-sm text-black focus:border-blue-500 focus:ring-blue-500  dark:focus:border-blue-500 dark:focus:ring-blue-500"
                        placeholder="12/23"
                        required
                        value={expire}
                        onChange={handleExpiryDateChange}
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="cvv-input"
                      className="mb-2 flex items-center gap-1 text-sm font-medium text-white dark:text-white"
                    >
                      CVV*
                      <button
                        data-tooltip-target="cvv-desc"
                        data-tooltip-trigger="hover"
                        className="text-gray-400 hover:text-white dark:text-gray-500 dark:hover:text-white"
                      >
                        <svg
                          className="h-4 w-4"
                          aria-hidden="true"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="currentColor"


                          viewBox="0 0 24 24"
                        >
                          <path
                            fillRule="evenodd"
                            d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm9.408-5.5a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2h-.01ZM10 10a1 1 0 1 0 0 2h1v3h-1a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2h-1v-4a1 1 0 0 0-1-1h-2Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                      <div
                        id="cvv-desc"
                        role="tooltip"
                        className="tooltip invisible absolute z-10 inline-block rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white opacity-0 shadow-sm transition-opacity duration-300 dark:bg-gray-700"
                      >
                        The last 3 digits on back of card
                        <div className="tooltip-arrow" data-popper-arrow="" />
                      </div>
                    </label>
                    <input
                      type="number"
                      id="cvv-input"
                      aria-describedby="helper-text-explanation"
                      className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-black focus:border-primary-500 focus:ring-primary0"
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
                  className={`disabled:opacity-40 flex w-full items-center justify-center rounded-lg bg-primary-700 px-5 py-2.5 text-sm font-medium text-white bg-foregroud-primary focus:outline-none focus:ring-4  focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800`}
                >
                  {loading ? 'Loading...' : 'Pay now'}
                </button>

                <div className='w-full relative h-[1px] bg-gray-500 my-5 flex items-center justify-center'>
                  <span className='text-white bg-background-4 block p-1'>OR</span>
                </div>

                <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'cash'|'zelle'|'venmo')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pay Using Another Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash App</SelectItem>
                    <SelectItem value="zelle">Zelle</SelectItem>
                    <SelectItem value="venmo">Venmo</SelectItem>
                  </SelectContent>
                </Select>

              </form>


              <div className="mt-6 grow sm:mt-8 lg:mt-0">
                <div className="space-y-4 rounded-lg  bg-background-4 p-6 w-full md:w-[24rem]">
                  <p className='text-white/80 leading-6'>
                    *Join us in sustaining and expanding this powerful, God-ordained ministry. Your love gift not only supports this incredible work but also empowers us to reach more lives with His message of hope and transformation. Together, we can make an eternal impact!
                  </p>
                </div>
                <div className="mt-6 flex items-center justify-center gap-8">
                  <img
                    className="h-8 w-auto dark:hidden"
                    src="https://flowbite.s3.amazonaws.com/blocks/e-commerce/brand-logos/paypal.svg"
                    alt=""
                  />
                  <img
                    className="hidden h-8 w-auto dark:flex"
                    src="https://flowbite.s3.amazonaws.com/blocks/e-commerce/brand-logos/paypal-dark.svg"
                    alt=""
                  />
                  <img
                    className="h-8 w-auto dark:hidden"
                    src="https://flowbite.s3.amazonaws.com/blocks/e-commerce/brand-logos/visa.svg"
                    alt=""
                  />
                  <img
                    className="hidden h-8 w-auto dark:flex"
                    src="https://flowbite.s3.amazonaws.com/blocks/e-commerce/brand-logos/visa-dark.svg"
                    alt=""
                  />
                  <img
                    className="h-8 w-auto dark:hidden"
                    src="https://flowbite.s3.amazonaws.com/blocks/e-commerce/brand-logos/mastercard.svg"
                    alt=""
                  />
                  <img
                    className="hidden h-8 w-auto dark:flex"
                    src="https://flowbite.s3.amazonaws.com/blocks/e-commerce/brand-logos/mastercard-dark.svg"
                    alt=""
                  />
                </div>
              </div>
            </div>
            <p className="mt-6 text-center text-gray-500 dark:text-gray-400 sm:mt-8 lg:text-left">
              Payment processed by{" "}
              <a
                href="#"
                title=""
                className="font-medium text-primary-700 underline hover:no-underline dark:text-primary-500"
              >
                Authorizenet
              </a>{" "}
            </p>
          </div>
        </div>
      </section>


      <MeetingModal
        isOpen={!!paymentMethod}
        onClose={() => setPaymentMethod(undefined) }
        title={heading}
        className="text-center"
        isButtonShow={false}
      >
         <p className='text-center'>{content}</p>
         
         <p className='py-2 px-3 bg-gray-100 rounded-md font-normal text-center'>{id}</p>
      </MeetingModal>

    </>
  )
}

export default page