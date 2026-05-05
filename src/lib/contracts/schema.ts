import { z } from "zod";

const optionalUrl = z
  .union([z.literal(""), z.string().trim().url("must be a valid URL")])
  .optional();

const optionalText = z.string().trim().max(4000).optional().or(z.literal(""));

const isoDateTime = z
  .union([
    z.literal(""),
    z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
      message: "must be an ISO date-time",
    }),
  ])
  .optional();

export const contractStatusEnum = z.enum(["draft", "sent", "signed", "void"]);
export type ContractStatus = z.infer<typeof contractStatusEnum>;

export const contractInputSchema = z.object({
  artistId: z.string().uuid(),
  status: contractStatusEnum.optional(),
  sentAt: isoDateTime,
  signedAt: isoDateTime,
  fileUrl: optionalUrl,
  signedFileUrl: optionalUrl,
  notes: optionalText,
});
export type ContractInput = z.infer<typeof contractInputSchema>;

export const contractPatchSchema = contractInputSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: "Body must contain at least one field" }
);
export type ContractPatch = z.infer<typeof contractPatchSchema>;

export interface ContractDbValues {
  artistId: string;
  status: ContractStatus;
  sentAt: Date | null;
  signedAt: Date | null;
  fileUrl: string | null;
  signedFileUrl: string | null;
  notes: string | null;
}

function dt(v: string | undefined): Date | null {
  if (v === undefined || v === "") return null;
  return new Date(v);
}

function emptyToNull(v: string | undefined): string | null {
  return v === undefined || v === "" ? null : v;
}

export function contractToDbValues(input: ContractInput): ContractDbValues {
  return {
    artistId: input.artistId,
    status: input.status ?? "draft",
    sentAt: dt(input.sentAt),
    signedAt: dt(input.signedAt),
    fileUrl: emptyToNull(input.fileUrl),
    signedFileUrl: emptyToNull(input.signedFileUrl),
    notes: emptyToNull(input.notes),
  };
}

export function contractToDbPatchValues(
  input: ContractPatch
): Partial<ContractDbValues> {
  const out: Partial<ContractDbValues> = {};
  if ("artistId" in input && input.artistId !== undefined)
    out.artistId = input.artistId;
  if ("status" in input && input.status !== undefined) out.status = input.status;
  if ("sentAt" in input) out.sentAt = dt(input.sentAt);
  if ("signedAt" in input) out.signedAt = dt(input.signedAt);
  if ("fileUrl" in input) out.fileUrl = emptyToNull(input.fileUrl);
  if ("signedFileUrl" in input)
    out.signedFileUrl = emptyToNull(input.signedFileUrl);
  if ("notes" in input) out.notes = emptyToNull(input.notes);
  return out;
}
