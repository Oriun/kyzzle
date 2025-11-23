import { never, object, ZodObject } from "zod";
import type {
  InsertShema,
  PgIdentifier,
  PgTableColumnDefinition,
  PgTableDefinition,
  SchemaGenerationOptions,
  SelectShema,
  UpdateShema,
} from "./types";
import { entries, fromEntries } from "./utils";

export function selectSchema<
  TableName extends PgIdentifier,
  ColumnDefinition extends PgTableColumnDefinition,
>(
  table: PgTableDefinition<TableName, ColumnDefinition>,
): ZodObject<SelectShema<ColumnDefinition>> {
  return object(
    fromEntries(
      entries(table).map(([name, column]) => {
        return [name, column.type.zodSchema];
      }),
    ),
  );
}

export function insertSchema<
  TableName extends PgIdentifier,
  ColumnDefinition extends PgTableColumnDefinition,
>(
  table: PgTableDefinition<TableName, ColumnDefinition>,
  options: SchemaGenerationOptions = { throwOnForbiddenColumns: true },
): ZodObject<InsertShema<ColumnDefinition>> {
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
          if (column.type.isNotNull && !column.type.defaultExpression)
            return [name, column.type.zodSchema];
          return [name, column.type.zodSchema.optional()];
        }),
    ),
  ) as unknown as ZodObject<InsertShema<ColumnDefinition>>;
}

export function updateSchema<
  TableName extends PgIdentifier,
  ColumnDefinition extends PgTableColumnDefinition,
>(
  table: PgTableDefinition<TableName, ColumnDefinition>,
  options: SchemaGenerationOptions = { throwOnForbiddenColumns: true },
): ZodObject<UpdateShema<ColumnDefinition>> {
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
          return [name, column.type.zodSchema];
        }),
    ),
  ).partial() as unknown as ZodObject<UpdateShema<ColumnDefinition>>;
}
