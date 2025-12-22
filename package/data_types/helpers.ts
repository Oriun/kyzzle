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

export function bigint<T extends string>(name: T): Integer<T, 8>;
export function bigint(): Integer<undefined, 8>;
export function bigint(name?: string): Integer<string, 8> | Integer<undefined, 8> {
  return name === undefined
    ? new Integer<undefined, 8>(undefined, { size: 8 })
    : new Integer(name, { size: 8 });
}
export const int8 = bigint;

export function bool<T extends string>(name: T): Bool<T>;
export function bool(): Bool<undefined>;
export function bool(name?: string): Bool<string> | Bool<undefined> {
  return name === undefined ? new Bool<undefined>(undefined) : new Bool(name);
}
export const boolean = bool;

export function date<T extends string>(name: T): PgDate<T>;
export function date(): PgDate<undefined>;
export function date(name?: string): PgDate<string> | PgDate<undefined> {
  return name === undefined ? new PgDate<undefined>(undefined) : new PgDate(name);
}

export function integer<T extends string>(name: T): Integer<T, 4>;
export function integer(): Integer<undefined, 4>;
export function integer(name?: string): Integer<string, 4> | Integer<undefined, 4> {
  return name === undefined
    ? new Integer<undefined, 4>(undefined, { size: 4 })
    : new Integer(name, { size: 4 });
}
export const int4 = integer;
export const int = integer;

export function smallInt<T extends string>(name: T): Integer<T, 2>;
export function smallInt(): Integer<undefined, 2>;
export function smallInt(name?: string): Integer<string, 2> | Integer<undefined, 2> {
  return name === undefined
    ? new Integer<undefined, 2>(undefined, { size: 2 })
    : new Integer(name, { size: 2 });
}
export const int2 = smallInt;

export function json<T extends string, SchemaType extends ZodType>(
  name: T,
  schema: SchemaType,
): JsonObject<T, "json", SchemaType>;
export function json<SchemaType extends ZodType>(
  schema: SchemaType,
): JsonObject<undefined, "json", SchemaType>;
export function json<T extends string | undefined, SchemaType extends ZodType>(
  nameOrSchema: T | SchemaType,
  schema?: SchemaType,
) {
  if (schema === undefined)
    return new JsonObject<undefined, "json", SchemaType>(undefined, {
      mode: "json",
      schema: nameOrSchema as SchemaType,
    });
  return new JsonObject(nameOrSchema as T, { mode: "json", schema });
}

export function jsonb<T extends string, SchemaType extends ZodType>(
  name: T,
  schema: SchemaType,
): JsonObject<T, "jsonb", SchemaType>;
export function jsonb<SchemaType extends ZodType>(
  schema: SchemaType,
): JsonObject<undefined, "jsonb", SchemaType>;
export function jsonb<T extends string | undefined, SchemaType extends ZodType>(
  nameOrSchema: T | SchemaType,
  schema?: SchemaType,
) {
  if (schema === undefined)
    return new JsonObject<undefined, "jsonb", SchemaType>(undefined, {
      mode: "jsonb",
      schema: nameOrSchema as SchemaType,
    });
  return new JsonObject(nameOrSchema as T, { mode: "jsonb", schema });
}

export function numeric<T extends string>(
  name: T,
  parameters?: ConstructorParameters<typeof Numeric>[1],
): Numeric<T>;
export function numeric(
  parameters?: ConstructorParameters<typeof Numeric>[1],
): Numeric<undefined>;
export function numeric<T extends string | undefined>(
  nameOrParameters?: T | ConstructorParameters<typeof Numeric>[1],
  parameters?: ConstructorParameters<typeof Numeric>[1],
): Numeric<T> | Numeric<undefined> {
  if (typeof nameOrParameters === "string")
    return new Numeric(nameOrParameters as T, parameters);
  return new Numeric<undefined>(undefined, nameOrParameters as ConstructorParameters<
    typeof Numeric
  >[1]);
}
export const decimal = numeric;

