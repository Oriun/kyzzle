import {
  number,
  date as zodDate,
  string,
  boolean as zodBoolean,
  type ZodType,
  preprocess,
} from "zod";
import type { PgKnownKeywords } from "../types";
import type { UUID } from "node:crypto";

const safeDateTime = preprocess((v) => {
  const parsing = zodDate()
    .or(
      string()
        .datetime()
        .transform((date) => new Date(date)),
    )
    .safeParse(v);

  if (parsing.success) return parsing.data;
  return undefined;
}, zodDate());

export const TypesToZod = {
  text: string(),
  varchar: string(),
  char: string(),
  uuid: string()
    .uuid()
    .transform((uuid) => uuid as UUID),
  bigint: number().int(),
  numeric: number(),
  ["double precision"]: number(),
  boolean: zodBoolean(),
  integer: number().int(),
  date: safeDateTime,
  timestamp: safeDateTime,
  timestamptz: safeDateTime,
  serial: number(),
} as const satisfies Record<string, ZodType>;

export const pgKnownKeywords: Set<PgKnownKeywords> = new Set([
  "CURRENT_DATE",
  "CURRENT_TIME",
  "CURRENT_TIMESTAMP",
  "NOW()",
  "uuid_generate_v4()",
  "NULL",
] as PgKnownKeywords[]);
