import { ZodObject } from "zod";
import type { InsertSchema, PgCompositeTypeDefinition, PgIdentifier, PgTableColumnDefinition, PgTableDefinition, SchemaGenerationOptions, SelectSchema, UpdateSchema } from "./types";
export declare function selectSchema<TableName extends PgIdentifier, ColumnDefinition extends PgTableColumnDefinition>(table: PgTableDefinition<TableName, ColumnDefinition> | PgCompositeTypeDefinition<TableName, ColumnDefinition>): ZodObject<SelectSchema<ColumnDefinition>>;
export declare function insertSchema<TableName extends PgIdentifier, ColumnDefinition extends PgTableColumnDefinition>(table: PgTableDefinition<TableName, ColumnDefinition>, options?: SchemaGenerationOptions): ZodObject<InsertSchema<ColumnDefinition>>;
export declare function updateSchema<TableName extends PgIdentifier, ColumnDefinition extends PgTableColumnDefinition>(table: PgTableDefinition<TableName, ColumnDefinition>, options?: SchemaGenerationOptions): ZodObject<UpdateSchema<ColumnDefinition>>;
