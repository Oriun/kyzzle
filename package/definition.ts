import { DataType } from "./data_types/base";
import { UserDefined } from "./data_types/pg_types";
import { custom } from "./data_types/helpers";
import type {
  PgCompositeTypeDefinition,
  PgTableColumnDefinition,
  PgIdentifier,
  PgTableConstraintsCallback,
  PgTableDefinition,
  PgTable,
  SQLExpression,
  PgIndexDefinition,
  PgTriggerDefinition,
} from "./types";
import {
  entries,
  fromEntries,
  hasItems,
  isObject,
  isValidIdentifier,
} from "./utils";
import { enum as _enum, object, type output, type ZodType } from "zod";
import { selectSchema } from "./schema";
import {
  normalizeConstraints,
  registerTableConstraints,
  registerTableIndexes,
  registerTableTriggers,
} from "./constraints";

type CompositeDefaultInput<FieldsDefinition extends PgTableColumnDefinition> =
  Partial<{
    [key in keyof FieldsDefinition & string]: output<
      FieldsDefinition[key]["zodSchema"]
    >;
  }>;

class CompositeUserDefined<
  Name extends string,
  CompositeName extends PgIdentifier,
  Schema extends ZodType,
  FieldsDefinition extends PgTableColumnDefinition,
> extends UserDefined<
  Name,
  CompositeName,
  Schema,
  {},
  CompositeDefaultInput<FieldsDefinition> | SQLExpression
