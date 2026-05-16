'use client'
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
    <nav className="dashboard-navbar fixed z-50 top-0 right-0 left-0 lg:left-[264px] flex items-center justify-between lg:justify-end px-6 py-3 lg:px-10 max-sm:px-3 max-sm:py-2 bg-background-3/85 backdrop-blur-md border-b border-white/5 gap-3">
      <div className="flex items-center gap-2 lg:hidden">
        <MobileNav />
      </div>

      {isMounted && (
        <SignedIn>
          <div className="flex items-center gap-1.5 sm:gap-3 text-white">
            <WorkspaceSwitcher />
            <NotificationBell />
            <div className="max-sm:hidden">
              <ThemeToggle />
            </div>
            <UserButton afterSignOutUrl="/sign-in" appearance={{ elements: { userButtonAvatarBox: 'custom-avatar' } }} />
            <span className="max-sm:hidden" style={{ fontSize: '14px', fontWeight: 500 }}>{user?.fullName || user?.firstName}</span>
          </div>
        </SignedIn>
      )}
    </nav>
  );
};

export default Navbar;
