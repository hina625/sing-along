'use client'
import Image from 'next/image';
import Link from 'next/link';
import { SignedIn, useUser, UserButton } from '@clerk/nextjs';
import { useState, useEffect } from 'react';

import MobileNav from './MobileNav';
import NotificationBell from './NotificationBell';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import ThemeToggle from './ThemeToggle';

const Navbar = () => {
  const { user } = useUser();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <nav className="flex-between fixed z-50 top-0 right-0 left-0 lg:left-[264px] px-6 py-3 lg:px-10 max-sm:px-4 max-sm:py-3 bg-background-3/85 backdrop-blur-md border-b border-white/5 lg:justify-end">
      <Link href="/" className="flex flex-col items-center justify-center z-20 lg:hidden">
        <Image
          src="/icons/full-logo.png"
          width={100}
          height={100}
          alt="Sing Along logo"
          className="max-sm:h-[50px] max-sm:w-auto"
        />
        <span className='text-[#024d04] font-bold text-[12px] leading-tight max-sm:block hidden' style={{ fontFamily: "'Marcellus', serif" }}>Connect</span>


      </Link>
      <div className="flex-between gap-4 text-white">
        {isMounted && (
          <SignedIn>
            <div className='flex gap-3 text-white items-center justify-center'>
              <WorkspaceSwitcher />
              <NotificationBell />
              <ThemeToggle />
              <UserButton afterSignOutUrl="/sign-in" appearance={{ elements: { userButtonAvatarBox: 'custom-avatar' } }} />
              <span className="max-sm:hidden" style={{ fontSize: '14px', fontWeight: 500 }}>{user?.fullName || user?.firstName}</span>
            </div>
          </SignedIn>
        )}

        <MobileNav />
      </div>
    </nav>
  );
};

export default Navbar;
