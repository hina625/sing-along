import CallList from '@/components/CallList';

const PreviousPage = () => {
  return (
    <section className="flex size-full flex-col gap-16 text-white">
      <h1 className="text-4xl sm:text-5xl md:text-6xl text-center font-bold mt-24 mb-16">Recordings</h1>
      
      <CallList type="recordings" />

    </section>
  );
};

export default PreviousPage;
