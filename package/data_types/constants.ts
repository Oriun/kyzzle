import {
  number,
  date as zodDate,
  string,
  boolean as zodBoolean,
  type ZodType,
} from "zod";
import type { PgKnownKeywords } from "../types";
import type { UUID } from "node:crypto";

export const TypesToZod = {
  text: string(),
  varchar: string(),
  char: string(),
  uuid: string()
    .uuid()
    .transform((uuid) => uuid as UUID),
  bigint: number(),
  numeric: number(),
  ["double precision"]: number(),
  boolean: zodBoolean(),
  integer: number(),
  date: zodDate().or(
    string()
      .date()
      .transform((date) => new Date(date)),
  ),
  timestamp: zodDate().or(
    string()
      .datetime()
      .transform((date) => new Date(date)),
  ),
  timestamptz: zodDate().or(
    string()
      .datetime()
      .transform((date) => new Date(date)),
  ),
  serial: number(),
} as const satisfies Record<string, ZodType>;

export const pgKnownKeywords: Set<PgKnownKeywords> = new Set([
  "CURRENT_TIMESTAMP",
  "NOW()",
  "uuid_generate_v4()",
  "NULL",
] as PgKnownKeywords[]);
