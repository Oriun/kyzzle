import type { PgIdentifier } from "./types";
export declare function listSchemaItems(schemas: string[], executor: {
    query(q: string): Promise<{
        rows: any[];
    }>;
}): Promise<{
    type: string;
    name: string;
    nspname: string;
}[]>;
export declare function listTableItems(table: PgIdentifier, executor: {
    query(q: string, params: string[]): Promise<{
        rows: any[];
    }>;
}): Promise<{
    constraints: {
        table_schema: string;
        table_name: string;
        delete_rule: "NO ACTION" | "CASCADE" | "SET NULL" | "SET DEFAULT" | null;
        update_rule: "NO ACTION" | "CASCADE" | "SET NULL" | "SET DEFAULT" | null;
        column_names: string[] | null;
        is_deferrable: boolean;
        constraint_name: string;
        constraint_type: "UNIQUE" | "PRIMARY KEY" | "CHECK" | "FOREIGN KEY";
        nulls_distinct?: unknown;
    }[];
    table: {
        table_schema: string;
        table_name: string;
        owner: string;
    };
    columns: {
        table_schema: string;
        table_name: string;
        column_name: string;
        column_type: string;
        is_nullable: boolean;
        is_generated: boolean;
        is_updatable: boolean;
        numeric_scale: number | null;
        column_default: string | null;
        identity_cycle: boolean;
        ordinal_position: number | null;
        numeric_precision: number | null;
        is_self_referencing: boolean;
        generation_expression: string | null;
        character_octet_length: number | null;
    }[];
    indexes: {
        table_schema: string;
        table_name: string;
        is_unique: boolean;
        index_name: string;
        is_primary: boolean;
        is_exclusion: boolean;
        index_definition: string;
        is_nulls_not_distinct: boolean;
    }[];
    triggers: {
        name: string;
        table_schema: string;
        table_name: string;
        enabled: boolean;
        procedure: string;
    }[];
} | undefined>;
export declare function listCompositeTypeItems(type: PgIdentifier, executor: {
    query(q: string, params: string[]): Promise<{
        rows: any[];
    }>;
}): Promise<{
    constraints: import("zod").objectOutputType<{}, import("zod").ZodTypeAny, "passthrough">[] | null;
    fields: {
        name: string;
        default: string | null;
        ordinal_position: number;
        field_type: string;
        is_not_null: boolean;
    }[];
    type_schema: string;
    type_name: string;
}[]>;
export declare function listEnumTypeItems(type: PgIdentifier, executor: {
    query(q: string, params: string[]): Promise<{
        rows: any[];
    }>;
}): Promise<{
    ordinal_position: number;
    type_schema: string;
    type_name: string;
    enum_value: string;
}[]>;
export declare function getViewQuery(view: PgIdentifier, executor: {
    query(q: string, params: string[]): Promise<{
        rows: any[];
    }>;
}): Promise<{
    definition: string;
} | undefined>;
