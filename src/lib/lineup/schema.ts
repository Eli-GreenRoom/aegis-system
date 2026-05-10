import { z } from "zod";

const slugRegex = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const hhmmRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const hexRegex = /^#[0-9A-Fa-f]{6}$/;

const optionalString = z.string().trim().max(500).optional().or(z.literal(""));

const optionalHexColor = z
  .union([
    z.literal(""),
    z.string().trim().regex(hexRegex, "must be a #RRGGBB hex color"),
  ])
  .optional();

// -- Stage ----------------------------------------------------------------

export const stageInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(
      slugRegex,
      "lowercase letters, numbers, hyphens; no leading/trailing hyphen",
    ),
  color: optionalHexColor,
  sortOrder: z.number().int().min(0).max(999).optional(),
});

export type StageInput = z.infer<typeof stageInputSchema>;

export const stagePatchSchema = stageInputSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "Body must contain at least one field",
  });
export type StagePatch = z.infer<typeof stagePatchSchema>;

export interface StageDbValues {
  name: string;
  slug: string;
  color: string | null;
  sortOrder: number;
}

export function stageToDbValues(input: StageInput): StageDbValues {
  return {
    name: input.name,
    slug: input.slug,
    color: input.color === undefined || input.color === "" ? null : input.color,
    sortOrder: input.sortOrder ?? 0,
  };
}

export function stageToDbPatchValues(
  input: StagePatch,
): Partial<StageDbValues> {
  const out: Partial<StageDbValues> = {};
  if ("name" in input && input.name !== undefined) out.name = input.name;
  if ("slug" in input && input.slug !== undefined) out.slug = input.slug;
  if ("color" in input) {
    out.color =
      input.color === undefined || input.color === "" ? null : input.color;
  }
  if ("sortOrder" in input && input.sortOrder !== undefined) {
    out.sortOrder = input.sortOrder;
  }
  return out;
}

// -- Slot -----------------------------------------------------------------

export const dayEnum = z.enum(["friday", "saturday", "sunday"]);
export type Day = z.infer<typeof dayEnum>;

export const slotInputSchema = z
  .object({
    stageId: z.string().uuid(),
    day: dayEnum,
    startTime: z.string().regex(hhmmRegex, "HH:MM (24h)"),
    endTime: z.string().regex(hhmmRegex, "HH:MM (24h)"),
    sortOrder: z.number().int().min(0).max(999).optional(),
  })
  .refine((v) => v.startTime !== v.endTime, {
    message: "Start and end can't be the same",
    path: ["endTime"],
  });

export type SlotInput = z.infer<typeof slotInputSchema>;

// Patch: omit refine, then partial; refine again separately so empty-body
// still fails. (Zod doesn't allow .partial() on a refined object directly.)
const slotInputBase = z.object({
  stageId: z.string().uuid(),
  day: dayEnum,
  startTime: z.string().regex(hhmmRegex, "HH:MM (24h)"),
  endTime: z.string().regex(hhmmRegex, "HH:MM (24h)"),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

export const slotPatchSchema = slotInputBase
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "Body must contain at least one field",
  })
  .refine(
    (v) =>
      !(
        v.startTime !== undefined &&
        v.endTime !== undefined &&
        v.startTime === v.endTime
      ),
    { message: "Start and end can't be the same", path: ["endTime"] },
  );
export type SlotPatch = z.infer<typeof slotPatchSchema>;

export interface SlotDbValues {
  stageId: string;
  day: Day;
  startTime: string;
  endTime: string;
  sortOrder: number;
}

export function slotToDbValues(input: SlotInput): SlotDbValues {
  return {
    stageId: input.stageId,
    day: input.day,
    startTime: input.startTime,
    endTime: input.endTime,
    sortOrder: input.sortOrder ?? 0,
  };
}

export function slotToDbPatchValues(input: SlotPatch): Partial<SlotDbValues> {
  const out: Partial<SlotDbValues> = {};
  if ("stageId" in input && input.stageId !== undefined)
    out.stageId = input.stageId;
  if ("day" in input && input.day !== undefined) out.day = input.day;
  if ("startTime" in input && input.startTime !== undefined)
    out.startTime = input.startTime;
  if ("endTime" in input && input.endTime !== undefined)
    out.endTime = input.endTime;
  if ("sortOrder" in input && input.sortOrder !== undefined)
    out.sortOrder = input.sortOrder;
  return out;
}

// -- Set ------------------------------------------------------------------

export const setStatusEnum = z.enum([
  "confirmed",
  "option",
  "not_available",
  "live",
  "done",
  "withdrawn",
]);
export type SetStatus = z.infer<typeof setStatusEnum>;

export const currencyEnum = z.enum(["USD", "EUR"]);

export const setInputSchema = z.object({
  slotId: z.string().uuid(),
  artistId: z.string().uuid(),
  status: setStatusEnum.optional(),
  announceBatch: optionalString,
  feeAmountCents: z.number().int().min(0).max(100_000_00).nullable().optional(),
  feeCurrency: currencyEnum.optional().or(z.literal("")),
  agency: optionalString,
  comments: z.string().trim().max(4000).optional().or(z.literal("")),
});
export type SetInput = z.infer<typeof setInputSchema>;

export const setPatchSchema = setInputSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "Body must contain at least one field",
  });
export type SetPatch = z.infer<typeof setPatchSchema>;

export interface SetDbValues {
  slotId: string;
  artistId: string;
  status: SetStatus;
  announceBatch: string | null;
  feeAmountCents: number | null;
  feeCurrency: string | null;
  agency: string | null;
  comments: string | null;
}

const NULLABLE_SET_STRINGS = ["announceBatch", "agency", "comments"] as const;

export function setToDbValues(input: SetInput): SetDbValues {
  const out: SetDbValues = {
    slotId: input.slotId,
    artistId: input.artistId,
    status: input.status ?? "option",
    announceBatch: null,
    feeAmountCents:
      input.feeAmountCents === undefined ? null : input.feeAmountCents,
    feeCurrency:
      input.feeCurrency === undefined || input.feeCurrency === ""
        ? null
        : input.feeCurrency,
    agency: null,
    comments: null,
  };
  for (const k of NULLABLE_SET_STRINGS) {
    const v = input[k];
    out[k] = v === undefined || v === "" ? null : v;
  }
  return out;
}

export function setToDbPatchValues(input: SetPatch): Partial<SetDbValues> {
  const out: Partial<SetDbValues> = {};
  if ("slotId" in input && input.slotId !== undefined)
    out.slotId = input.slotId;
  if ("artistId" in input && input.artistId !== undefined)
    out.artistId = input.artistId;
  if ("status" in input && input.status !== undefined)
    out.status = input.status;
  if ("feeAmountCents" in input) {
    out.feeAmountCents =
      input.feeAmountCents === undefined ? null : input.feeAmountCents;
  }
  if ("feeCurrency" in input) {
    out.feeCurrency =
      input.feeCurrency === undefined || input.feeCurrency === ""
        ? null
        : input.feeCurrency;
  }
  for (const k of NULLABLE_SET_STRINGS) {
    if (k in input) {
      const v = input[k];
      out[k] = v === undefined || v === "" ? null : v;
    }
  }
  return out;
}
