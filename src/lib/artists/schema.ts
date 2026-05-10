import { z } from "zod";

const slugRegex = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

const optionalString = z.string().trim().max(500).optional().or(z.literal(""));

const optionalEmail = z
  .union([z.literal(""), z.string().trim().email()])
  .optional();

const optionalHexColor = z
  .union([
    z.literal(""),
    z
      .string()
      .trim()
      .regex(/^#[0-9A-Fa-f]{6}$/, "must be a #RRGGBB hex color"),
  ])
  .optional();

const optionalUrl = z
  .union([z.literal(""), z.string().trim().url("must be a valid URL")])
  .optional();

export const visaStatusEnum = z.enum([
  "not_needed",
  "pending",
  "approved",
  "rejected",
]);
export type VisaStatus = z.infer<typeof visaStatusEnum>;

const optionalVisaStatus = z.union([z.literal(""), visaStatusEnum]).optional();

/**
 * Form-side schema. Strings can be empty; nothing transforms to null.
 * The route handler converts empty strings to null before writing to DB.
 */
export const artistInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(
      slugRegex,
      "lowercase letters, numbers, hyphens; no leading/trailing hyphen",
    ),
  legalName: optionalString,
  nationality: optionalString,
  email: optionalEmail,
  phone: optionalString,
  agency: optionalString,
  agentEmail: optionalEmail,
  instagram: optionalString,
  soundcloud: optionalString,
  color: optionalHexColor,
  local: z.boolean().optional(),
  visaStatus: optionalVisaStatus,
  pressKitUrl: optionalUrl,
  passportFileUrl: optionalUrl,
  comments: z.string().trim().max(4000).optional().or(z.literal("")),
});

export type ArtistInput = z.infer<typeof artistInputSchema>;

/**
 * Partial schema for PATCH. Every field is optional, but if `name` or `slug`
 * are present they still have to satisfy their format constraints. Body must
 * carry at least one field.
 */
export const artistPatchSchema = artistInputSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "Body must contain at least one field",
  });

export type ArtistPatch = z.infer<typeof artistPatchSchema>;

/** DB-side payload - empty strings normalised to null. */
export interface ArtistDbValues {
  name: string;
  slug: string;
  legalName: string | null;
  nationality: string | null;
  email: string | null;
  phone: string | null;
  agency: string | null;
  agentEmail: string | null;
  instagram: string | null;
  soundcloud: string | null;
  color: string | null;
  local: boolean;
  visaStatus: VisaStatus | null;
  pressKitUrl: string | null;
  passportFileUrl: string | null;
  comments: string | null;
}

const NULLABLE_FIELDS = [
  "legalName",
  "nationality",
  "email",
  "phone",
  "agency",
  "agentEmail",
  "instagram",
  "soundcloud",
  "color",
  "pressKitUrl",
  "passportFileUrl",
  "comments",
] as const;

/**
 * Convert a partial PATCH input into a partial DB update. Only keys the
 * caller actually sent appear in the result, so omitted fields stay
 * untouched in the database. Empty strings still normalise to null.
 */
export function toDbPatchValues(input: ArtistPatch): Partial<ArtistDbValues> {
  const out: Partial<ArtistDbValues> = {};
  if ("name" in input && input.name !== undefined) out.name = input.name;
  if ("slug" in input && input.slug !== undefined) out.slug = input.slug;
  if ("local" in input && input.local !== undefined) out.local = input.local;
  if ("visaStatus" in input) {
    const v = input.visaStatus;
    out.visaStatus = v === undefined || v === "" ? null : v;
  }
  for (const k of NULLABLE_FIELDS) {
    if (k in input) {
      const v = input[k];
      out[k] = v === undefined || v === "" ? null : v;
    }
  }
  return out;
}

/** Convert form input to DB row shape - empty strings become null. */
export function toDbValues(input: ArtistInput): ArtistDbValues {
  const out: ArtistDbValues = {
    name: input.name,
    slug: input.slug,
    local: input.local ?? false,
    legalName: null,
    nationality: null,
    email: null,
    phone: null,
    agency: null,
    agentEmail: null,
    instagram: null,
    soundcloud: null,
    color: null,
    visaStatus:
      input.visaStatus === undefined || input.visaStatus === ""
        ? null
        : input.visaStatus,
    pressKitUrl: null,
    passportFileUrl: null,
    comments: null,
  };
  for (const k of NULLABLE_FIELDS) {
    const v = input[k];
    out[k] = v === undefined || v === "" ? null : v;
  }
  return out;
}

// Combining-marks regex built via RegExp(string) so this file stays
// pure ASCII (esbuild has historically choked on raw non-ASCII bytes).
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}
