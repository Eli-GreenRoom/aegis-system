import { z } from "zod";

const optionalString = z
  .string()
  .trim()
  .max(500)
  .optional()
  .or(z.literal(""));

const optionalEmail = z
  .union([z.literal(""), z.string().trim().email()])
  .optional();

const stringArray = z
  .array(z.string().trim().min(1).max(80))
  .max(20)
  .optional();

/**
 * Form-side schema. Strings can be empty; nothing transforms to null.
 * The route handler converts empty strings to null before writing to DB.
 *
 * Crew = travelling production (tour managers, photographers, videographers,
 * social, FOH engineers). NOT festival-supplied stage hands or volunteers.
 */
export const crewInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  role: z.string().trim().min(1).max(120),
  email: optionalEmail,
  phone: optionalString,
  days: stringArray,
  comments: z.string().trim().max(4000).optional().or(z.literal("")),
});

export type CrewInput = z.infer<typeof crewInputSchema>;

/**
 * Partial schema for PATCH. Every field is optional; if name/role are
 * present they still have to satisfy their format constraints. Body must
 * carry at least one field.
 */
export const crewPatchSchema = crewInputSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: "Body must contain at least one field" }
);

export type CrewPatch = z.infer<typeof crewPatchSchema>;

/** DB-side payload — empty strings normalised to null. */
export interface CrewDbValues {
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  days: string[] | null;
  comments: string | null;
}

const NULLABLE_STRING_FIELDS = ["email", "phone", "comments"] as const;

function normaliseStringArray(v: string[] | undefined): string[] | null {
  if (v === undefined) return null;
  const trimmed = v.map((s) => s.trim()).filter((s) => s.length > 0);
  return trimmed.length === 0 ? null : trimmed;
}

/** Convert form input to DB row shape. */
export function toDbValues(input: CrewInput): CrewDbValues {
  const out: CrewDbValues = {
    name: input.name,
    role: input.role,
    email: null,
    phone: null,
    days: normaliseStringArray(input.days),
    comments: null,
  };
  for (const k of NULLABLE_STRING_FIELDS) {
    const v = input[k];
    out[k] = v === undefined || v === "" ? null : v;
  }
  return out;
}

/**
 * Convert a partial PATCH input into a partial DB update. Only keys the
 * caller actually sent appear in the result; omitted fields stay
 * untouched. Empty strings still normalise to null on PATCH.
 */
export function toDbPatchValues(input: CrewPatch): Partial<CrewDbValues> {
  const out: Partial<CrewDbValues> = {};
  if ("name" in input && input.name !== undefined) out.name = input.name;
  if ("role" in input && input.role !== undefined) out.role = input.role;
  if ("days" in input) out.days = normaliseStringArray(input.days);
  for (const k of NULLABLE_STRING_FIELDS) {
    if (k in input) {
      const v = input[k];
      out[k] = v === undefined || v === "" ? null : v;
    }
  }
  return out;
}
