import type { Pickup, Vendor } from "@/lib/ground/repo";

export const FIXTURE_EDITION_ID = "11111111-1111-4111-8111-111111111111";
export const FIXTURE_ARTIST_ID = "22222222-2222-4222-8222-222222222222";
export const FIXTURE_VENDOR_ID = "88888888-8888-4888-8888-888888888888";
export const FIXTURE_PICKUP_ID = "99999999-9999-4999-8999-999999999999";

export const fixtureVendor: Vendor = {
  id: FIXTURE_VENDOR_ID,
  name: "Byblos Taxi",
  service: "Taxi",
  contactName: null,
  contactEmail: null,
  contactPhone: null,
  notes: null,
  createdAt: new Date("2026-05-04T00:00:00Z"),
};

export const fixturePickup: Pickup = {
  id: FIXTURE_PICKUP_ID,
  editionId: FIXTURE_EDITION_ID,
  personKind: "artist",
  personId: FIXTURE_ARTIST_ID,
  routeFrom: "airport",
  routeFromDetail: "Beirut, Terminal A",
  routeTo: "hotel",
  routeToDetail: "Byblos Sur Mer",
  linkedFlightId: null,
  pickupDt: new Date("2026-08-13T15:00:00Z"),
  vehicleType: "Sedan",
  vendorId: FIXTURE_VENDOR_ID,
  driverName: "Sami",
  driverPhone: "+961 1 234567",
  costAmountCents: 8000,
  costCurrency: "USD",
  status: "scheduled",
  comments: null,
  createdAt: new Date("2026-05-04T00:00:00Z"),
};
