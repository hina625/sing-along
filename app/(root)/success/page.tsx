'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import React, { Suspense } from 'react'

const formatDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}/${day}/${year}`
}

const SuccessContent = () => {
  const searchParams = useSearchParams()
  const name = searchParams.get('name') || ''
  const amount = searchParams.get('amount') || ''
  const frequency = searchParams.get('frequency') || ''
  const isRecurring = searchParams.get('recurring') === '1'
  const date = formatDate(new Date())

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-1 overflow-x-hidden px-4 py-12">
      <div className="bg-gray-200 shadow-md rounded-md p-6 md:p-8 w-full max-w-xl flex items-center justify-center flex-col">
        <svg viewBox="0 0 24 24" className="text-green-600 w-16 h-16 mx-auto my-4 bg-white rounded-full">
          <path
            fill="currentColor"
            d="M12,0A12,12,0,1,0,24,12,12.014,12.014,0,0,0,12,0Zm6.927,8.2-6.845,9.289a1.011,1.011,0,0,1-1.43.188L5.764,13.769a1,1,0,1,1,1.25-1.562l4.076,3.261,6.227-8.451A1,1,0,1,1,18.927,8.2Z"
          />
        </svg>
        <div className="text-center">
          <h3 className="md:text-2xl text-lg text-black font-semibold text-center">
            🎉 Partnership Support Received Successfully!
          </h3>
          {name && (
            <p className="text-black/80 mt-4 text-left whitespace-pre-line">{`Hello ${name},`}</p>
          )}
          <p className="text-black/70 mt-3 text-left">
            Thank you for partnering with Hallelujah Gospel Globally. Your support and generosity help us
            continue building meaningful connections and creating a platform that brings people together
            worldwide.
          </p>
          {amount && (
            <div className="mt-4 text-left text-black/80">
              <p>
                <strong>Partnership Amount:</strong> ${amount}
                {isRecurring && frequency ? ` (${frequency})` : ''}
              </p>
              <p>
                <strong>Date:</strong> {date}
              </p>
            </div>
          )}
          <p className="text-black/70 mt-4 text-left">
            We truly appreciate your trust and support. Thank you for being part of our journey.
          </p>
          <p className="text-black/70 mt-4 text-left">
            Warm regards,
            <br />
            The Hallelujah Gospel Globally Team
          </p>
          <div className="py-8 text-center">
            <Link href="/" className="px-12 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3">
              GO BACK
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

const Page = () => {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  )
}

export default Page
