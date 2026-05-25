import Image from 'next/image';

interface LoaderProps {
  label?: string;
}

const Loader = ({ label }: LoaderProps) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen w-full gap-4 bg-[#111] text-white">
      <Image
        src="/icons/loading-circle.svg"
        alt="Loading..."
        width={50}
        height={50}
      />
      {label && <p className="text-white text-lg font-medium">{label}</p>}
    </div>
  );
};

export default Loader;
