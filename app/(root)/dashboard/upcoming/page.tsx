import CallListUpcoming from '@/components/CallListUpcoming';
import PermissionGate from '@/components/PermissionGate';

const UpcomingPage = () => {
  return (
    <section className="flex size-full flex-col gap-8 text-white pb-12">
      <header className="text-center mt-20 mb-4">
        <h1 className="text-4xl sm:text-5xl font-bold !text-white tracking-tight">
          Upcoming Meetings
        </h1>
        <p className="text-white/55 mt-3 max-w-xl mx-auto">
          Everything scheduled — services, team meetings, and sessions in your workspace.
        </p>
      </header>

      <CallListUpcoming />
    </section>
  );
};

export default function UpcomingPageGated() {
  return (
    <PermissionGate resource="meetings" action="view">
      <UpcomingPage />
    </PermissionGate>
  );
}
