import { ParticleNetworkBackground } from "@/components/ui/particle-network-background";
import { CpuArchitecture } from "@/components/ui/cpu-architecture";

export default function Home() {
  return (
    <div className="relative h-full w-full bg-black">
      <ParticleNetworkBackground />
      <div className="absolute inset-0 z-[5] backdrop-blur-[2px]" />
      <div className="absolute inset-0 z-10 flex items-center justify-center px-4">
        <div className="w-full max-w-4xl">
          <CpuArchitecture text="Ares AI PA" className="text-white/20" />
        </div>
      </div>
    </div>
  );
}
