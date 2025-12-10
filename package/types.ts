import type {
  RefinementCtx,
  output,
  ZodArray,
  ZodNullable,
  ZodOptional,
  ZodType,
} from "zod";
import type { DataType } from "./data_types/base";
import type { ColumnType } from "kysely";
/**
 * Represents a PostgreSQL identifier in the format "schema.table".
 */
export type PgIdentifier = `${string}.${string}`;

export type PgTableColumnDefinition = Record<string, DataType<string, string>>;
export type PgTableDefinition<
  TableName extends PgIdentifier,
  ColumnDefinition extends PgTableColumnDefinition,
> = {
  [key in keyof ColumnDefinition & string]: TableColumn<
    TableName,
    ColumnDefinition[key]["name"],
    ColumnDefinition[key]["pgType"],
    ColumnDefinition[key]["zodSchema"],
    ColumnDefinition[key] extends DataType<any, any, any, infer Parameters, any>
      ? Parameters
      : {}
  >;
};

export interface ParametersWithTypeImpact {
  isPrimaryKey?: boolean;
  isNotNull?: boolean;
  isImmutable?: boolean;
  hasDefault?: boolean;
  isGeneratedAlways?: boolean;
  isArray?: boolean;
  itemsAreNullable?: boolean;
  minItemsLength?: number;
  maxItemsLength?: number;
}

type ArrayWrapped<
  Schema extends ZodType,
  Parameters extends ParametersWithTypeImpact,
> = Parameters extends { isArray: true }
  ? Schema extends ZodArray<any>
    ? Schema
    : ZodArray<
        Parameters extends { itemsAreNullable: false }
          ? Schema
          : ZodNullable<Schema>
      >
  : Schema;

type NullableSchema<
  Schema extends ZodType,
  Parameters extends ParametersWithTypeImpact,
> = Parameters extends { isNotNull: true } ? Schema : ZodNullable<Schema>;

export type SelectSchema<ColumnDefinition extends PgTableColumnDefinition> = {
  [key in keyof ColumnDefinition &
    string]: ColumnDefinition[key] extends DataType<
    any,
    any,
    infer ZodSchema,
    infer Parameters,
    any
  >
    ? NullableSchema<ArrayWrapped<ZodSchema, Parameters>, Parameters>
    : never;
};
type InsertColumnSchema<
  ZodSchema extends ZodType,
  Parameters extends ParametersWithTypeImpact,
> = Parameters extends { isGeneratedAlways: true }
  ? never
  : Parameters extends { isNotNull: true }
    ? Parameters extends { hasDefault: true }
      ? ZodOptional<ArrayWrapped<ZodSchema, Parameters>>
      : ArrayWrapped<ZodSchema, Parameters>
    : ZodOptional<
        NullableSchema<ArrayWrapped<ZodSchema, Parameters>, Parameters>
      >;

export type InsertSchema<ColumnDefinition extends PgTableColumnDefinition> = {
  [key in keyof ColumnDefinition &
    string]: ColumnDefinition[key] extends DataType<
    any,
    any,
    infer ZodSchema,
    infer Parameters,
    any
  >
    ? InsertColumnSchema<ZodSchema, Parameters>
    : never;
};

type UpdateColumnSchema<
  ZodSchema extends ZodType,
  Parameters extends ParametersWithTypeImpact,
> = Parameters extends { isImmutable: true } | { isGeneratedAlways: true }
  ? never
  : Parameters extends { isNotNull: true }
    ? ZodOptional<ArrayWrapped<ZodSchema, Parameters>>
    : ZodOptional<
        NullableSchema<ArrayWrapped<ZodSchema, Parameters>, Parameters>
      >;

export type UpdateSchema<ColumnDefinition extends PgTableColumnDefinition> =
  StripImpossibleProps<{
    [key in keyof ColumnDefinition &
      string]: ColumnDefinition[key] extends DataType<
      any,
      any,
      infer ZodSchema,
      infer Parameters,
      any
    >
      ? UpdateColumnSchema<ZodSchema, Parameters>
      : never;
  }>;

