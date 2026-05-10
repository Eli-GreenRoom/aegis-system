/**
 * GreenRoom Stages - Drizzle schema (initial)
 *
 * Phase 1 deliverable: enough tables to run the dashboard shell + seed an
 * owner. Phase 2+ adds the rest from docs/DATA-MODEL.md.
 *
 * Source-of-truth spec: docs/DATA-MODEL.md
 */

import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  integer,
  uuid,
  varchar,
  date,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";

// -- Enums -----------------------------------------------------------------

export const teamRoleEnum = pgEnum("team_role", [
  "owner",
  "coordinator",
  "viewer",
]);

export const teamMemberStatusEnum = pgEnum("team_member_status", [
  "pending",
  "active",
  "suspended",
]);

export const stageDayEnum = pgEnum("stage_day", [
  "friday",
  "saturday",
  "sunday",
]);

export const setStatusEnum = pgEnum("set_status", [
  "confirmed",
  "option",
  "not_available",
  "live",
  "done",
  "withdrawn",
]);

export const visaStatusEnum = pgEnum("visa_status", [
  "not_needed",
  "pending",
  "approved",
  "rejected",
]);

export const personKindEnum = pgEnum("person_kind", ["artist", "crew"]);

export const flightDirectionEnum = pgEnum("flight_direction", [
  "inbound",
  "outbound",
]);

export const flightStatusEnum = pgEnum("flight_status", [
  "scheduled",
  "boarded",
  "in_air",
  "landed",
  "delayed",
  "cancelled",
]);

export const pickupRouteEnum = pgEnum("pickup_route", [
  "airport",
  "hotel",
  "stage",
  "other",
]);

export const pickupStatusEnum = pgEnum("pickup_status", [
  "scheduled",
  "dispatched",
  "in_transit",
  "completed",
  "cancelled",
]);

export const hotelBookingStatusEnum = pgEnum("hotel_booking_status", [
  "tentative",
  "booked",
  "checked_in",
  "checked_out",
  "no_show",
  "cancelled",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "due",
  "paid",
  "overdue",
  "void",
]);

export const contractStatusEnum = pgEnum("contract_status", [
  "draft",
  "sent",
  "signed",
  "void",
]);

export const riderKindEnum = pgEnum("rider_kind", ["hospitality", "technical"]);

export const guestCategoryEnum = pgEnum("guest_category", [
  "dj_guest",
  "competition_winner",
  "free_list",
  "international",
  "general_admission",
]);

// -- Identity --------------------------------------------------------------

/**
 * NOTE: better-auth manages its own `user`, `account`, `session`,
 * `verification` tables - they will be created when better-auth runs.
 * We don't redeclare them here.
 */

