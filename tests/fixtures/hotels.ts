import type { Booking, Hotel, RoomBlock } from "@/lib/hotels/repo";

export const FIXTURE_EDITION_ID = "11111111-1111-4111-8111-111111111111";
export const FIXTURE_ARTIST_ID = "22222222-2222-4222-8222-222222222222";
export const FIXTURE_HOTEL_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const FIXTURE_ROOM_BLOCK_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const FIXTURE_BOOKING_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

export const fixtureHotel: Hotel = {
  id: FIXTURE_HOTEL_ID,
  workspaceId: null,
  name: "Byblos Sur Mer",
  location: "Byblos",
  address: "Old Souks, Byblos",
  contactName: null,
  contactEmail: null,
  contactPhone: null,
  notes: null,
};

export const fixtureRoomBlock: RoomBlock = {
  id: FIXTURE_ROOM_BLOCK_ID,
  editionId: FIXTURE_EDITION_ID,
  hotelId: FIXTURE_HOTEL_ID,
  label: "Artists - Deluxe",
  roomType: "Deluxe sea view",
  nights: 3,
  roomsReserved: 10,
  pricePerNightAmountCents: 25000,
  pricePerNightCurrency: "USD",
  breakfastNote: "incl. for 2",
};

export const fixtureBooking: Booking = {
  id: FIXTURE_BOOKING_ID,
  workspaceId: null,
  roomBlockId: FIXTURE_ROOM_BLOCK_ID,
  personKind: "artist",
  personId: FIXTURE_ARTIST_ID,
  hotelId: FIXTURE_HOTEL_ID,
  roomType: "Deluxe sea view",
  checkin: "2026-08-13",
  checkout: "2026-08-16",
  bookingNumber: "BSM-001",
  creditsAmountCents: null,
  creditsCurrency: null,
  status: "booked",
  checkedInAt: null,
  checkedOutAt: null,
  confirmationUrl: null,
  comments: null,
  createdAt: new Date("2026-05-04T00:00:00Z"),
};
