"use client";

import { IdCard } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ParticleNetworkBackground } from "@/components/ui/particle-network-background";
import { AdmitOneTicket, TICKET_GEOMETRY, TICKET_LAYOUT } from "@/components/ui/admit-one-ticket";
import { TEAM_MEMBERS } from "@/lib/team-data";

const TICKET_WIDTH = 520;
const TICKET_HEIGHT = TICKET_WIDTH / TICKET_GEOMETRY.aspect;
const DEFAULT_STUB_FONT_PX = TICKET_LAYOUT.stubSize * TICKET_WIDTH;

/** Split a designation into "FOUNDER &" / "CHIEF EXECUTIVE OFFICER" style top+bottom rows. */
function splitDesignation(text: string): [string] | [string, string] {
  const words = text.trim().split(/\s+/);
  if (words.length <= 1) return [text];
  const ampIndex = words.indexOf("&");
  if (ampIndex !== -1 && ampIndex < words.length - 1) {
    return [words.slice(0, ampIndex + 1).join(" "), words.slice(ampIndex + 1).join(" ")];
  }
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

/** Font size for one vertical line: stays near default size if it fits its height budget, shrinks (down to a floor) if not. */
function fontPxForLine(text: string, budgetHeight: number) {
  const fitPx = budgetHeight / Math.max(1, text.length);
  return Math.min(DEFAULT_STUB_FONT_PX, Math.max(DEFAULT_STUB_FONT_PX * 0.35, fitPx));
}

function StubLabel({ designation }: { designation: string }) {
  const lines = splitDesignation(designation || "MEMBER");
  const availableHeight = TICKET_HEIGHT * 0.92;

  if (lines.length === 1) {
    const fontPx = fontPxForLine(lines[0], availableHeight);
    return (
      <span style={{ writingMode: "vertical-rl", fontSize: `${fontPx}px` }}>{lines[0]}</span>
    );
  }

  const [top, bottom] = lines;
  const topFontPx = fontPxForLine(top, availableHeight * 0.4);
  const topHeight = top.length * topFontPx;
  const bottomFontPx = fontPxForLine(bottom, Math.max(0, availableHeight - topHeight));

  return (
    <div style={{ writingMode: "horizontal-tb", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <span style={{ writingMode: "vertical-rl", fontSize: `${topFontPx}px` }}>{top}</span>
      <span style={{ writingMode: "vertical-rl", fontSize: `${bottomFontPx}px` }}>{bottom}</span>
    </div>
  );
}

export default function TeamPage() {
  return (
    <div className="relative flex h-full w-full flex-col bg-black pl-16">
      <ParticleNetworkBackground className="z-0" />
      <div className="absolute inset-0 left-16 z-0 bg-black/40" />
      <div className="absolute inset-0 left-16 z-[5] backdrop-blur-[2px]" />

      <div className="relative z-10 flex h-full w-full flex-1 flex-col overflow-hidden">
        <PageHeader title="Members" icon={IdCard} />

        <div className="flex-1 snap-y snap-mandatory overflow-y-auto">
          {TEAM_MEMBERS.map((member) => (
            <div
              key={member.name}
              className="flex h-full w-full shrink-0 snap-start snap-always items-center justify-center px-4"
            >
              <AdmitOneTicket
                name={member.name}
                presenter="ARES"
                event="TEAM MEMBER"
                venue="THEERRV TECHNOLOGIES"
                dates=""
                stubText={<StubLabel designation={member.designation} />}
                watermark=""
                width={TICKET_WIDTH}
                tilt={{}}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
