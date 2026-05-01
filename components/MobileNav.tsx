'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';


import { Sheet, SheetClose, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { sidebarLinks } from '@/constants';
import { cn } from '@/lib/utils';
import { BsCalendar2Check } from "react-icons/bs";
import { BsCalendar2Minus } from "react-icons/bs";
import { MdOutlineDashboard, MdSettings } from "react-icons/md";
import { AiOutlineVideoCamera } from "react-icons/ai";
import { RiVideoChatLine } from "react-icons/ri";
import { FiUsers, FiMenu } from "react-icons/fi";
import { BiDonateHeart } from "react-icons/bi";

interface IconMap {
  [key: string]: JSX.Element;
}



const MobileNav = () => {
  const pathname = usePathname();

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
        <SheetContent side="left" className="border-none bg-background-3">
          <Link href="/" className="flex items-center gap-1">
            <Image
              src="/icons/full-logo.png"
              width={32}
              height={32}
              alt="Sing Along logo"
            />
          </Link>
          <div className="flex h-[calc(100vh-72px)] flex-col justify-between overflow-y-auto">
            <SheetClose asChild>
              <section className=" flex h-full flex-col gap-6 pt-16 text-white">
                {sidebarLinks.map((item) => {
                  const isActive = pathname === item.route;
                  const ss: number = item.Icon;
                  const Icon = icons[ss];
                  return (
                    <SheetClose asChild key={item.route}>
                      <Link
                        href={item.route}
                        key={item.label}
                        className={cn(
                          'flex gap-4 items-center p-4 rounded-lg w-full max-w-60',
                          {
                            'bg-blue-1': isActive,
                          }
                        )}
                      >
                        <span className={`${isActive ? 'text-white' : 'text-white/70'}`}>

                          {Icon}
                        </span>
                        <p className="font-semibold">{item.label}</p>
                      </Link>
                    </SheetClose>
                  );
                })}
              </section>
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
};

export default MobileNav;