export const teamMembers = pgTable("team_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: text("owner_id").notNull(),
  userId: text("user_id"),
  email: text("email").notNull(),
  name: text("name"),
  role: teamRoleEnum("role").notNull(),
  status: teamMemberStatusEnum("status").notNull().default("pending"),
  permissions: jsonb("permissions").notNull().default({}),
  inviteToken: text("invite_token").unique(),
  invitedAt: timestamp("invited_at").notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// -- Festival editions / lineup --------------------------------------------

export const festivalEditions = pgTable("festival_editions", {
  id: uuid("id").primaryKey().defaultRandom(),
  year: integer("year").notNull().unique(),
  name: text("name").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  location: text("location"),
  festivalModeActive: boolean("festival_mode_active").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const stages = pgTable("stages", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  color: text("color"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const slots = pgTable("slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  editionId: uuid("edition_id")
    .notNull()
    .references(() => festivalEditions.id, { onDelete: "cascade" }),
  stageId: uuid("stage_id")
    .notNull()
    .references(() => stages.id, { onDelete: "cascade" }),
  day: stageDayEnum("day").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

// -- People ----------------------------------------------------------------

export const artists = pgTable("artists", {
  id: uuid("id").primaryKey().defaultRandom(),
  editionId: uuid("edition_id")
    .notNull()
    .references(() => festivalEditions.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  legalName: text("legal_name"),
  nationality: text("nationality"),
  email: text("email"),
  phone: text("phone"),
  agency: text("agency"),
  agentEmail: text("agent_email"),
  instagram: text("instagram"),
  soundcloud: text("soundcloud"),
  color: text("color"),
  local: boolean("local").notNull().default(false),
  comments: text("comments"),
  visaStatus: visaStatusEnum("visa_status"),
  // Optional. External URL (Dropbox / Drive / artist site) OR a Vercel Blob
  // proxy URL after upload. Treated as an opaque URL by the app.
  pressKitUrl: text("press_kit_url"),
  // Optional. Private Vercel Blob proxy URL - uploads go through the
  // documents API with `entityType='artist'` + `tags=['passport']` so the
  // file has an audit trail; this column denormalises the latest URL for
  // quick display on the artist record.
  passportFileUrl: text("passport_file_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  archivedAt: timestamp("archived_at"),
});

/**
 * Crew = travelling production (tour managers, media crew - photographers,
 * videographers, social, FOH engineers). NOT stage hands / volunteers.
 * They get hotels + flights + ground like artists do, hence the same
 * `editionId` scoping and `archivedAt` soft-delete pattern.
 */
export const crew = pgTable("crew", {
  id: uuid("id").primaryKey().defaultRandom(),
  editionId: uuid("edition_id")
    .notNull()
    .references(() => festivalEditions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role").notNull(),
  email: text("email"),
  phone: text("phone"),
  nationality: text("nationality"),
  days: jsonb("days"),
  comments: text("comments"),
  visaStatus: visaStatusEnum("visa_status"),
  pressKitUrl: text("press_kit_url"),
  // Mirrors artists.passportFileUrl - private Vercel Blob proxy URL via the
  // documents API (entityType='crew', tags=['passport']).
  passportFileUrl: text("passport_file_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  archivedAt: timestamp("archived_at"),
});

export const sets = pgTable("sets", {
  id: uuid("id").primaryKey().defaultRandom(),
  slotId: uuid("slot_id")
    .notNull()
    .references(() => slots.id, { onDelete: "cascade" }),
  artistId: uuid("artist_id")
    .notNull()
    .references(() => artists.id, { onDelete: "cascade" }),
  status: setStatusEnum("status").notNull().default("option"),
  announceBatch: text("announce_batch"),
  feeAmountCents: integer("fee_amount_cents"),
  feeCurrency: varchar("fee_currency", { length: 3 }),
  agency: text("agency"),
  comments: text("comments"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// -- Travel ----------------------------------------------------------------

export const flights = pgTable("flights", {
  id: uuid("id").primaryKey().defaultRandom(),
  editionId: uuid("edition_id")
    .notNull()
    .references(() => festivalEditions.id),
  personKind: personKindEnum("person_kind").notNull(),
  personId: uuid("person_id").notNull(),
  direction: flightDirectionEnum("direction").notNull(),
  fromAirport: text("from_airport"),
  toAirport: text("to_airport"),
  airline: text("airline"),
  flightNumber: text("flight_number"),
  scheduledDt: timestamp("scheduled_dt", { withTimezone: true }),
  actualDt: timestamp("actual_dt", { withTimezone: true }),
  status: flightStatusEnum("status").notNull().default("scheduled"),
  delayMinutes: integer("delay_minutes"),
  pnr: text("pnr"),
  ticketUrl: text("ticket_url"),
  confirmationEmailUrl: text("confirmation_email_url"),
  seat: text("seat"),
  comments: text("comments"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const vendors = pgTable("vendors", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  service: text("service").notNull(),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const groundTransportPickups = pgTable("ground_transport_pickups", {
  id: uuid("id").primaryKey().defaultRandom(),
  editionId: uuid("edition_id")
    .notNull()
    .references(() => festivalEditions.id),
  personKind: personKindEnum("person_kind").notNull(),
  personId: uuid("person_id").notNull(),
  routeFrom: pickupRouteEnum("route_from").notNull(),
  routeFromDetail: text("route_from_detail"),
  routeTo: pickupRouteEnum("route_to").notNull(),
  routeToDetail: text("route_to_detail"),
  linkedFlightId: uuid("linked_flight_id").references(() => flights.id),
  pickupDt: timestamp("pickup_dt", { withTimezone: true }).notNull(),
  vehicleType: text("vehicle_type"),
  vendorId: uuid("vendor_id").references(() => vendors.id),
  driverName: text("driver_name"),
  driverPhone: text("driver_phone"),
  costAmountCents: integer("cost_amount_cents"),
  costCurrency: varchar("cost_currency", { length: 3 }),
  status: pickupStatusEnum("status").notNull().default("scheduled"),
  // Click time on each forward transition (festival-day one-tap UX). Null
  // until the pickup advances past `scheduled`. Server captures now() - never
  // trust user-typed values from a phone in a field.
  dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
  inTransitAt: timestamp("in_transit_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  comments: text("comments"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// -- Hotels ----------------------------------------------------------------

export const hotels = pgTable("hotels", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  location: text("location"),
  address: text("address"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  notes: text("notes"),
});

export const hotelRoomBlocks = pgTable("hotel_room_blocks", {
  id: uuid("id").primaryKey().defaultRandom(),
  editionId: uuid("edition_id")
    .notNull()
    .references(() => festivalEditions.id),
  hotelId: uuid("hotel_id")
    .notNull()
    .references(() => hotels.id),
  // Operator-friendly name like "Artists - Deluxe" or "Crew - Standard" so
  // separate blocks for crew are distinguishable in the UI.
  label: text("label"),
  roomType: text("room_type").notNull(),
  nights: integer("nights"),
  roomsReserved: integer("rooms_reserved"),
  pricePerNightAmountCents: integer("price_per_night_amount_cents"),
  pricePerNightCurrency: varchar("price_per_night_currency", { length: 3 }),
  breakfastNote: text("breakfast_note"),
});

export const hotelBookings = pgTable("hotel_bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomBlockId: uuid("room_block_id").references(() => hotelRoomBlocks.id),
  personKind: personKindEnum("person_kind").notNull(),
  personId: uuid("person_id").notNull(),
  hotelId: uuid("hotel_id")
    .notNull()
    .references(() => hotels.id),
  roomType: text("room_type"),
  checkin: date("checkin").notNull(),
  checkout: date("checkout").notNull(),
  bookingNumber: text("booking_number"),
  creditsAmountCents: integer("credits_amount_cents"),
  creditsCurrency: varchar("credits_currency", { length: 3 }),
  status: hotelBookingStatusEnum("status").notNull().default("booked"),
  // Click time on the festival-day transitions. Null until the guest checks
  // in / out; same trust-the-server-clock pattern as pickup timestamps.
  checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
  checkedOutAt: timestamp("checked_out_at", { withTimezone: true }),
  confirmationUrl: text("confirmation_url"),
  comments: text("comments"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// -- Money -----------------------------------------------------------------

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  editionId: uuid("edition_id")
    .notNull()
    .references(() => festivalEditions.id),
  number: text("number"),
  issuerKind: text("issuer_kind").notNull(),
  issuerId: uuid("issuer_id"),
  issueDate: date("issue_date"),
  dueDate: date("due_date"),
  amountCents: integer("amount_cents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  fileUrl: text("file_url"),
  status: text("status").notNull().default("received"),
  comments: text("comments"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  editionId: uuid("edition_id")
    .notNull()
    .references(() => festivalEditions.id),
  artistId: uuid("artist_id").references(() => artists.id),
  vendorId: uuid("vendor_id").references(() => vendors.id),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  description: text("description").notNull(),
  dueDate: date("due_date"),
  amountCents: integer("amount_cents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  popUrl: text("pop_url"),
  status: paymentStatusEnum("status").notNull().default("pending"),
  paidAt: timestamp("paid_at"),
  paidVia: text("paid_via"),
  comments: text("comments"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// -- Documents -------------------------------------------------------------

export const contracts = pgTable("contracts", {
  id: uuid("id").primaryKey().defaultRandom(),
  artistId: uuid("artist_id")
    .notNull()
    .references(() => artists.id, { onDelete: "cascade" }),
  editionId: uuid("edition_id")
    .notNull()
    .references(() => festivalEditions.id),
  status: contractStatusEnum("status").notNull().default("draft"),
  sentAt: timestamp("sent_at"),
  signedAt: timestamp("signed_at"),
  fileUrl: text("file_url"),
  signedFileUrl: text("signed_file_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const riders = pgTable("riders", {
  id: uuid("id").primaryKey().defaultRandom(),
  artistId: uuid("artist_id")
    .notNull()
    .references(() => artists.id, { onDelete: "cascade" }),
  kind: riderKindEnum("kind").notNull(),
  fileUrl: text("file_url"),
  parsedItems: jsonb("parsed_items"),
  receivedAt: timestamp("received_at"),
  confirmed: boolean("confirmed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: text("owner_id").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  filename: text("filename").notNull(),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  url: text("url").notNull(),
  uploadedBy: text("uploaded_by"),
  tags: jsonb("tags"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// -- Guests ----------------------------------------------------------------

export const guestlistEntries = pgTable("guestlist_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  editionId: uuid("edition_id")
    .notNull()
    .references(() => festivalEditions.id),
  category: guestCategoryEnum("category").notNull(),
  hostArtistId: uuid("host_artist_id").references(() => artists.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  day: text("day"),
  inviteSent: boolean("invite_sent").notNull().default(false),
  checkedIn: boolean("checked_in").notNull().default(false),
  comments: text("comments"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// -- Audit -----------------------------------------------------------------

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: text("actor_id").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  diff: jsonb("diff"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