> {
  public readonly _defaultReturn!: CompositeUserDefined<
    Name,
    CompositeName,
    Schema,
    FieldsDefinition
  > &
    DataType<
      Name,
      CompositeName,
      Schema,
      { hasDefault: true },
      CompositeDefaultInput<FieldsDefinition> | SQLExpression
    > &
    Omit<typeof this, keyof DataType<Name, CompositeName, Schema, any, any>>;
  constructor(
    name: Name,
    parameters: { type: CompositeName; schema: Schema },
    public readonly meta: {
      compositeTypeName: CompositeName;
      defaultInputSchema: ZodType<Record<string, unknown>>;
    },
  ) {
    super(name, parameters);
  }

  default(
    expression: CompositeDefaultInput<FieldsDefinition> | SQLExpression,
    ...args: any[]
  ): typeof this._defaultReturn {
    const { defaultInputSchema, compositeTypeName } = this.meta;
    const isPlainObject =
      isObject(expression) &&
      !Array.isArray(expression) &&
      Object.getPrototypeOf(expression) === Object.prototype;

    if (isPlainObject) {
      const parsed = defaultInputSchema.safeParse(expression);
      if (!parsed.success)
        throw new Error(
          `Invalid default value for composite type ${compositeTypeName}: ${parsed.error.message}`,
        );
      const normalized = parsed.data;

      const jsonPayload = JSON.stringify(normalized).replace(/'/g, "''");
      this.defaultExpression = `jsonb_populate_record(NULL::${compositeTypeName}, '${jsonPayload}'::jsonb)`;
      return this as unknown as typeof this._defaultReturn;
    }

    return super.default(
      expression as SQLExpression,
      ...args,
    ) as unknown as typeof this._defaultReturn;
  }
}
export function pgTable<
  TableName extends PgIdentifier,
  ColumnDefinition extends PgTableColumnDefinition,
>(
  tableName: TableName,
  definition: ColumnDefinition,
  _constraints?: PgTableConstraintsCallback<TableName, ColumnDefinition>,
): PgTable<TableName, ColumnDefinition> {
  if (!isValidIdentifier(tableName))
    throw new Error(
      `Invalid table name: ${tableName}. Please provide full reference like "public.users".`,
    );

  const columnsDefinition = entries(definition);
 
  if (!columnsDefinition.length)
    throw new Error(`Table ${tableName} has no columns`);
  for (const [key, value] of columnsDefinition) {
    if (!(value instanceof DataType))
      throw new Error(
        `Invalid column ${key}. Definition does not involve a DataType, example: "text(...)" or "integer(...)".`,
      );
    value.setNameIfEmpty(key as string);
  }
 
  const table = fromEntries(
    columnsDefinition.map(([key, value]) => {
      const columnName: string = value.name ?? (key as string);
      const col = {
        name: columnName,
        table: tableName,
        type: value,
      } as const;
      return [
        key,
        Object.defineProperty(col, "__brand", {
          value: "TableColumn",
          writable: false,
          enumerable: false,
        }),
      ];
    }),
  ) as unknown as PgTableDefinition<TableName, ColumnDefinition>;

  const rawDefinitions =
    _constraints?.(table as PgTableDefinition<TableName, ColumnDefinition>) ??
    [];
  const allDefinitions = Array.isArray(rawDefinitions) ? rawDefinitions : [];
  const constraints = normalizeConstraints(
    tableName,
    Object.values(table).map((col) => ({ name: col.name })),
    allDefinitions,
  );
  const extras = allDefinitions;
  const indexes = extras.filter(
    (extra): extra is PgIndexDefinition => (extra as any).kind === "index",
  );
  const triggers = extras.filter(
    (extra): extra is PgTriggerDefinition => (extra as any).kind === "trigger",
  );
  registerTableConstraints(table, constraints);
  registerTableIndexes(table, indexes);
  registerTableTriggers(table, triggers);
  return Object.defineProperties(table, {
    __brand: {
      value: "Table",
      writable: false,
      enumerable: false,
    },
  }) as PgTable<TableName, ColumnDefinition>;
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

  return Object.defineProperty(
    Object.assign(custom(enumName, _enum(values)), {
      enumName,
      values,
    }),
    "__brand",
    {
      value: "EnumType",
      writable: false,
      enumerable: false,
    },
  );
}

export function pgCompositeType<
  CompositeTypeName extends PgIdentifier,
  FieldsDefinition extends PgTableColumnDefinition,
>(compositeTypeName: CompositeTypeName, definition: FieldsDefinition) {
  if (!isValidIdentifier(compositeTypeName))
    throw new Error(
      `Invalid type name: ${compositeTypeName}. Please provide full reference like "public.users".`,
    );

  const fieldsDefinition = entries(definition);
 
  if (!fieldsDefinition.length)
    throw new Error(`Composite type ${compositeTypeName} has no fields`);
  for (const [key, value] of fieldsDefinition) {
    if (!(value instanceof DataType))
      throw new Error(
        `Invalid field ${key}. Definition does not involve a DataType, example: "text(...)" or "integer(...)".`,
      );
    value.setNameIfEmpty(key as string);
  }
 
  const fields = fromEntries(
    fieldsDefinition.map(([key, value]) => {
      const fieldName: string = value.name ?? (key as string);
      const field = {
        name: fieldName,
        compositeType: compositeTypeName,
        type: value,
      } as const;
      return [
        key,
        Object.defineProperty(field, "__brand", {
          value: "CompositeTypeField",
          writable: false,
          enumerable: false,
        }),
      ];
    }),
  ) as unknown as PgCompositeTypeDefinition<CompositeTypeName, FieldsDefinition>;


  const schema = selectSchema(fields);

  const defaultInputShape: Record<string, ReturnType<ZodType["optional"]>> = {};
  for (const [key, value] of fieldsDefinition) {
    const optionalSchema = value.zodSchema.optional();
    const fieldName: string = value.name ?? (key as string);
    defaultInputShape[key] = optionalSchema;
    if (fieldName !== key) defaultInputShape[fieldName] = optionalSchema;
  }
  const defaultInputSchema = object(defaultInputShape)
    .strict()
    .transform((val) => {
      const normalized: Record<string, unknown> = {};
      for (const [key, value] of fieldsDefinition) {
        const fieldName: string = value.name ?? (key as string);
        const fromCode = (val as Record<string, unknown>)[key];
        const fromDb = (val as Record<string, unknown>)[fieldName];
        const chosen =
          fromCode !== undefined
            ? fromCode
            : fromDb !== undefined
              ? fromDb
              : undefined;
        if (chosen !== undefined) normalized[fieldName] = chosen;
      }
      return normalized;
    });

  const composite = (<T extends string>(name: T) =>
    new CompositeUserDefined<
      T,
      CompositeTypeName,
      typeof schema,
      FieldsDefinition
    >(
      name,
      { type: compositeTypeName, schema },
      {
        compositeTypeName,
        defaultInputSchema,
      },
    )) as <T extends string>(
    name: T,
  ) => CompositeUserDefined<
    T,
    CompositeTypeName,
    typeof schema,
    FieldsDefinition
  >;

  return Object.defineProperty(
    Object.assign(composite, {
      ...fields,
      fields,
      compositeTypeName,
    }),
    "__brand",
    {
      value: "CompositeType",
      writable: false,
      enumerable: false,
    },
  );
}

export function pgView() {}
export function pgMatView() {}
export function pgFunction() {}
