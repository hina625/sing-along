'use client'
import Image from 'next/image';
import Link from 'next/link';
import { SignedIn, useUser, UserButton } from '@clerk/nextjs';
import { IoNotificationsOutline } from "react-icons/io5";
import { useState, useEffect } from 'react';

import MobileNav from './MobileNav';

const Navbar = () => {
  const { user } = useUser();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <nav className="flex-between fixed z-50 w-full px-6 py-4 lg:px-10 max-sm:px-4 max-sm:py-3 bg-background-3/80 backdrop-blur-md lg:bg-transparent lg:backdrop-blur-none lg:justify-end">
      <Link href="/" className="flex flex-col items-center justify-center z-20 lg:hidden">
        <Image
          src="/icons/full-logo.png"
          width={100}
          height={100}
          alt="Sing Along logo"
          className="max-sm:h-[50px] max-sm:w-auto"
        />
        <span className='text-[#F57C00] font-bold text-[12px] leading-tight max-sm:block hidden' style={{ fontFamily: "'Marcellus', serif" }}>Connect</span>
        
        
      </Link>
      <div className="flex-between gap-4 text-white">
        {isMounted && (
          <SignedIn>
            <div className='flex gap-4 text-white items-center justify-center'>
              <IoNotificationsOutline size={26} className="cursor-pointer hover:text-orange-500 transition-colors" />
              <UserButton afterSignOutUrl="/sign-in" appearance={{elements: {userButtonAvatarBox: 'custom-avatar'}}}/>
              <span className="max-sm:hidden" style={{ fontSize: '18px', fontWeight: 'normal' }}>{user?.fullName || user?.firstName}</span>
            </div>
          </SignedIn>
        )}

        <MobileNav />
      </div>
    </nav>
  );
};

export default Navbar;
