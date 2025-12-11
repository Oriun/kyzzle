import type { PgKnownKeywords } from "../types";
export declare const TypesToZod: {
    readonly text: import("zod").ZodString;
    readonly varchar: import("zod").ZodString;
    readonly char: import("zod").ZodString;
    readonly uuid: import("zod").ZodEffects<import("zod").ZodString, `${string}-${string}-${string}-${string}-${string}`, string>;
    readonly bigint: import("zod").ZodNumber;
    readonly numeric: import("zod").ZodNumber;
    readonly "double precision": import("zod").ZodNumber;
    readonly boolean: import("zod").ZodBoolean;
    readonly integer: import("zod").ZodNumber;
    readonly date: import("zod").ZodEffects<import("zod").ZodDate, Date, unknown>;
    readonly timestamp: import("zod").ZodEffects<import("zod").ZodDate, Date, unknown>;
    readonly timestamptz: import("zod").ZodEffects<import("zod").ZodDate, Date, unknown>;
    readonly serial: import("zod").ZodNumber;
};
export declare const pgKnownKeywords: Set<PgKnownKeywords>;
