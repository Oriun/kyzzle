import { type ZodType } from "zod";
import type { ParametersWithTypeImpact, PgKnownTypes, SQLExpression } from "../types";
import { TypesToZod } from "./constants";
export declare abstract class DataType<T extends string, PgType extends PgKnownTypes | (string & {}), ZodschemaType extends ZodType = PgType extends keyof typeof TypesToZod ? (typeof TypesToZod)[PgType] : ZodType, Parameters extends ParametersWithTypeImpact = {}, DefaultType = SQLExpression> {
    readonly name: T;
    readonly pgType: PgType;
    isPrimaryKey: boolean;
    isUnique: boolean;
    isNotNull: boolean;
    isImmutable: boolean;
    isArray: boolean;
    defaultExpression?: SQLExpression;
    generatedAlwaysExpression?: SQLExpression;
    zodSchema: ZodschemaType;
    constraints: {
        type: string;
        definition: string;
    }[];
    constructor(name: T, pgType: PgType);
    computeType(): string;
    notNull(): DataType<T, PgType, ZodschemaType, Parameters & {
        isNotNull: true;
    }, DefaultType> & Omit<typeof this, keyof DataType<T, PgType, ZodschemaType, Parameters, DefaultType>>;
    unique(): DataType<T, PgType, ZodschemaType, Parameters, DefaultType> & Omit<typeof this, keyof DataType<T, PgType, ZodschemaType, Parameters, DefaultType>>;
    primaryKey(): DataType<T, PgType, ZodschemaType, Parameters & {
        isNotNull: true;
    }, DefaultType> & Omit<this, keyof DataType<T, PgType, ZodschemaType, Parameters, DefaultType>>;
    default<TExpression extends SQLExpression | DefaultType>(expression: TExpression, ...args: any[]): DataType<T, PgType, ZodschemaType, Parameters & {
        hasDefault: true;
    }, DefaultType> & Omit<typeof this, keyof DataType<T, PgType, ZodschemaType, Parameters, DefaultType>>;
    generatedAlwaysAs(expression: SQLExpression, ...args: any[]): DataType<T, PgType, ZodschemaType, Parameters & {
        isImmutable: true;
        isGeneratedAlways: true;
    }, DefaultType> & Omit<typeof this, keyof DataType<T, PgType, ZodschemaType, Parameters, DefaultType>>;
    immutable(): DataType<T, PgType, ZodschemaType, Parameters & {
        isImmutable: true;
    }, DefaultType> & Omit<typeof this, keyof DataType<T, PgType, ZodschemaType, Parameters, DefaultType>>;
    override<Z extends ZodType>(schema: Z | ((currentSchema: ZodschemaType) => Z)): DataType<T, PgType, Z, Parameters, DefaultType>;
}