export function doublePrecision<T extends string>(
  name: T,
): UnParametered<T, "double precision">;
export function doublePrecision(): UnParametered<undefined, "double precision">;
export function doublePrecision(
  name?: string,
): UnParametered<string, "double precision"> | UnParametered<undefined, "double precision"> {
  return name === undefined
    ? new UnParametered<undefined, "double precision">(undefined, {
        type: "double precision",
      })
    : new UnParametered(name, { type: "double precision" });
}
export const real = doublePrecision;

export function serial<T extends string>(name: T): UnParametered<T, "serial">;
export function serial(): UnParametered<undefined, "serial">;
export function serial(name?: string): UnParametered<string, "serial"> | UnParametered<undefined, "serial"> {
  return name === undefined
    ? new UnParametered<undefined, "serial">(undefined, { type: "serial" })
    : new UnParametered(name, { type: "serial" });
}
export const serial4 = serial;

export function char(
  name: string,
  { length }: { length: number },
): BoundedString<string, "char", {}>;
export function char({ length }: { length: number }): BoundedString<
  undefined,
  "char",
  {}
>;
export function char(
  nameOrParams: string | { length: number },
  params?: { length: number },
): BoundedString<string, "char", {}> | BoundedString<undefined, "char", {}> {
  if (typeof nameOrParams === "string") {
    const lengthValue = params?.length;
    if (lengthValue === undefined)
      throw new Error("length is required when name is provided");
    return new BoundedString(nameOrParams, { mode: "char", length: lengthValue });
  }
  return new BoundedString<undefined, "char", {}>(undefined, {
    mode: "char",
    length: nameOrParams.length,
  });
}

export function varchar(
  name: string,
  { length }: { length: number },
): BoundedString<string, "varchar", {}>;
export function varchar({ length }: { length: number }): BoundedString<
  undefined,
  "varchar",
  {}
>;
export function varchar(
  nameOrParams: string | { length: number },
  params?: { length: number },
): BoundedString<string, "varchar", {}> | BoundedString<undefined, "varchar", {}> {
  if (typeof nameOrParams === "string") {
    const lengthValue = params?.length;
    if (lengthValue === undefined)
      throw new Error("length is required when name is provided");
    return new BoundedString(nameOrParams, {
      mode: "varchar",
      length: lengthValue,
    });
  }
  return new BoundedString<undefined, "varchar", {}>(undefined, {
    mode: "varchar",
    length: nameOrParams.length,
  });
}
export const character = char;
export const characterVarying = varchar;

export function text<T extends string>(name: T): UnBoundedString<T>;
export function text(): UnBoundedString<undefined>;
export function text(name?: string): UnBoundedString<string> | UnBoundedString<undefined> {
  return name === undefined
    ? new UnBoundedString<undefined>(undefined)
    : new UnBoundedString(name);
}

export function timestamp<T extends string>(name: T): Timestamp<T, "timestamp">;
export function timestamp(): Timestamp<undefined, "timestamp">;
export function timestamp(
  name?: string,
): Timestamp<string, "timestamp"> | Timestamp<undefined, "timestamp"> {
  return new Timestamp(name, { withTimezone: false });
}

export function timestamptz<T extends string>(
  name: T,
): Timestamp<T, "timestamptz">;
export function timestamptz(): Timestamp<undefined, "timestamptz">;
export function timestamptz(
  name?: string,
): Timestamp<string, "timestamptz"> | Timestamp<undefined, "timestamptz"> {
  return new Timestamp(name, { withTimezone: true });
}

export function uuid<T extends string>(name: T): UnParametered<T, "uuid">;
export function uuid(): UnParametered<undefined, "uuid">;
export function uuid(name?: string): UnParametered<string, "uuid"> | UnParametered<undefined, "uuid"> {
  return name === undefined
    ? new UnParametered<undefined, "uuid">(undefined, { type: "uuid" })
    : new UnParametered(name, { type: "uuid" });
}

export const custom =
  <PgType extends string, SchemaType extends ZodType>(
    type: PgType,
    schema: SchemaType,
  ) =>
  <T extends string | undefined = undefined>(name?: T) =>
    new UserDefined(name, { type, schema });
