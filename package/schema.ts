import { never, object, ZodObject } from "zod";
import type {
  InsertSchema,
  PgCompositeTypeDefinition,
  PgIdentifier,
  PgTableColumnDefinition,
  PgTableDefinition,
  SchemaGenerationOptions,
  SelectSchema,
  UpdateSchema,
} from "./types";
import { entries, fromEntries, isNullable } from "./utils";

export function selectSchema<
  TableName extends PgIdentifier,
  ColumnDefinition extends PgTableColumnDefinition,
>(
  table:
    | PgTableDefinition<TableName, ColumnDefinition>
    | PgCompositeTypeDefinition<TableName, ColumnDefinition>,
): ZodObject<SelectSchema<ColumnDefinition>> {
  return object(
    fromEntries(
      entries(table).map(([name, column]) => {
        if (column.type.isNotNull || isNullable(column.type.zodSchema))
          return [name, column.type.zodSchema];
        return [name, column.type.zodSchema.nullable()];
      }),
    ),
  ) as unknown as ZodObject<SelectSchema<ColumnDefinition>>;
}

export function insertSchema<
  TableName extends PgIdentifier,
  ColumnDefinition extends PgTableColumnDefinition,
>(
  table: PgTableDefinition<TableName, ColumnDefinition>,
  options: SchemaGenerationOptions = { throwOnForbiddenColumns: true },
): ZodObject<InsertSchema<ColumnDefinition>> {
  return object(
    fromEntries(
      entries(table)
        .filter(([, column]) => {
          if (column.type.generatedAlwaysExpression)
            return options.throwOnForbiddenColumns;
          return true;
        })
        .map(([name, column]) => {
          if (column.type.generatedAlwaysExpression)
            return [name, never().optional()];
          if (column.type.defaultExpression) {
            return [
              name,
              column.type.isNotNull
                ? column.type.zodSchema.optional()
                : column.type.zodSchema.nullable().optional(),
            ];
          }
          return [
            name,
            column.type.isNotNull
              ? column.type.zodSchema
              : column.type.zodSchema.nullable().optional(),
          ];
        }),
    ),
  ) as unknown as ZodObject<InsertSchema<ColumnDefinition>>;
}

export function updateSchema<
  TableName extends PgIdentifier,
  ColumnDefinition extends PgTableColumnDefinition,
>(
  table: PgTableDefinition<TableName, ColumnDefinition>,
  options: SchemaGenerationOptions = { throwOnForbiddenColumns: true },
): ZodObject<UpdateSchema<ColumnDefinition>> {
  return object(
    fromEntries(
      entries(table)
        .filter(([, column]) => {
          if (
            column.type.generatedAlwaysExpression !== undefined ||
            column.type.isImmutable
          )
            return options.throwOnForbiddenColumns;
          return true;
        })
        .map(([name, column]) => {
          if (
            column.type.generatedAlwaysExpression !== undefined ||
            column.type.isImmutable
          )
            return [name, never().optional()];
          return [
            name,
            column.type.isNotNull
              ? column.type.zodSchema
              : column.type.zodSchema.nullable(),
          ];
        }),
    ),
  ).partial() as unknown as ZodObject<UpdateSchema<ColumnDefinition>>;
}
