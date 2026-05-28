"use client";

import { useState } from "react";
import SideSheet from "@/components/ui/SideSheet";
import FlightForm from "@/app/(dashboard)/flights/_components/FlightForm";
import BookingForm from "@/app/(dashboard)/hotels/bookings/_components/BookingForm";
import PickupForm from "@/app/(dashboard)/ground/_components/PickupForm";
import ContractForm from "@/app/(dashboard)/contracts/_components/ContractForm";
import RiderForm from "@/app/(dashboard)/riders/_components/RiderForm";
import InvoiceSheet from "./InvoiceSheet";
import type { ArtistRoadsheet } from "@/lib/aggregators";
import type { Person } from "@/lib/people";
import type { Hotel, RoomBlock } from "@/lib/hotels/repo";
import type { Artist } from "@/lib/artists/repo";

export type LogisticsTab = "travel" | "stay" | "ground" | "docs" | "money";

const TAB_LABELS: Record<LogisticsTab, string> = {
  travel: "Travel",
  stay: "Stay",
  ground: "Ground",
  docs: "Docs",
  money: "Money",
};

interface Props {
  open: boolean;
  initialTab: LogisticsTab;
  sheet: ArtistRoadsheet;
  reference: {
    people: Person[];
    artists: Artist[];
    hotels: Hotel[];
    blocks: RoomBlock[];
  };
  /** Festival-wide defaults piped into Stay and Money panels. */
  festivalDefaultNights: number | null;
  festivalEndDate: string;
  festivalPaymentTermDays: number;
  onClose: () => void;
  onSuccess: () => void;
  /** Helper carried from the cockpit so pickup defaults stay consistent. */
  pickupPrefill: ReturnType<typeof import("./pickup-prefill").pickupPrefill>;
}

export default function LogisticsSheet({
  open,
  initialTab,
  sheet,
  reference,
  festivalDefaultNights,
  festivalEndDate,
  festivalPaymentTermDays,
  onClose,
  onSuccess,
  pickupPrefill,
}: Props) {
  const { artist } = sheet;
  // initialTab seeds the state once; clicking the tab strip thereafter
  // is the only thing that changes `tab`. Parent re-keys this component
  // when it wants to force a new initialTab on open.
  const [tab, setTab] = useState<LogisticsTab>(initialTab);

  return (
    <SideSheet
      open={open}
      onClose={onClose}
      title="Logistics"
      subtitle={artist.name}
    >
      <div className="space-y-5">
        <Tabs tab={tab} onChange={setTab} />

        {tab === "travel" && (
          <TravelPanel
            sheet={sheet}
            reference={reference}
            onSuccess={onSuccess}
          />
        )}

        {tab === "stay" && (
          <StayPanel
            sheet={sheet}
            reference={reference}
            festivalDefaultNights={festivalDefaultNights}
            onSuccess={onSuccess}
          />
        )}

        {tab === "ground" && (
          <GroundPanel
            reference={reference}
            artistId={artist.id}
            pickupPrefill={pickupPrefill}
            onSuccess={onSuccess}
          />
        )}

        {tab === "docs" && (
          <DocsPanel
            sheet={sheet}
            reference={reference}
            onSuccess={onSuccess}
          />
        )}

        {tab === "money" && (
          <MoneyPanel
            artistId={artist.id}
            artistName={artist.name}
            festivalEndDate={festivalEndDate}
            festivalPaymentTermDays={festivalPaymentTermDays}
            onSuccess={onSuccess}
          />
        )}
      </div>
    </SideSheet>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

function Tabs({
  tab,
  onChange,
}: {
  tab: LogisticsTab;
  onChange: (t: LogisticsTab) => void;
}) {
  const TABS: LogisticsTab[] = ["travel", "stay", "ground", "docs", "money"];
  return (
    <div className="flex gap-1 rounded-md border border-[--color-border] bg-[--color-surface]/60 p-1">
      {TABS.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={`flex-1 px-3 py-1.5 rounded-[--radius-sm] text-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${
            tab === t
              ? "bg-[--color-surface-raised] text-[--color-fg]"
              : "text-[--color-fg-subtle] hover:text-[--color-fg]"
          }`}
        >
          {TAB_LABELS[t]}
        </button>
      ))}
    </div>
  );
}

// ── Travel ───────────────────────────────────────────────────────────────────

function TravelPanel({
  sheet,
  reference,
  onSuccess,
}: {
  sheet: ArtistRoadsheet;
  reference: Props["reference"];
  onSuccess: () => void;
}) {
  const [direction, setDirection] = useState<"inbound" | "outbound">(
    sheet.inboundFlight ? "outbound" : "inbound",
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <DirectionToggle
          value="inbound"
          current={direction}
          existing={!!sheet.inboundFlight}
          onClick={() => setDirection("inbound")}
        />
        <DirectionToggle
          value="outbound"
          current={direction}
          existing={!!sheet.outboundFlight}
          onClick={() => setDirection("outbound")}
        />
      </div>

      <FlightForm
        people={reference.people}
        defaultPerson={{ id: sheet.artist.id, kind: "artist" }}
        defaultDirection={direction}
        onSuccess={onSuccess}
      />
    </div>
  );
}

