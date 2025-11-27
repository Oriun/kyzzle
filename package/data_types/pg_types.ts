import type { ZodNullable, ZodNumber, ZodType } from "zod";
import type {
  ParametersWithTypeImpact,
  PgKnownTypes,
  SQLExpression,
} from "../types";
import { DataType } from "./base";

export class Integer<T extends string, Size extends 2 | 4 | 8> extends DataType<
  T,
  Size extends 4 ? "smallint" : Size extends 4 ? "integer" : "bigint",
  ZodNullable<ZodNumber>
> {
  constructor(name: T, parameters: { size: Size }) {
    const pgType = (
      parameters.size === 2
        ? "smallint"
        : parameters.size === 4
          ? "integer"
          : "bigint"
    ) as Size extends 4 ? "smallint" : Size extends 4 ? "integer" : "bigint";
    super(name, pgType);
  }
}

export class Bool<T extends string> extends DataType<T, "boolean"> {
  constructor(name: T) {
    super(name, "boolean");
  }
}

export class BoundedString<
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

export class UnBoundedString<T extends string> extends DataType<T, "text"> {
  constructor(name: T) {
    super(name, "text");
  }
}

export class JsonObject<
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

export class Timestamp<
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

export class PgDate<T extends string> extends DataType<T, "date"> {
  constructor(name: T) {
    super(name, "date");
  }
}

export class UnParametered<
  T extends string,
  Type extends PgKnownTypes | (string & {}),
> extends DataType<T, Type> {
  constructor(name: T, parameters: { type: Type }) {
    super(name, parameters.type);
  }
}

export class Numeric<T extends string> extends DataType<T, "numeric"> {
  public precision?: number;
  public scale?: number;
  public minExclusive?: SQLExpression;
  public maxExclusive?: SQLExpression;
  public minInclusive?: SQLExpression;
  public maxInclusive?: SQLExpression;
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
  gt(value: SQLExpression) {
    this.minExclusive = value;
    return this;
  }
  lt(value: SQLExpression) {
    this.maxExclusive = value;
    return this;
  }
  gte(value: SQLExpression) {
    this.minInclusive = value;
    return this;
  }
  lte(value: SQLExpression) {
    this.maxInclusive = value;
    return this;
  }
}

export class UserDefined<
  T extends string,
  Type extends string,
  Schema extends ZodType,
  Parameters extends ParametersWithTypeImpact = {},
  DefaultType = SQLExpression,
> extends DataType<T, Type, Schema, Parameters, DefaultType> {
  public zodSchema: Schema;
  constructor(name: T, parameters: { type: Type; schema: Schema }) {
    super(name, parameters.type);
    this.zodSchema = parameters.schema;
  }
}
