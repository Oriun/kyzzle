import type { PgIndexDefinition, PgTableConstraint, PgTableDefinition, PgTriggerDefinition } from "./types";
export declare function serializeTable(table: PgTableDefinition<any, any> & {
    constraints?: PgTableConstraint[];
}): string;
export declare function serializeIndexes(table: PgTableDefinition<any, any>, indexes?: PgIndexDefinition[]): string[];
export declare function serializeTriggers(table: PgTableDefinition<any, any>, triggers?: PgTriggerDefinition[]): string[];
