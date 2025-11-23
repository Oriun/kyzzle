import {
  any,
  number,
  date as zodDate,
  string,
  boolean as zodBoolean,
  ZodNullable,
  type ZodType,
} from "zod";
import type { PgKnownTypes, SQLExpression } from "./types";
import type { UUID } from "node:crypto";
import { isNullable } from "./utils";
/*

Subset of:
https://www.postgresql.org/docs/current/datatype.html

*/

/*
CREATE TABLE [IF NOT EXISTS] table_name (
   column1 datatype(length) column_constraint,
   column2 datatype(length) generation(expression) CONSTRAINT name column_constraint,
   ...
   CONSTRAINT name table_constraints
);
*/
/*
Generation:
DEFAULT
GENERATED ALWAYS AS
*/
/*
Column Constraints:
NOT NULL
UNIQUE
PRIMARY KEY
FOREIGN KEY
CHECK
*/
/*
Table Constraints;
UNIQUE [NULLS NOT DISTINCT] (...columns)
PRIMARY KEY(...columns)
FOREIGN KEY(...columns) REFERENCES other_table (c1, c2) ON UPDATE effetct ON DELETE effect
CHECK(expression)
EXCLUDE
*/

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

export const json = <T extends string, SchemaType extends ZodType>(
  name: T,
  schema: SchemaType,
) => new JsonObject(name, { mode: "json", schema: schema.nullish() });
export const jsonb = <T extends string, SchemaType extends ZodType>(
  name: T,
  schema: SchemaType,
) => new JsonObject(name, { mode: "jsonb", schema: schema.nullish() });

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

type ParametersWithTypeImpact = {
  isPrimaryKey?: boolean;
  isNotNull?: boolean;
  isImmutable?: boolean;
  hasDefault?: boolean;
  isGeneratedAlways?: boolean;
};
const TypesToZod = {
  text: string().nullable(),
  varchar: string().nullable(),
  char: string().nullable(),
  uuid: string()
    .uuid()
    .transform((uuid) => uuid as UUID)
    .nullable(),
  bigint: number().nullable(),
  numeric: number().nullable(),
  ["double precision"]: number().nullable(),
  boolean: zodBoolean().nullable(),
  integer: number().nullable(),
  date: zodDate()
    .or(
      string()
        .date()
        .transform((date) => new Date(date)),
    )
    .nullable(),
  timestamp: zodDate()
    .or(
      string()
        .datetime()
        .transform((date) => new Date(date)),
    )
    .nullable(),
  timestamptz: zodDate()
    .or(
      string()
        .datetime()
        .transform((date) => new Date(date)),
    )
    .nullable(),
  serial: number().nullable(),
} as const satisfies Record<string, ZodType>;

export abstract class DataType<
  T extends string,
  PgType extends PgKnownTypes | (string & {}),
  //@ts-ignore
  ZodschemaType extends ZodType = PgType extends keyof typeof TypesToZod
    ? (typeof TypesToZod)[PgType]
    : ZodType,
  Parameters extends ParametersWithTypeImpact = {},
