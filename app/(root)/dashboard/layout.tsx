import { Metadata } from 'next';
import { ReactNode } from 'react';

import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import WorkspaceGate from '@/components/WorkspaceGate';

export const metadata: Metadata = {
  title: 'Sing Along',
  description: 'A workspace for your team, powered by Stream Chat and Clerk.',
};

const RootLayout = ({ children }: Readonly<{ children: ReactNode }>) => {
  return (
    <main className="relative">
      <Navbar />

      <WorkspaceGate>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />

          <section className="flex flex-1 flex-col px-4 pb-6 pt-24 lg:pt-24 max-md:pb-14 sm:px-6 lg:px-8 bg-background-4 relative overflow-y-auto overflow-x-hidden">
            <img src='/images/golden-pattern.png' className='absolute top-0 left-[50%] -translate-x-[50%] z-0 h-[28rem] max-w-none pointer-events-none opacity-30' />
            <div className="relative w-full z-20">{children}</div>
          </section>
        </div>
      </WorkspaceGate>
    </main>
  );
};

export default RootLayout;
