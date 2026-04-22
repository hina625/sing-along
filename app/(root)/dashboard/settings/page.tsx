import React from 'react'

const SettingsPage = () => {
  return (
    <section className='flex size-full flex-col gap-10 text-white'>
      <div className="flex items-center justify-center flex-col mt-24 mb-16">
        <h2 className="mt-4 !text-6xl !text-white font-bold">
          Settings
        </h2>
        <p className="text-xl text-white/70 mt-4">Configure your account and workspace preferences.</p>
      </div>

      <div className='flex items-center justify-center min-h-[300px] border-2 border-dashed border-white/20 rounded-xl'>
        <p className='text-white/50 text-2xl'>Account settings coming soon...</p>
      </div>
    </section>
  )
}

export default SettingsPage
