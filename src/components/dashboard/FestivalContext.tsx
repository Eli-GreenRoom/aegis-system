"use client";

import { createContext, useContext } from "react";

const FestivalContext = createContext<{ startDate: string | null }>({
  startDate: null,
});

export function FestivalProvider({
  startDate,
  children,
}: {
  startDate: string | null;
  children: React.ReactNode;
}) {
  return (
    <FestivalContext.Provider value={{ startDate }}>
      {children}
    </FestivalContext.Provider>
  );
}

export function useFestival() {
  return useContext(FestivalContext);
}
