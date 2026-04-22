import { Library } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

const page = () => {
  return (
    <div className=" h-screen flex items-center justify-center bg-background-1">
      <div className="bg-gray-200 shadow-md rounded-md p-6  md:mx-auto flex items-center justify-center flex-col">
        <svg viewBox="0 0 24 24" className="text-green-600 w-16 h-16 mx-auto my-6 bg-white rounded-full">
            <path fill="currentColor"
                d="M12,0A12,12,0,1,0,24,12,12.014,12.014,0,0,0,12,0Zm6.927,8.2-6.845,9.289a1.011,1.011,0,0,1-1.43.188L5.764,13.769a1,1,0,1,1,1.25-1.562l4.076,3.261,6.227-8.451A1,1,0,1,1,18.927,8.2Z">
            </path>
        </svg>
        <div className="text-center">
            <h3 className="md:text-2xl text-base text-black font-semibold text-center">Payment Done!</h3>
            <p className="text-black/70 my-2">Thank you for completing your secure online payment.</p>
            <p className='text-black/60'> Have a great day!  </p>
            <div className="py-10 text-center">
                <a href="/" className="px-12 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3">
                    GO BACK 
               </a>
            </div>
        </div>
    </div>
  </div>
  )
}

export default page