import { ParticleNetworkBackground } from "@/components/ui/particle-network-background";

export default function Home() {
  return (
    <div className="relative h-full w-full bg-black">
      <ParticleNetworkBackground />
      <h1 className="absolute inset-0 z-10 flex items-center justify-center text-center font-sans text-4xl font-bold tracking-tight text-white sm:text-5xl">
        Ares your AI PA
      </h1>
    </div>
  );
}
