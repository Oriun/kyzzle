import type { ZodNumber, ZodString, ZodType, output } from "zod";
import type { ParametersWithTypeImpact, PgKnownTypes, SQLExpression } from "../types";
import { DataType } from "./base";
type IntegerPgType<Size extends 2 | 4 | 8> = Size extends 2 ? "smallint" : Size extends 4 ? "integer" : "bigint";
export declare class Integer<T extends string, Size extends 2 | 4 | 8> extends DataType<T, IntegerPgType<Size>, ZodNumber> {
    minExclusive?: number;
    maxExclusive?: number;
    minInclusive?: number;
    maxInclusive?: number;
    divisibleBy?: number;
    constructor(name: T, parameters: {
        size: Size;
    });
    gt(value: number): this;
    lt(value: number): this;
    gte(value: number): this;
    lte(value: number): this;
    nonnegative(): this;
    nonpositive(): this;
    positive(): this;
    negative(): this;
    multipleOf(value: number): this;
}
export declare class Bool<T extends string> extends DataType<T, "boolean"> {
    constructor(name: T);
}
export declare class BoundedString<T extends string, Mode extends "char" | "varchar", Parameters extends ParametersWithTypeImpact> extends DataType<T, Mode, ZodString, Parameters> {
    length: number;
    pattern?: RegExp;
    constructor(name: T, parameters: {
        mode: Mode;
        length: number;
    });
    computeType(): string;
    regex(pattern: RegExp): this;
}
export declare class UnBoundedString<T extends string> extends DataType<T, "text"> {
    maxLength?: number;
    minLength?: number;
    pattern?: RegExp;
    constructor(name: T);
    length(length: number): this;
    min(length: number): this;
    max(length: number): this;
    regex(pattern: RegExp): this;
}
export declare class JsonObject<T extends string, Mode extends "json" | "jsonb", Schema extends ZodType> extends DataType<T, Mode, Schema, ParametersWithTypeImpact, output<Schema> | SQLExpression> {
    zodSchema: Schema;
    constructor(name: T, parameters: {
        mode: Mode;
        schema: Schema;
    });
}
export declare class Timestamp<T extends string, Mode extends "timestamp" | "timestamptz"> extends DataType<T, Mode> {
    precision?: number;
    minDate?: Date;
    maxDate?: Date;
    constructor(name: T, parameters: {
        withTimezone: Mode extends "timestamptz" ? true : false;
        precision?: number;
    });
    computeType(): string;
    min(date: Date): this;
    max(date: Date): this;
}
export declare class PgDate<T extends string> extends DataType<T, "date"> {
    constructor(name: T);
}
export declare class UnParametered<T extends string, Type extends PgKnownTypes | (string & {})> extends DataType<T, Type> {
    constructor(name: T, parameters: {
        type: Type;
    });
}
export declare class Numeric<T extends string> extends DataType<T, "numeric"> {
    precision?: number;
    scale?: number;
    minExclusive?: number;
    maxExclusive?: number;
    minInclusive?: number;
    maxInclusive?: number;
    divisibleBy?: number;
    constructor(name: T, parameters?: {
        precision?: number;
        scale?: number;
    });
    computeType(): string;
    gt(value: number): this;
    lt(value: number): this;
    gte(value: number): this;
    lte(value: number): this;
    nonnegative(): this;
    nonpositive(): this;
    positive(): this;
    negative(): this;
    multipleOf(value: number): this;
}
export declare class UserDefined<T extends string, Type extends string, Schema extends ZodType, Parameters extends ParametersWithTypeImpact = {}, DefaultType = output<Schema> | SQLExpression> extends DataType<T, Type, Schema, Parameters, DefaultType> {
    zodSchema: Schema;
    constructor(name: T, parameters: {
        type: Type;
        schema: Schema;
    });
}
export {};