export type PgTable<
  TableName extends PgIdentifier,
  ColumnDefinition extends PgTableColumnDefinition,
> = PgTableDefinition<TableName, ColumnDefinition>;
export type PgTableConstraintsCallback<
  TableName extends PgIdentifier,
  ColumnDefinition extends PgTableColumnDefinition,
> = (
  table: PgTableDefinition<TableName, ColumnDefinition>,
) =>
  | PgTableConstraint[]
  | (PgTableConstraint | PgIndexDefinition | PgTriggerDefinition)[];

export type PgKnownTypes =
  | "bigint"
  | "integer"
  | "boolean"
  | "char"
  | "varchar"
  | "text"
  | "json"
  | "jsonb"
  | "timestamp"
  | "timestamptz"
  | "date"
  | "numeric"
  | "double precision"
  | "serial"
  | "uuid"
  | "smallint";

export type PgKnownKeywords =
  | "CURRENT_DATE"
  | "CURRENT_TIME"
  | "CURRENT_TIMESTAMP"
  | "NOW()"
  | "uuid_generate_v4()"
  | "NULL";
export type SQLExpression =
  | PgKnownKeywords
  | (string & {})
  | Date
  | number
  | boolean
  | TemplateStringsArray;

export type PgForeignKeyAction =
  | "NO ACTION"
  | "CASCADE"
  | "SET NULL"
  | "SET DEFAULT"
  | "RESTRICT";

export type PgUniqueConstraint = {
  kind: "unique";
  name?: string;
  columns: string[];
};

export type PgPrimaryKeyConstraint = {
  kind: "primary_key";
  name?: string;
  columns: string[];
};

export type PgCheckConstraint = {
  kind: "check";
  name?: string;
  expression: SQLExpression;
  predicate?: (row: Record<string, unknown>) => boolean;
};

export type PgForeignKeyConstraint = {
  kind: "foreign_key";
  name?: string;
  columns: string[];
  references: {
    table: PgIdentifier;
    columns: string[];
    onDelete?: PgForeignKeyAction;
    onUpdate?: PgForeignKeyAction;
  };
};

export type PgIndexDefinition = {
  kind: "index";
  name?: string;
  columns: string[];
  unique?: boolean;
  using?: string;
  include?: string[];
  where?: SQLExpression;
};

export type PgTriggerDefinition = {
  kind: "trigger";
  name: string;
  timing: "BEFORE" | "AFTER" | "INSTEAD OF";
  events: ("INSERT" | "UPDATE" | "DELETE" | "TRUNCATE")[];
  forEach?: "ROW" | "STATEMENT" | (string & {});
  function: { schema?: string; name: string; args?: (string | number)[] };
  when?: SQLExpression;
};

export type PgTableConstraint =
  | PgUniqueConstraint
  | PgPrimaryKeyConstraint
  | PgCheckConstraint
  | PgForeignKeyConstraint;

export type TableRefinement = (
  value: Record<string, unknown>,
  ctx: RefinementCtx,
) => void;

export type TableColumn<
  Table extends PgIdentifier,
  Name extends string,
  PgType extends PgKnownTypes | (string & {}),
  ZodSchemaType extends ZodType,
  ParametersType extends {},
> = {
  table: Table;
  name: Name;
  type: DataType<Name, PgType, ZodSchemaType, ParametersType, any>;
  __brand?: "TableColumn";
};

export type CompositeTypeField<
  Composite extends PgIdentifier,
  Name extends string,
  PgType extends PgKnownTypes | (string & {}),
  ZodSchemaType extends ZodType,
  ParametersType extends {},
> = {
  compositeType: Composite;
  name: Name;
  type: DataType<Name, PgType, ZodSchemaType, ParametersType, any>;
  __brand?: "CompositeTypeField";
};

export type PgCompositeTypeDefinition<
  CompositeName extends PgIdentifier,
  FieldsDefinition extends PgTableColumnDefinition,
> = {
  [key in keyof FieldsDefinition & string]: CompositeTypeField<
    CompositeName,
    FieldsDefinition[key]["name"],
    FieldsDefinition[key]["pgType"],
    FieldsDefinition[key]["zodSchema"],
    FieldsDefinition[key] extends DataType<any, any, any, infer Parameters>
      ? Parameters
      : {}
  >;
};

