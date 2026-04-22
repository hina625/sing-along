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
    <nav className="flex-between fixed z-50 w-full px-6 py-4 lg:px-10 ">
      <Link href="/" className="flex items-center gap-1 z-20">
        <Image
          src="/icons/full-logo.png"
          width={70}
          height={70}
          alt="Sing Along logo"
          className="max-sm:size-10"
        />
        <span className="text-center" style={{ marginLeft: 20 }}>
            <h3
              style={{
                color: "#eb6e0c",
                marginBottom: 0,
                fontWeight: "bold",
                lineHeight: '20px'
              }}
            >
              Sing Along
            </h3>
          </span>
        
      </Link>
      <div className="flex-between gap-5 text-white">
        <div className='flex gap-4 items-center justify-center mr-4'>
           <IoNotificationsOutline size={26} className="cursor-pointer hover:text-orange-500 transition-colors" />
        </div>
        {isMounted && (
          <SignedIn>
            <div className='flex gap-2 text-white items-center justify-center'>
            <UserButton afterSignOutUrl="/sign-in" appearance={{elements: {userButtonAvatarBox: 'custom-avatar'}}}/>
            <span style={{ fontSize: '18px', fontWeight: 'normal' }}>{user?.fullName || user?.firstName}</span>
            </div>
          </SignedIn>
        )}

        <MobileNav />
      </div>
    </nav>
  );
};

export default Navbar;