> {
  public isPrimaryKey: boolean = false;
  public isUnique: boolean = false;
  public isNotNull: boolean = false;
  public isImmutable: boolean = false;
  public defaultExpression?: SQLExpression = undefined;
  public generatedAlwaysExpression?: SQLExpression = undefined;
  public zodSchema: ZodschemaType;
  constructor(
    public readonly name: T,
    public readonly pgType: PgType,
  ) {
    this.zodSchema = (TypesToZod[pgType as keyof typeof TypesToZod] ??
      any().nullable()) as unknown as ZodschemaType;
  }
  computeType(): string {
    return this.pgType;
  }
  notNull() {
    this.isNotNull = true;
    if (isNullable<ZodschemaType>(this.zodSchema))
      this.zodSchema = this.zodSchema.unwrap();
    return this as unknown as DataType<
      T,
      PgType,
      ZodschemaType extends ZodNullable<infer S>
        ? S extends ZodType
          ? S
          : ZodschemaType
        : ZodschemaType,
      Parameters & { isNotNull: true }
    >;
  }
  unique() {
    this.isUnique = true;
    return this;
  }
  primaryKey() {
    this.isPrimaryKey = true;
    return this.notNull();
  }
  default(expression: SQLExpression) {
    this.defaultExpression = expression;
    return this as unknown as DataType<
      T,
      PgType,
      ZodschemaType,
      Parameters & { hasDefault: true }
    >;
  }
  generatedAlwaysAs(expression: SQLExpression) {
    this.generatedAlwaysExpression = expression;
    this.isImmutable = true;
    return this as unknown as DataType<
      T,
      PgType,
      ZodschemaType extends ZodNullable<infer S>
        ? S extends ZodType
          ? S
          : ZodschemaType
        : ZodschemaType,
      Parameters & { isImmutable: true; isGeneratedAlways: true }
    >;
  }
  immutable() {
    this.isImmutable = true;
    return this as unknown as DataType<
      T,
      PgType,
      ZodschemaType,
      Parameters & { isImmutable: true }
    >;
  }
}

class Integer<T extends string, Size extends 4 | 8> extends DataType<
  T,
  Size extends 4 ? "integer" : "bigint"
> {
  constructor(name: T, parameters: { size: Size }) {
    const pgType = (
      parameters.size === 4 ? "integer" : "bigint"
    ) as Size extends 4 ? "integer" : "bigint";
    super(name, pgType);
  }
}

class Bool<T extends string> extends DataType<T, "boolean"> {
  constructor(name: T) {
    super(name, "boolean");
  }
}

class BoundedString<
  T extends string,
  Mode extends "char" | "varchar",
> extends DataType<T, Mode> {
  length: number;
  constructor(name: T, parameters: { mode: Mode; length: number }) {
    super(name, parameters.mode);
    this.length = parameters.length;
  }
  computeType() {
    return this.pgType + `(${this.length})`;
  }
}

class UnBoundedString<T extends string> extends DataType<T, "text"> {
  constructor(name: T) {
    super(name, "text");
  }
}

class JsonObject<
  T extends string,
  Mode extends "json" | "jsonb",
  Schema extends ZodType,
> extends DataType<T, Mode, Schema, {}> {
  public zodSchema: Schema;
  constructor(name: T, parameters: { mode: Mode; schema: Schema }) {
    super(name, parameters.mode);
    this.zodSchema = parameters.schema;
  }
}

class Timestamp<
  T extends string,
  Mode extends "timestamp" | "timestamptz",
> extends DataType<T, Mode> {
  public precision?: number;
  constructor(
    name: T,
    parameters: {
      withTimezone: Mode extends "timestamptz" ? true : false;
      precision?: number;
    },
  ) {
    super(
      name,
      (parameters.withTimezone ? "timestamptz" : "timestamp") as Mode,
    );
    this.precision = parameters.precision;
  }
  computeType() {
    if (this.precision !== undefined)
      return this.pgType + `(${this.precision})`;
    return this.pgType;
  }
}

class PgDate<T extends string> extends DataType<T, "date"> {
  constructor(name: T) {
    super(name, "date");
  }
}

class UnParametered<
  T extends string,
  Type extends PgKnownTypes | (string & {}),
> extends DataType<T, Type> {
  constructor(name: T, parameters: { type: Type }) {
    super(name, parameters.type);
  }
}

class Numeric<T extends string> extends DataType<T, "numeric"> {
  protected precision?: number;
  protected scale?: number;
  constructor(
    name: T,
    parameters: { precision?: number; scale?: number } = {},
  ) {
    super(name, "numeric");
    this.precision = parameters.precision;
    this.scale = parameters.scale;
  }
  computeType(): string {
    if (this.precision === undefined && this.scale === undefined)
      return this.pgType;
    return `${this.pgType}(${[this.precision, this.scale].join(", ")})`;
  }
}
