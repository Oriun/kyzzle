import type { ZodType } from "zod";
import { Integer, Bool, PgDate, JsonObject, Numeric, UnParametered, BoundedString, UnBoundedString, Timestamp, UserDefined } from "./pg_types";
export { ArrayType, array } from "./array";
export declare const bigint: <T extends string>(name: T) => Integer<T, 8>;
export declare const int8: <T extends string>(name: T) => Integer<T, 8>;
export declare const bool: <T extends string>(name: T) => Bool<T>;
export declare const boolean: <T extends string>(name: T) => Bool<T>;
export declare const date: <T extends string>(name: T) => PgDate<T>;
export declare const integer: <T extends string>(name: T) => Integer<T, 4>;
export declare const int4: <T extends string>(name: T) => Integer<T, 4>;
export declare const int: <T extends string>(name: T) => Integer<T, 4>;
export declare const smallInt: <T extends string>(name: T) => Integer<T, 2>;
export declare const int2: <T extends string>(name: T) => Integer<T, 2>;
export declare const json: <T extends string, SchemaType extends ZodType>(name: T, schema: SchemaType) => JsonObject<T, "json", SchemaType>;
export declare const jsonb: <T extends string, SchemaType extends ZodType>(name: T, schema: SchemaType) => JsonObject<T, "jsonb", SchemaType>;
export declare const numeric: <T extends string>(name: T, parameters?: ConstructorParameters<typeof Numeric>[1]) => Numeric<T>;
export declare const decimal: <T extends string>(name: T, parameters?: ConstructorParameters<typeof Numeric>[1]) => Numeric<T>;
export declare const doublePrecision: <T extends string>(name: T) => UnParametered<T, "double precision">;
export declare const real: <T extends string>(name: T) => UnParametered<T, "double precision">;
export declare const serial: <T extends string>(name: T) => UnParametered<T, "serial">;
export declare const serial4: <T extends string>(name: T) => UnParametered<T, "serial">;
export declare const char: <T extends string>(name: T, { length }: {
    length: number;
}) => BoundedString<T, "char", import("..").ParametersWithTypeImpact>;
export declare const varchar: <T extends string>(name: T, { length }: {
    length: number;
}) => BoundedString<T, "varchar", import("..").ParametersWithTypeImpact>;
export declare const character: <T extends string>(name: T, { length }: {
    length: number;
}) => BoundedString<T, "char", import("..").ParametersWithTypeImpact>;
export declare const characterVarying: <T extends string>(name: T, { length }: {
    length: number;
}) => BoundedString<T, "varchar", import("..").ParametersWithTypeImpact>;
export declare const text: <T extends string>(name: T) => UnBoundedString<T>;
export declare const timestamp: <T extends string>(name: T) => Timestamp<T, "timestamp">;
export declare const timestamptz: <T extends string>(name: T) => Timestamp<T, "timestamptz">;
export declare const uuid: <T extends string>(name: T) => UnParametered<T, "uuid">;
export declare const custom: <PgType extends string, SchemaType extends ZodType>(type: PgType, schema: SchemaType) => <T extends string>(name: T) => UserDefined<T, PgType, SchemaType, {}, import("..").SQLExpression | import("zod").output<SchemaType>>;
