import type { ZodType } from "zod";
import {
  Integer,
  Bool,
  PgDate,
  JsonObject,
  Numeric,
  UnParametered,
  BoundedString,
  UnBoundedString,
  Timestamp,
  UserDefined,
} from "./pg_types";
export { ArrayType, array } from "./array";

export const bigint = <T extends string>(name: T) =>
  new Integer(name, { size: 8 });
export const int8 = bigint;

export const bool = <T extends string>(name: T) => new Bool(name);
export const boolean = bool;

export const date = <T extends string>(name: T) => new PgDate(name);

export const integer = <T extends string>(name: T) =>
  new Integer(name, { size: 4 });
export const int4 = integer;
export const int = integer;

export const smallInt = <T extends string>(name: T) =>
  new Integer(name, { size: 2 });
export const int2 = smallInt;

export const json = <T extends string, SchemaType extends ZodType>(
  name: T,
  schema: SchemaType,
) => new JsonObject(name, { mode: "json", schema: schema });
export const jsonb = <T extends string, SchemaType extends ZodType>(
  name: T,
  schema: SchemaType,
) => new JsonObject(name, { mode: "jsonb", schema: schema });

export const numeric = <T extends string>(
  name: T,
  parameters?: ConstructorParameters<typeof Numeric>[1],
) => new Numeric(name, parameters);
export const decimal = numeric;

export const doublePrecision = <T extends string>(name: T) =>
  new UnParametered(name, { type: "double precision" });
export const real = doublePrecision;

export const serial = <T extends string>(name: T) =>
  new UnParametered(name, { type: "serial" });
export const serial4 = serial;

export const char = <T extends string>(
  name: T,
  { length }: { length: number },
) => new BoundedString(name, { mode: "char", length });
export const varchar = <T extends string>(
  name: T,
  { length }: { length: number },
) => new BoundedString(name, { mode: "varchar", length });
export const character = char;
export const characterVarying = varchar;
export const text = <T extends string>(name: T) => new UnBoundedString(name);

export const timestamp = <T extends string>(name: T) =>
  new Timestamp<T, "timestamp">(name, { withTimezone: false });
export const timestamptz = <T extends string>(name: T) =>
  new Timestamp<T, "timestamptz">(name, { withTimezone: true });

export const uuid = <T extends string>(name: T) =>
  new UnParametered(name, { type: "uuid" });

export const custom =
  <PgType extends string, SchemaType extends ZodType>(
    type: PgType,
    schema: SchemaType,
  ) =>
  <T extends string>(name: T) =>
    new UserDefined(name, { type, schema });
