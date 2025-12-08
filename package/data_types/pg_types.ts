import type { ZodNumber, ZodString, ZodType, output } from "zod";
import type {
  ParametersWithTypeImpact,
  PgKnownTypes,
  SQLExpression,
} from "../types";
import { DataType } from "./base";

export class Integer<T extends string, Size extends 2 | 4 | 8> extends DataType<
  T,
  Size extends 4 ? "smallint" : Size extends 4 ? "integer" : "bigint",
  ZodNumber
> {
  public minExclusive?: number;
  public maxExclusive?: number;
  public minInclusive?: number;
  public maxInclusive?: number;
  public divisibleBy?: number;
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
  gt(value: number) {
    this.minExclusive = value;
    this.zodSchema = this.zodSchema.gt(value);
    return this;
  }
  lt(value: number) {
    this.maxExclusive = value;
    this.zodSchema = this.zodSchema.lt(value);
    return this;
  }
  gte(value: number) {
    this.minInclusive = value;
    this.zodSchema = this.zodSchema.gte(value);
    return this;
  }
  lte(value: number) {
    this.maxInclusive = value;
    this.zodSchema = this.zodSchema.lte(value);
    return this;
  }
  nonnegative() {
    this.zodSchema = this.zodSchema.nonnegative();
    this.minInclusive = 0;
    this.minExclusive = undefined;
    this.maxExclusive = undefined;
    this.maxInclusive = undefined;
    return this;
  }
  nonpositive() {
    this.zodSchema = this.zodSchema.nonpositive();
    this.maxInclusive = 0;
    this.maxExclusive = undefined;
    this.minExclusive = undefined;
    this.minInclusive = undefined;
    return this;
  }
  positive() {
    this.zodSchema = this.zodSchema.positive();
    this.minExclusive = 0;
    this.minInclusive = undefined;
    this.maxExclusive = undefined;
    this.maxInclusive = undefined;
    return this;
  }
  negative() {
    this.zodSchema = this.zodSchema.negative();
    this.maxExclusive = 0;
    this.maxInclusive = undefined;
    this.minExclusive = undefined;
    this.minInclusive = undefined;
    return this;
  }
  multipleOf(value: number) {
    this.zodSchema = this.zodSchema.multipleOf(value);
    this.divisibleBy = value;
    return this;
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
  Parameters extends ParametersWithTypeImpact,
> extends DataType<T, Mode, ZodString, Parameters> {
  length: number;
  pattern?: RegExp;
  constructor(name: T, parameters: { mode: Mode; length: number }) {
    super(name, parameters.mode);
    this.length = parameters.length;
  }
  computeType() {
    return this.pgType + `(${this.length})`;
  }
  regex(pattern: RegExp) {
    this.pattern = pattern;
    this.zodSchema = this.zodSchema.regex(pattern);
    return this;
  }
}

export class UnBoundedString<T extends string> extends DataType<T, "text"> {
  public maxLength?: number;
  public minLength?: number;
  public pattern?: RegExp;

  constructor(name: T) {
    super(name, "text");
  }
  length(length: number) {
    return this.min(length).max(length);
  }
  min(length: number) {
    this.minLength = length;
    this.zodSchema = this.zodSchema.min(length);
    return this;
  }
  max(length: number) {
    this.maxLength = length;
    this.zodSchema = this.zodSchema.max(length);
    return this;
  }
  regex(pattern: RegExp) {
    this.pattern = pattern;
    this.zodSchema = this.zodSchema.regex(pattern);
    return this;
  }
}

export class JsonObject<
  T extends string,
  Mode extends "json" | "jsonb",
  Schema extends ZodType,
> extends DataType<
  T,
  Mode,
  Schema,
  ParametersWithTypeImpact,
  output<Schema> | SQLExpression
> {
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
  public minDate?: Date;
  public maxDate?: Date;

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
  min(date: Date) {
    this.minDate = date;
    // @ts-ignore
    this.zodSchema = this.zodSchema.refine((value) => {
      return value >= date;
    }, `must be greater than or equal to ${date}`);
    return this;
  }
  max(date: Date) {
    this.maxDate = date;
    // @ts-ignore
    this.zodSchema = this.zodSchema.refine((value) => {
      return value <= date;
    }, `must be less than or equal to ${date}`);
    return this;
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
  public minExclusive?: number;
  public maxExclusive?: number;
  public minInclusive?: number;
  public maxInclusive?: number;
  public divisibleBy?: number;
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
  gt(value: number) {
    this.minExclusive = value;
    this.zodSchema = this.zodSchema.gt(value);
    return this;
  }
  lt(value: number) {
    this.maxExclusive = value;
    this.zodSchema = this.zodSchema.lt(value);
    return this;
  }
  gte(value: number) {
    this.minInclusive = value;
    this.zodSchema = this.zodSchema.gte(value);
    return this;
  }
  lte(value: number) {
    this.maxInclusive = value;
    this.zodSchema = this.zodSchema.lte(value);
    return this;
  }
  nonnegative() {
    this.zodSchema = this.zodSchema.nonnegative();
    this.minInclusive = 0;
    this.minExclusive = undefined;
    this.maxExclusive = undefined;
    this.maxInclusive = undefined;
    return this;
  }
  nonpositive() {
    this.zodSchema = this.zodSchema.nonpositive();
    this.maxInclusive = 0;
    this.maxExclusive = undefined;
    this.minExclusive = undefined;
    this.minInclusive = undefined;
    return this;
  }
  positive() {
    this.zodSchema = this.zodSchema.positive();
    this.minExclusive = 0;
    this.minInclusive = undefined;
    this.maxExclusive = undefined;
    this.maxInclusive = undefined;
    return this;
  }
  negative() {
    this.zodSchema = this.zodSchema.negative();
    this.maxExclusive = 0;
    this.maxInclusive = undefined;
    this.minExclusive = undefined;
    this.minInclusive = undefined;
    return this;
  }
  multipleOf(value: number) {
    this.zodSchema = this.zodSchema.multipleOf(value);
    this.divisibleBy = value;
    return this;
  }
}

export class UserDefined<
  T extends string,
  Type extends string,
  Schema extends ZodType,
  Parameters extends ParametersWithTypeImpact = {},
  DefaultType = output<Schema> | SQLExpression,
> extends DataType<T, Type, Schema, Parameters, DefaultType> {
  public zodSchema: Schema;
  constructor(name: T, parameters: { type: Type; schema: Schema }) {
    super(name, parameters.type);
    this.zodSchema = parameters.schema;
  }
}
