import {
  array as zodArray,
  type ZodArray,
  type ZodNullable,
  type ZodType,
} from "zod";
import type {
  ParametersWithTypeImpact,
  PgKnownTypes,
  SQLExpression,
} from "../types";
import { DataType } from "./base";

type InferZodSchema<Type> =
  Type extends DataType<any, any, infer Schema, any, any> ? Schema : ZodType;
type InferName<Type> =
  Type extends DataType<infer Name, any, any, any, any> ? Name : string;
type InferPgType<Type> =
  Type extends DataType<any, infer PgType, any, any, any>
    ? PgType
    : PgKnownTypes;
type InferDefault<Type> =
  Type extends DataType<any, any, any, any, infer Default>
    ? Default
    : SQLExpression;

type ArraySchema<
  ItemSchema extends ZodType,
  ItemsNullable extends boolean,
> = ZodArray<ItemsNullable extends true ? ZodNullable<ItemSchema> : ItemSchema>;

export type ArrayParameters<ItemsNullable extends boolean> =
  ParametersWithTypeImpact & {
    isArray: true;
    itemsAreNullable: ItemsNullable;
    minItemsLength?: number;
    maxItemsLength?: number;
  };

export class ArrayType<
  Item extends DataType<string | undefined, PgKnownTypes | (string & {}), ItemSchema>,
  ItemSchema extends ZodType = InferZodSchema<Item>,
  ItemsNullable extends boolean = true,
> extends DataType<
  InferName<Item>,
  InferPgType<Item>,
  ArraySchema<ItemSchema, ItemsNullable>,
  ArrayParameters<ItemsNullable>,
  InferDefault<Item>
> {
  public readonly item: Item;
  public itemsAreNullable: boolean;
  public minItemsLength?: number;
  public maxItemsLength?: number;

  constructor(type: Item) {
    super(type.name as InferName<Item>, type.pgType as InferPgType<Item>);
    this.item = type;
    this.isArray = true;
    this.itemsAreNullable = true;
    this.refreshSchema();
  }

  notNullableItems() {
    this.itemsAreNullable = false;
    this.refreshSchema();
    return this as unknown as ArrayType<Item, ItemSchema, false> &
      Omit<
        typeof this,
        keyof DataType<
          InferName<Item>,
          InferPgType<Item>,
          ArraySchema<ItemSchema, ItemsNullable>,
          ArrayParameters<ItemsNullable>,
          SQLExpression
        >
      >;
  }

  minLength(length: number) {
    this.minItemsLength = length;
    this.refreshSchema();
    return this;
  }

  maxLength(length: number) {
    this.maxItemsLength = length;
    this.refreshSchema();
    return this;
  }

  length(length: number) {
    this.minItemsLength = length;
    this.maxItemsLength = length;
    this.refreshSchema();
    return this;
  }

  computeType(): string {
    return `${this.item.computeType()}[]`;
  }
 
  setNameIfEmpty(name: string) {
    super.setNameIfEmpty(name);
    this.item.setNameIfEmpty(name);
  }
 
  private refreshSchema() {

    const itemSchema = (
      this.itemsAreNullable
        ? this.item.zodSchema.nullable()
        : this.item.zodSchema
    ) as ItemsNullable extends true ? ZodNullable<ItemSchema> : ItemSchema;

    let schema = zodArray(itemSchema) as ArraySchema<ItemSchema, ItemsNullable>;

    if (
      this.minItemsLength !== undefined &&
      this.maxItemsLength !== undefined
    ) {
      const sameLength = this.minItemsLength === this.maxItemsLength;
      schema = sameLength
        ? (schema.length(this.minItemsLength) as ArraySchema<
            ItemSchema,
            ItemsNullable
          >)
        : schema;
    }

    if (
      this.minItemsLength !== undefined &&
      (this.maxItemsLength === undefined ||
        this.minItemsLength !== this.maxItemsLength)
    )
      schema = schema.min(this.minItemsLength) as ArraySchema<
        ItemSchema,
        ItemsNullable
      >;
    if (
      this.maxItemsLength !== undefined &&
      (this.minItemsLength === undefined ||
        this.minItemsLength !== this.maxItemsLength)
    )
      schema = schema.max(this.maxItemsLength) as ArraySchema<
        ItemSchema,
        ItemsNullable
      >;

    this.zodSchema = schema;
  }
}

export const array = <
  Item extends DataType<string | undefined, PgKnownTypes | (string & {}), ItemSchema>,
  ItemSchema extends ZodType = InferZodSchema<Item>,
>(
  type: Item,
) => new ArrayType<Item, ItemSchema>(type);