export type StripImpossibleProps<T> = {
  [K in keyof T as [T[K]] extends [never]
    ? never
    : [Exclude<T[K], undefined>] extends [never]
      ? never
      : K]: T[K];
};

export type MergeUnionOptional<U> = {
  [K in U extends any ? keyof U : never]-?: U extends any
    ? K extends keyof U
      ? U[K]
      : never
    : never;
};

type SelectOutput<
  ZodSchema extends ZodType,
  Parameters extends ParametersWithTypeImpact,
> = output<NullableSchema<ArrayWrapped<ZodSchema, Parameters>, Parameters>>;

type InsertOutput<
  ZodSchema extends ZodType,
  Parameters extends ParametersWithTypeImpact,
> = Parameters extends { isGeneratedAlways: true }
  ? { _: "can't insert this field" } | undefined
  : Parameters extends { isNotNull: true }
    ? Parameters extends { hasDefault: true }
      ? output<ZodOptional<ArrayWrapped<ZodSchema, Parameters>>>
      : output<ArrayWrapped<ZodSchema, Parameters>>
    : output<
        ZodOptional<
          NullableSchema<ArrayWrapped<ZodSchema, Parameters>, Parameters>
        >
      >;

type UpdateOutput<
  ZodSchema extends ZodType,
  Parameters extends ParametersWithTypeImpact,
> = Parameters extends { isImmutable: true } | { isGeneratedAlways: true }
  ? { _: "can't update this field" } | undefined
  : Parameters extends { isNotNull: true }
    ? output<ZodOptional<ArrayWrapped<ZodSchema, Parameters>>>
    : output<
        ZodOptional<
          NullableSchema<ArrayWrapped<ZodSchema, Parameters>, Parameters>
        >
      >;

export type ToColumnType<Type extends DataType<any, any, any>> =
  Type extends DataType<any, any, infer ZodSchemaType, infer Parameters, any>
    ? ColumnType<
        SelectOutput<ZodSchemaType, Parameters>,
        InsertOutput<ZodSchemaType, Parameters>,
        UpdateOutput<ZodSchemaType, Parameters>
      >
    : never;
type TableColumnKeys<Table> = {
  [K in keyof Table]: Table[K] extends TableColumn<any, any, any, any, any>
    ? K
    : never;
}[keyof Table];

export type ToTableType<Table> = {
  [column in TableColumnKeys<Table>]: Table[column] extends TableColumn<
    any,
    any,
    any,
    any,
    any
  >
    ? ToColumnType<Table[column]["type"]>
    : never;
};

export type KyselyTables<Tables extends Record<string, any>> =
  MergeUnionOptional<
    {
      [TableName in keyof Tables]: {
        [name in Tables[TableName][TableColumnKeys<
          Tables[TableName]
        >]["table"]]: {
          [column in TableColumnKeys<
            Tables[TableName]
          >]: Tables[TableName][column] extends TableColumn<
            any,
            any,
            any,
            any,
            any
          >
            ? ToColumnType<Tables[TableName][column]["type"]>
            : never;
        };
      };
    }[keyof Tables]
  >;

export interface SchemaGenerationOptions {
  /*
   * Throw an error if the schema receives a column that is forbidden for insert/updates.
   * In practice, the column will have a `z.never().optional()` schema
   * @default true
   */
  throwOnForbiddenColumns?: boolean;
}

export namespace Introspection {
  export interface PgColumnIntrospectionRow {
    table_schema: string;
    table_name: string;
    column_name: string;
    column_type: string;
    is_nullable: "YES" | "NO";
    is_generated: "NEVER" | "ALWAYS";
    is_updatable: "YES" | "NO";
    numeric_scale: number | null;
    column_default: string | null;
    identity_cycle: "YES" | "NO";
    ordinal_position: 1;
    numeric_precision: number | null;
    is_self_referencing: "YES" | "NO";
    generation_expression: string | null;
    character_octet_length: number | null;
    character_maximum_length: number | null;
  }
}
