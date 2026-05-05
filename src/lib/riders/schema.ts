import { z } from "zod";

const optionalUrl = z
  .union([z.literal(""), z.string().trim().url("must be a valid URL")])
  .optional();

const isoDateTime = z
  .union([
    z.literal(""),
    z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
      message: "must be an ISO date-time",
    }),
  ])
  .optional();

export const riderKindEnum = z.enum(["hospitality", "technical"]);
export type RiderKind = z.infer<typeof riderKindEnum>;

export const riderInputSchema = z.object({
  artistId: z.string().uuid(),
  kind: riderKindEnum,
  fileUrl: optionalUrl,
  receivedAt: isoDateTime,
  confirmed: z.boolean().optional(),
});
export type RiderInput = z.infer<typeof riderInputSchema>;

export const riderPatchSchema = riderInputSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: "Body must contain at least one field" }
);
export type RiderPatch = z.infer<typeof riderPatchSchema>;

export interface RiderDbValues {
  artistId: string;
  kind: RiderKind;
  fileUrl: string | null;
  receivedAt: Date | null;
  confirmed: boolean;
}

function dt(v: string | undefined): Date | null {
  if (v === undefined || v === "") return null;
  return new Date(v);
}

function emptyToNull(v: string | undefined): string | null {
  return v === undefined || v === "" ? null : v;
}

export function riderToDbValues(input: RiderInput): RiderDbValues {
  return {
    artistId: input.artistId,
    kind: input.kind,
    fileUrl: emptyToNull(input.fileUrl),
    receivedAt: dt(input.receivedAt),
    confirmed: input.confirmed ?? false,
  };
}

export function riderToDbPatchValues(
  input: RiderPatch
): Partial<RiderDbValues> {
  const out: Partial<RiderDbValues> = {};
  if ("artistId" in input && input.artistId !== undefined)
    out.artistId = input.artistId;
  if ("kind" in input && input.kind !== undefined) out.kind = input.kind;
  if ("confirmed" in input && input.confirmed !== undefined)
    out.confirmed = input.confirmed;
  if ("fileUrl" in input) out.fileUrl = emptyToNull(input.fileUrl);
  if ("receivedAt" in input) out.receivedAt = dt(input.receivedAt);
  return out;
}
