import CallList from "@/components/CallList";

const PreviousPage = () => {
  return (
    <section className="flex size-full flex-col gap-10 text-white">
      <h1 className="text-6xl text-center font-bold  !text-white mt-24 mb-16">Previous Meetings</h1>

      <CallList type="ended" />
    </section>
  );
};

export default PreviousPage;
