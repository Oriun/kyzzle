import { type ZodArray, type ZodNullable, type ZodType } from "zod";
import type { ParametersWithTypeImpact, PgKnownTypes, SQLExpression } from "../types";
import { DataType } from "./base";
type InferZodSchema<Type> = Type extends DataType<any, any, infer Schema, any, any> ? Schema : ZodType;
type InferName<Type> = Type extends DataType<infer Name, any, any, any, any> ? Name : string;
type InferPgType<Type> = Type extends DataType<any, infer PgType, any, any, any> ? PgType : PgKnownTypes;
type InferDefault<Type> = Type extends DataType<any, any, any, any, infer Default> ? Default : SQLExpression;
type ArraySchema<ItemSchema extends ZodType, ItemsNullable extends boolean> = ZodArray<ItemsNullable extends true ? ZodNullable<ItemSchema> : ItemSchema>;
export type ArrayParameters<ItemsNullable extends boolean> = ParametersWithTypeImpact & {
    isArray: true;
    itemsAreNullable: ItemsNullable;
    minItemsLength?: number;
    maxItemsLength?: number;
};
export declare class ArrayType<Item extends DataType<string, PgKnownTypes | (string & {}), ItemSchema>, ItemSchema extends ZodType = InferZodSchema<Item>, ItemsNullable extends boolean = true> extends DataType<InferName<Item>, InferPgType<Item>, ArraySchema<ItemSchema, ItemsNullable>, ArrayParameters<ItemsNullable>, InferDefault<Item>> {
    readonly item: Item;
    itemsAreNullable: boolean;
    minItemsLength?: number;
    maxItemsLength?: number;
    constructor(type: Item);
    notNullableItems(): ArrayType<Item, ItemSchema, false> & Omit<typeof this, keyof DataType<InferName<Item>, InferPgType<Item>, ArraySchema<ItemSchema, ItemsNullable>, ArrayParameters<ItemsNullable>, SQLExpression>>;
    minLength(length: number): this;
    maxLength(length: number): this;
    length(length: number): this;
    computeType(): string;
    private refreshSchema;
}
export declare const array: <Item extends DataType<string, PgKnownTypes | (string & {}), ItemSchema>, ItemSchema extends ZodType = InferZodSchema<Item>>(type: Item) => ArrayType<Item, ItemSchema, true>;
export {};