function DirectionToggle({
  value,
  current,
  existing,
  onClick,
}: {
  value: "inbound" | "outbound";
  current: "inbound" | "outbound";
  existing: boolean;
  onClick: () => void;
}) {
  const active = value === current;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-3 py-2 rounded-md border text-left transition-colors ${
        active
          ? "border-brand bg-[--color-surface-raised]"
          : "border-[--color-border] hover:border-[--color-border-strong]"
      }`}
    >
      <div className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle]">
        {value === "inbound" ? "Inbound" : "Outbound"}
      </div>
      <div className="text-[12px] text-[--color-fg] mt-0.5">
        {existing ? "Booked" : "Add"}
      </div>
    </button>
  );
}

// ── Stay ─────────────────────────────────────────────────────────────────────

function StayPanel({
  sheet,
  reference,
  festivalDefaultNights,
  onSuccess,
}: {
  sheet: ArtistRoadsheet;
  reference: Props["reference"];
  festivalDefaultNights: number | null;
  onSuccess: () => void;
}) {
  return (
    <BookingForm
      hotels={reference.hotels}
      blocks={reference.blocks}
      people={reference.people}
      defaultPerson={{ id: sheet.artist.id, kind: "artist" }}
      prefill={{
        checkin: sheet.inboundFlight?.scheduledDt
          ? sheet.inboundFlight.scheduledDt.toISOString().slice(0, 10)
          : undefined,
        checkout: sheet.outboundFlight?.scheduledDt
          ? sheet.outboundFlight.scheduledDt.toISOString().slice(0, 10)
          : undefined,
      }}
      festivalDefaultNights={festivalDefaultNights}
      onSuccess={onSuccess}
    />
  );
}

// ── Ground ───────────────────────────────────────────────────────────────────

function GroundPanel({
  reference,
  artistId,
  pickupPrefill,
  onSuccess,
}: {
  reference: Props["reference"];
  artistId: string;
  pickupPrefill: Props["pickupPrefill"];
  onSuccess: () => void;
}) {
  return (
    <PickupForm
      people={reference.people}
      defaultPerson={{ id: artistId, kind: "artist" }}
      prefill={pickupPrefill}
      onSuccess={onSuccess}
    />
  );
}

// ── Docs ─────────────────────────────────────────────────────────────────────

function DocsPanel({
  sheet,
  reference,
  onSuccess,
}: {
  sheet: ArtistRoadsheet;
  reference: Props["reference"];
  onSuccess: () => void;
}) {
  const techRider = sheet.riders.find((r) => r.kind === "technical");
  const hospRider = sheet.riders.find((r) => r.kind === "hospitality");

  const [section, setSection] = useState<"contract" | "tech" | "hosp">(
    !sheet.contract ? "contract" : !techRider ? "tech" : "hosp",
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-md border border-[--color-border] p-1">
        <SubTab
          active={section === "contract"}
          done={!!sheet.contract}
          onClick={() => setSection("contract")}
        >
          Contract
        </SubTab>
        <SubTab
          active={section === "tech"}
          done={!!techRider}
          onClick={() => setSection("tech")}
        >
          Tech rider
        </SubTab>
        <SubTab
          active={section === "hosp"}
          done={!!hospRider}
          onClick={() => setSection("hosp")}
        >
          Hospitality
        </SubTab>
      </div>

      {section === "contract" && (
        <ContractForm
          artists={reference.artists}
          defaultArtistId={sheet.artist.id}
          onSuccess={onSuccess}
        />
      )}
      {section === "tech" && (
        <RiderForm
          artists={reference.artists}
          defaultArtistId={sheet.artist.id}
          defaultKind="technical"
          onSuccess={onSuccess}
        />
      )}
      {section === "hosp" && (
        <RiderForm
          artists={reference.artists}
          defaultArtistId={sheet.artist.id}
          defaultKind="hospitality"
          onSuccess={onSuccess}
        />
      )}
    </div>
  );
}

function SubTab({
  active,
  done,
  onClick,
  children,
}: {
  active: boolean;
  done: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-3 py-1.5 rounded-[--radius-sm] text-[11px] transition-colors ${
        active
          ? "bg-[--color-surface-raised] text-[--color-fg]"
          : "text-[--color-fg-subtle] hover:text-[--color-fg]"
      }`}
    >
      <span className="inline-flex items-center gap-1.5">
        {done && <span className="w-1.5 h-1.5 rounded-full bg-brand" />}
        {children}
      </span>
    </button>
  );
}

// ── Money ────────────────────────────────────────────────────────────────────

function MoneyPanel({
  artistId,
  artistName,
  festivalEndDate,
  festivalPaymentTermDays,
  onSuccess,
}: {
  artistId: string;
  artistName: string;
  festivalEndDate: string;
  festivalPaymentTermDays: number;
  onSuccess: () => void;
}) {
  return (
    <InvoiceSheet
      artistId={artistId}
      artistName={artistName}
      festivalEndDate={festivalEndDate}
      festivalPaymentTermDays={festivalPaymentTermDays}
      onSuccess={onSuccess}
    />
  );
}
