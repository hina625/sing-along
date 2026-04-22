import { Metadata } from 'next';
import { ReactNode } from 'react';

import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Sing Along',
  description: 'A workspace for your team, powered by Stream Chat and Clerk.',
};

const RootLayout = ({ children }: Readonly<{ children: ReactNode }>) => {
  return (
    <main className="relative">
      <Navbar />

      <div className="flex">
        <Sidebar />

        <section className="flex min-h-screen flex-1 flex-col px-6 pb-6 pt-28 max-md:pb-14 sm:px-14 bg-background-4 relative">
          <img src='/images/golden-pattern.png' className='absolute top-0 left-[50%] -translate-x-[50%] right-0 z-1 h-[40rem]' />
          <div className="w-full z-20">{children}</div>
        </section>
      </div>
    </main>
  );
};

export default RootLayout;
