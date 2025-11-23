import { DataType } from "./data_types";
import type {
  PgTableColumnDefinition,
  PgIdentifier,
  PgTableConstraintsCallback,
  PgTableDefinition,
} from "./types";
import { entries, fromEntries, isValidIdentifier } from "./utils";

export function pgTable<
  TableName extends PgIdentifier,
  ColumnDefinition extends PgTableColumnDefinition,
>(
  tableName: TableName,
  definition: ColumnDefinition,
  _constraints?: PgTableConstraintsCallback<TableName, ColumnDefinition>,
): PgTableDefinition<TableName, ColumnDefinition> {
  if (!isValidIdentifier(tableName))
    throw new Error(
      `Invalid table name: ${tableName}. Please provide full reference like "public.users".`,
    );

  const columnsDefinition = entries(definition);

  if (!columnsDefinition.length)
    throw new Error(`Table ${tableName} has no columns`);
  for (const [key, value] of columnsDefinition)
    if (!(value instanceof DataType))
      throw new Error(
        `Invalid column ${key}. Definition does not involve a DataType, example: "text(...)" or "integer(...)".`,
      );

  const table = fromEntries(
    columnsDefinition.map(([key, value]) => [
      key,
      {
        name: value.name,
        table: tableName,
        type: value,
        __brand: "TableColumn",
      } as const,
    ]),
  );
  return table;
}

export function pgType() {}
export function pgView() {}
export function pgMatView() {}
export function pgFunction() {}
export function pgTrigger() {}
