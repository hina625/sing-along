import MeetingTypeList from '@/components/MeetingTypeList';
import PermissionGate from '@/components/PermissionGate';
import Link from 'next/link';

const Home = () => {
  const now = new Date();

  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const date = (new Intl.DateTimeFormat('en-US', { dateStyle: 'full' })).format(now);

  return (
    <section className="flex size-full flex-col gap-5 text-white">
      <div className="time-hero h-[140px] md:h-[160px] w-full rounded-2xl bg-hero bg-cover">
        <div className="flex h-full flex-col justify-center px-5 md:px-8">
          <h1 className="text-3xl md:text-4xl font-extrabold leading-none" style={{ color: '#ffffff' }}>{time}</h1>
          <p className="mt-1 text-sm md:text-base font-medium" style={{ color: '#cfe6ff' }}>{date}</p>
        </div>
      </div>

      <MeetingTypeList />
    </section>
  );
};

export default function HomeGated() {
  return (
    <PermissionGate resource="meetings" action="manage">
      <Home />
    </PermissionGate>
  );
}
