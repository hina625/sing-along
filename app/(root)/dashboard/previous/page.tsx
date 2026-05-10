import CallList from "@/components/CallList";
import PermissionGate from "@/components/PermissionGate";

const PreviousPage = () => {
  return (
    <section className="flex size-full flex-col gap-10 text-white">
      <h1 className="text-4xl sm:text-5xl md:text-6xl text-center font-bold  !text-white mt-24 mb-16">Previous Meetings</h1>

      <CallList type="ended" />
    </section>
  );
};

export default function PreviousPageGated() {
  return (
    <PermissionGate resource="meetings" action="view">
      <PreviousPage />
    </PermissionGate>
  );
}
