import { z } from "zod";

const optionalString = z.string().trim().max(500).optional().or(z.literal(""));
const optionalText = z.string().trim().max(4000).optional().or(z.literal(""));
const optionalEmail = z
  .union([z.literal(""), z.string().trim().email()])
  .optional();
const optionalUuid = z.union([z.literal(""), z.string().uuid()]).optional();

export const guestCategoryEnum = z.enum([
  "dj_guest",
  "competition_winner",
  "free_list",
  "international",
  "general_admission",
]);
export type GuestCategory = z.infer<typeof guestCategoryEnum>;

export const dayEnum = z.enum(["friday", "saturday", "sunday"]);
const optionalDay = z.union([z.literal(""), dayEnum]).optional();

export const guestlistInputSchema = z.object({
  category: guestCategoryEnum,
  hostArtistId: optionalUuid,
  name: z.string().trim().min(1).max(200),
  email: optionalEmail,
  phone: optionalString,
  day: optionalDay,
  inviteSent: z.boolean().optional(),
  checkedIn: z.boolean().optional(),
  comments: optionalText,
});
export type GuestlistInput = z.infer<typeof guestlistInputSchema>;

export const guestlistPatchSchema = guestlistInputSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: "Body must contain at least one field" }
);
export type GuestlistPatch = z.infer<typeof guestlistPatchSchema>;

export interface GuestlistDbValues {
  category: GuestCategory;
  hostArtistId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  day: string | null;
  inviteSent: boolean;
  checkedIn: boolean;
  comments: string | null;
}

function emptyToNull(v: string | undefined): string | null {
  return v === undefined || v === "" ? null : v;
}

export function guestlistToDbValues(
  input: GuestlistInput
): GuestlistDbValues {
  return {
    category: input.category,
    hostArtistId: emptyToNull(input.hostArtistId),
    name: input.name,
    email: emptyToNull(input.email),
    phone: emptyToNull(input.phone),
    day: emptyToNull(input.day),
    inviteSent: input.inviteSent ?? false,
    checkedIn: input.checkedIn ?? false,
    comments: emptyToNull(input.comments),
  };
}

export function guestlistToDbPatchValues(
  input: GuestlistPatch
): Partial<GuestlistDbValues> {
  const out: Partial<GuestlistDbValues> = {};
  if ("category" in input && input.category !== undefined)
    out.category = input.category;
  if ("name" in input && input.name !== undefined) out.name = input.name;
  if ("inviteSent" in input && input.inviteSent !== undefined)
    out.inviteSent = input.inviteSent;
  if ("checkedIn" in input && input.checkedIn !== undefined)
    out.checkedIn = input.checkedIn;
  if ("hostArtistId" in input)
    out.hostArtistId = emptyToNull(input.hostArtistId);
  if ("email" in input) out.email = emptyToNull(input.email);
  if ("phone" in input) out.phone = emptyToNull(input.phone);
  if ("day" in input) out.day = emptyToNull(input.day);
  if ("comments" in input) out.comments = emptyToNull(input.comments);
  return out;
}
