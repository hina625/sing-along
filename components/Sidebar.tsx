'use client';
import Image from 'next/image';


import { BsCalendar2Check } from "react-icons/bs";
import { BsCalendar2Minus } from "react-icons/bs";
import { MdOutlineDashboard, MdSettings } from "react-icons/md";
import { AiOutlineVideoCamera } from "react-icons/ai";
import { RiVideoChatLine } from "react-icons/ri";
import { FiUsers } from "react-icons/fi";
import { BiDonateHeart } from "react-icons/bi";
import { FaPrayingHands, FaMusic, FaBookOpen } from "react-icons/fa";
import { TbActivityHeartbeat } from "react-icons/tb";
import { usePathname } from 'next/navigation';
import Link from 'next/link';

import { planslist, sidebarLinks, isSidebarLinkVisible, sidebarLabelFor } from '@/constants';
import { cn } from '@/lib/utils';
import { useContext, useMemo } from 'react';
import { subscriptionContext } from '@/providers/SubscriptionProvider'
import { WorkspaceContext } from '@/providers/WorkspaceProvider';
import PartnerDialog from './PartnerDialog';

const Sidebar = () => {
  const pathname = usePathname();
  const { subscription } = useContext(subscriptionContext)
  const { activeWorkspace, can } = useContext(WorkspaceContext);
  const wsMode = activeWorkspace?.mode || 'worship';

  const visibleLinks = useMemo(
    () =>
      sidebarLinks.filter((l) => {
        if (!isSidebarLinkVisible(l.audience, wsMode)) return false;
        if (!l.resource) return true; // home, etc — always visible
        return can(l.resource, l.action || 'view');
      }),
    [wsMode, can]
  );


  interface IconMap {
    [key: string]: JSX.Element;
  }
  const icons: IconMap = {
    '1': <AiOutlineVideoCamera size={24} />,
    '2': <RiVideoChatLine size={24} />,
    '3': <BsCalendar2Check size={24} />,
    '4': <MdOutlineDashboard size={24} />,
    '5': <FiUsers size={24} />,
    '6': <BiDonateHeart size={24} />,
    '7': <MdSettings size={24} />,
    '8': <FaPrayingHands size={22} />,
    '9': <TbActivityHeartbeat size={24} />,
    '10': <FaMusic size={20} />,
    '11': <FaBookOpen size={20} />,
  };

  return (
    <section className="flex h-full w-fit flex-col bg-background-3 shadow-md text-white max-sm:hidden lg:w-[264px] sidebar-glow shrink-0">
      <div className="flex flex-col items-center gap-1 px-6 pt-5 pb-3 shrink-0">
        <Link href="/" className="flex flex-col items-center gap-1 w-full">
          <Image
            src="/icons/full-logo.png"
            width={88}
            height={88}
            alt="Sing Along logo"
          />
          <p className="text-[#F57C00] text-sm font-bold tracking-[0.25em] -mt-1 uppercase" style={{ fontFamily: "'Marcellus', serif" }}>Connect</p>
        </Link>
      </div>

      <div className="flex flex-1 flex-col gap-2 px-4 py-2 overflow-y-auto no-scrollbar min-h-0">
        {visibleLinks.map((item) => {
          const isActive = pathname === item.route
          const Icon = icons[item.Icon.toString()];
          // Mode-aware label: community → "Start Gathering", worship/hybrid → "Start Worship", business → "Start Meeting".
          const label = sidebarLabelFor(item, wsMode);
          return (
            <Link
              href={item.route}
              key={item.label}
              className={cn(
                'flex gap-4 items-center p-3 rounded-lg justify-start',
                {
                  'bg-orange-500': isActive,
                }
              )}
            >
              <span className="text-white">
                {Icon}
              </span>

              <p className="text-base text-white font-semibold">
                {label}
              </p>
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 px-4 py-4 border-t border-white/10 shrink-0">
        <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3 flex items-center justify-between gap-3">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-white/45">Plan</span>
            <h4 className="text-white font-semibold text-sm capitalize truncate">{subscription}</h4>
            <p className="text-white/55 text-[11px]">${planslist[subscription as keyof typeof planslist]?.price || 0}/month</p>
          </div>
          {subscription === 'free' && (
            <Link
              href="/plans"
              className="shrink-0 px-3 py-1.5 rounded-md text-xs font-semibold text-deep-gold border border-deep-gold/50 hover:bg-deep-gold/10 transition-colors"
            >
              Upgrade
            </Link>
          )}
        </div>

        {subscription === 'free' && (
          <PartnerDialog>
            <button
              type="button"
              className="sidebar-partner-link w-full text-xs font-semibold text-deep-gold/90 hover:text-deep-gold text-left transition-colors"
            >
              Partner with us →
            </button>
          </PartnerDialog>
        )}
      </div>
    </section>
  );
};

export default Sidebar;