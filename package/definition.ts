import { custom, DataType } from "./data_types";
import type {
  PgTableColumnDefinition,
  PgIdentifier,
  PgTableConstraintsCallback,
  PgTableDefinition,
} from "./types";
import { entries, fromEntries, hasItems, isValidIdentifier } from "./utils";
import { enum as _enum } from "zod";

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
  return {
    ...table,
    __brand: "Table",
  };
}

export function pgEnumType<
  EnumName extends PgIdentifier,
  Values extends string,
>(enumName: EnumName, definition: Record<string, Values> | Values[]) {
  if (!isValidIdentifier(enumName))
    throw new Error(
      `Invalid table name: ${enumName}. Please provide full reference like "public.users_type".`,
    );
  const values = Array.isArray(definition)
    ? definition
    : Object.values(definition);

  if (!hasItems(values)) throw new Error(`Enum ${enumName} has no values`);

  return Object.assign(custom(enumName, _enum(values).nullable()), {
    enumName,
    values,
    __brand: "EnumType",
  });
}

export function pgCompositeType<
  CompositeTypeName extends PgIdentifier,
  FieldsDefinition extends PgTableColumnDefinition,
>(compositeTypeName: CompositeTypeName, definition: FieldsDefinition) {
  if (!isValidIdentifier(compositeTypeName))
    throw new Error(
      `Invalid table name: ${compositeTypeName}. Please provide full reference like "public.users".`,
    );

  const fieldsDefinition = entries(definition);

  if (!fieldsDefinition.length)
    throw new Error(`Table ${compositeTypeName} has no columns`);
  for (const [key, value] of fieldsDefinition)
    if (!(value instanceof DataType))
      throw new Error(
        `Invalid column ${key}. Definition does not involve a DataType, example: "text(...)" or "integer(...)".`,
      );

  throw "Not implemented";
}

export function pgType() {}
export function pgView() {}
export function pgMatView() {}
export function pgFunction() {}
export function pgTrigger() {}
