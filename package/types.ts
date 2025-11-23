import type { output, ZodOptional, ZodType } from "zod";
import type { DataType } from "./data_types";
import type { ColumnType } from "kysely";
/**
 * Represents a PostgreSQL identifier in the format "schema.table".
 */
export type PgIdentifier = `${string}.${string}`;

export type PgTableColumnDefinition = Record<string, DataType<string, string>>;
export type PgTableConstraints = unknown;
export type PgTableDefinition<
  TableName extends PgIdentifier,
  ColumnDefinition extends PgTableColumnDefinition,
> = {
  [key in keyof ColumnDefinition & string]: TableColumn<
    TableName,
    ColumnDefinition[key]["name"],
    ColumnDefinition[key]["pgType"],
    ColumnDefinition[key]["zodSchema"],
    ColumnDefinition[key] extends DataType<any, any, any, infer Parameters>
      ? Parameters
      : {}
  >;
};

export type SelectShema<ColumnDefinition extends PgTableColumnDefinition> = {
  [key in keyof ColumnDefinition & string]: ColumnDefinition[key]["zodSchema"];
};
export type InsertShema<ColumnDefinition extends PgTableColumnDefinition> =
  StripImpossibleProps<{
    [key in keyof ColumnDefinition &
      string]: ColumnDefinition[key] extends DataType<any, any, any, infer T>
      ? T extends { isGeneratedAlways: true }
        ? never
        : ColumnDefinition[key]["zodSchema"]
      : never;
  }>;
export type UpdateShema<ColumnDefinition extends PgTableColumnDefinition> =
  StripImpossibleProps<{
    [key in keyof ColumnDefinition &
      string]: ColumnDefinition[key] extends DataType<any, any, any, infer T>
      ? T extends { isImmutable: true } | { isGeneratedAlways: true }
        ? never
        : ColumnDefinition[key]["zodSchema"] extends ZodOptional<ZodType>
          ? ColumnDefinition[key]["zodSchema"]
          : ZodOptional<ColumnDefinition[key]["zodSchema"]>
      : never;
  }>;

export type PgTable<
  TableName extends PgIdentifier,
  ColumnDefinition extends PgTableColumnDefinition,
> = PgTableDefinition<TableName, ColumnDefinition> & {};
export type PgTableConstraintsCallback<
  TableName extends PgIdentifier,
  ColumnDefinition extends PgTableColumnDefinition,
> = (
  table: PgTableDefinition<TableName, ColumnDefinition>,
) => PgTableConstraints[];

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
  | "uuid";

export type PgKnownKeywords =
  | "CURRENT_TIMESTAMP"
  | "NOW()"
  | "uuid_generate_v4()"
  | "NULL";
export type SQLExpression =
  | PgKnownKeywords
  | (string & {})
  | number
  | boolean
  | TemplateStringsArray;

export type TableColumn<
  Table extends PgIdentifier,
  Name extends string,
  PgType extends PgKnownTypes | (string & {}),
  ZodSchemaType extends ZodType,
  ParametersType extends {},
> = {
  table: Table;
  name: Name;
  type: DataType<Name, PgType, ZodSchemaType, ParametersType>;
  __brand?: "TableColumn";
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

export type ToColumnType<Type extends DataType<any, any, any>> =
  Type extends DataType<any, any, infer ZodSchemaType, infer Parameters>
    ? ColumnType<
        output<ZodSchemaType>,
        Parameters extends { isGeneratedAlways: true }
          ? never
          : Parameters extends { isNotNull: true }
            ? Parameters extends { hasDefault: true }
              ? output<ZodSchemaType> | null | undefined
              : output<ZodSchemaType>
            : output<ZodSchemaType> | null | undefined,
        Parameters extends { isImmutable: true } | { isGeneratedAlways: true }
          ? { _: "can't update this field" }
          : output<ZodSchemaType>
      >
    : never;
export type ToTableType<Table extends PgTableDefinition<any, any>> = {
  [column in keyof Table]: ToColumnType<Table[column]["type"]>;
};

export type KyselyTables<
  Tables extends Record<string, PgTableDefinition<any, any>>,
> = MergeUnionOptional<
  {
    [TableName in keyof Tables]: {
      [name in Tables[TableName][keyof Tables[TableName]]["table"]]: {
        [column in keyof Tables[TableName]]: ToColumnType<
          Tables[TableName][column]["type"]
        >;
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
