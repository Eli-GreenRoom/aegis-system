"use client";

import { createContext, useContext } from "react";
import type { Festival } from "@/lib/festivals";

interface FestivalContextValue {
  startDate: string | null;
  festival: Festival | null;
  festivals: Festival[];
}

const FestivalContext = createContext<FestivalContextValue>({
  startDate: null,
  festival: null,
  festivals: [],
});

export function FestivalProvider({
  festival,
  festivals,
  children,
}: {
  festival: Festival | null;
  festivals: Festival[];
  children: React.ReactNode;
}) {
  return (
    <FestivalContext.Provider
      value={{ startDate: festival?.startDate ?? null, festival, festivals }}
    >
      {children}
    </FestivalContext.Provider>
  );
}

export function useFestival() {
  return useContext(FestivalContext);
}
