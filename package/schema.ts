import { never, object, ZodObject, ZodType } from "zod";
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
        let schema: ZodType = column.type.zodSchema;

        if (column.type.isArray) schema = schema.array();

        if (!column.type.isNotNull && !isNullable(column.type.zodSchema))
          schema = schema.nullable();

        return [name, schema];
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
          let schema: ZodType = column.type.zodSchema;

          if (column.type.isArray) schema = schema.array();

          if (!column.type.isNotNull) schema = schema.nullable();

          if (column.type.defaultExpression || !column.type.isNotNull)
            schema = schema.optional();

          if (column.type.generatedAlwaysExpression)
            schema = never().optional();

          return [name, schema];
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
          let schema: ZodType = column.type.zodSchema;

          if (column.type.isArray) schema = schema.array();

          if (!column.type.isNotNull) schema = schema.nullable();

          if (
            column.type.generatedAlwaysExpression !== undefined ||
            column.type.isImmutable
          )
            schema = never().optional();

          return [name, schema];
        }),
    ),
  ).partial() as unknown as ZodObject<UpdateSchema<ColumnDefinition>>;
}
