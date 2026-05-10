'use client';

import Image from 'next/image';

import { cn } from '@/lib/utils';

interface HomeCardProps {
  className?: string;
  img: string;
  title: string;
  description: string;
  handleClick?: () => void;
}

const HomeCard = ({ className, img, title, description, handleClick }: HomeCardProps) => {
  return (
    <section
      className={cn(
        'card-premium px-4 py-4 flex flex-col gap-3 w-full min-h-[140px] cursor-pointer max-w-full sm:max-w-[18rem]',
        className
      )}
      onClick={handleClick}
    >
      <div className="flex-center glassmorphism size-9 rounded-lg">
        <Image src={img} alt="meeting" width={18} height={18} />
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="text-base font-bold text-white">{title}</h1>
        <p className="text-xs font-normal text-white/75">{description}</p>
      </div>
    </section>
  );
};

export default HomeCard;
