'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';


import { Sheet, SheetClose, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { planslist, sidebarLinks } from '@/constants';
import { cn } from '@/lib/utils';
import { BsCalendar2Check } from "react-icons/bs";
import { BsCalendar2Minus } from "react-icons/bs";
import { MdOutlineDashboard, MdSettings } from "react-icons/md";
import { AiOutlineVideoCamera } from "react-icons/ai";
import { RiVideoChatLine } from "react-icons/ri";
import { FiUsers, FiMenu } from "react-icons/fi";
import { BiDonateHeart } from "react-icons/bi";
import { useContext } from 'react';
import { subscriptionContext } from '@/providers/SubscriptionProvider'
import PartnerDialog from './PartnerDialog';

interface IconMap {
  [key: string]: JSX.Element;
}



const MobileNav = () => {
  const pathname = usePathname();
  const { subscription } = useContext(subscriptionContext)

  const icons: IconMap = {
    '1': <AiOutlineVideoCamera size={24} />,
    '2': <RiVideoChatLine size={24} />,
    '3': <BsCalendar2Check size={24} />,
    '4': <MdOutlineDashboard size={24} />,
    '5': <FiUsers size={24} />,
    '6': <BiDonateHeart size={24} />,
    '7': <MdSettings size={24} />,
  };

  return (
    <section className="w-full max-w-[264px]">
      <Sheet>
        <SheetTrigger asChild>
          <FiMenu size={36} className="cursor-pointer sm:hidden text-white" />
        </SheetTrigger>
        <SheetContent side="left" className="border-none bg-background-3 p-0">
          <div className="flex h-full flex-col sidebar-glow no-scrollbar overflow-y-auto">
            <div className="p-6">
              <Link href="/" className="flex items-center gap-1">
                <Image
                  src="/icons/full-logo.png"
                  width={140}
                  height={140}
                  alt="Sing Along logo"
                />
              </Link>
            </div>
            
            <div className="flex flex-1 flex-col justify-between p-6 pt-0">
              <section className="flex h-full flex-col gap-6 text-white">
                {sidebarLinks.map((item) => {
                  const isActive = pathname === item.route;
                  const ss: string = String(item.Icon);
                  const Icon = icons[ss];
                  return (
                    <SheetClose asChild key={item.route}>
                      <Link
                        href={item.route}
                        key={item.label}
                        className={cn(
                          'flex gap-4 items-center p-4 rounded-lg w-full max-w-60',
                          {
                            'bg-orange-500': isActive,
                          }
                        )}
                      >
                        <span className="text-white">
                          {Icon}
                        </span>
                        <p className="font-semibold">{item.label}</p>
                      </Link>
                    </SheetClose>
                  );
                })}

                <div className='mt-auto'>
                  <div className='py-2 border-b border-t border-white/40 flex items-center justify-between !bg-[url("/images/green.jpg")] rounded-md p-2'>
                    <div className='flex flex-col'>
                      <h4 className='text-white/90 text-2xl mb-1'>{subscription || 'free'}</h4>
                      <p className='text-white/70 text-xs'> No Cost ${planslist[subscription || 'free']?.price}/month</p>
                    </div>
                    <SheetClose asChild>
                      <Link href={'/plans'} className='block py-2 px-4 text-white/90 rounded-3xl hover:bg-black/30 text-sm '>Upgrade</Link>
                    </SheetClose>
                  </div>

                  {
                    (subscription === "free" || !subscription) &&
                    <div className='pb-8'>
                      <PartnerDialog>
                        <div className='flex items-center justify-center mt-2 cursor-pointer w-full'>
                          <button
                            className="relative btn-primary-worship py-3 w-full group overflow-hidden"
                          >
                            <span
                              className="absolute top-0 right-0 inline-block w-4 h-4 transition-all duration-500 ease-in-out bg-orange-700 rounded group-hover:-mr-4 group-hover:-mt-4"
                            >
                              <span
                                className="absolute top-0 right-0 w-5 h-5 rotate-45 translate-x-1/2 -translate-y-1/2 bg-background-3"
                              ></span>
                            </span>
                            <span
                              className="absolute bottom-0 rotate-180 left-0 inline-block w-4 h-4 transition-all duration-500 ease-in-out bg-orange-700 rounded group-hover:-ml-4 group-hover:-mb-4"
                            >
                              <span
                                className="absolute top-0 right-0 w-5 h-5 rotate-45 translate-x-1/2 -translate-y-1/2 bg-background-3"
                              ></span>
                            </span>
                            <span
                              className="absolute bottom-0 left-0 w-full h-full transition-all duration-500 ease-in-out delay-200 -translate-x-full bg-orange-600 rounded-md group-hover:translate-x-0"
                            ></span>
                            <span
                              className="relative w-full text-left text-white transition-colors duration-200 ease-in-out group-hover:text-white"
                            >Partnering with Us</span
                            >
                          </button>
                        </div>
                      </PartnerDialog>
                      <p className='text-xs font-light mt-1'>Working together, we can make an eternal impact.</p>
                    </div>
                  }
                </div>
              </section>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
};

export default MobileNav;
