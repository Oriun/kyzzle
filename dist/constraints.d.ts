import type { PgForeignKeyAction, PgIdentifier, PgIndexDefinition, PgTableConstraint, PgTriggerDefinition, SQLExpression, TableColumn, TableRefinement } from "./types";
type ConstraintPredicate = (row: Record<string, unknown>) => boolean;
declare class UniqueConstraint {
    readonly name?: string | undefined;
    readonly kind = "unique";
    columns: string[];
    constructor(name?: string | undefined);
    on<T extends PgIdentifier>(first: TableColumn<T, string, string, any, any>, ...rest: TableColumn<T, string, string, any, any>[]): this;
}
declare class PrimaryKeyConstraint {
    readonly name?: string | undefined;
    readonly kind = "primary_key";
    columns: string[];
    constructor(name?: string | undefined);
    on<T extends PgIdentifier>(first: TableColumn<T, string, string, any, any>, ...rest: TableColumn<T, string, string, any, any>[]): this;
}
declare class CheckConstraint {
    readonly name: string | undefined;
    readonly expression: SQLExpression;
    readonly predicate?: ConstraintPredicate | undefined;
    readonly kind = "check";
    constructor(name: string | undefined, expression: SQLExpression, predicate?: ConstraintPredicate | undefined);
}
declare class ForeignKeyConstraint {
    readonly name?: string | undefined;
    readonly kind = "foreign_key";
    columns: string[];
    private _references;
    constructor(name?: string | undefined);
    on<T extends PgIdentifier>(first: TableColumn<T, string, string, any, any>, ...rest: TableColumn<T, string, string, any, any>[]): this;
    setReferences(table: PgIdentifier, columns: (string | TableColumn<any, string, string, any, any>)[], options?: {
        onDelete?: PgForeignKeyAction;
        onUpdate?: PgForeignKeyAction;
    }): this;
    get references(): {
        table: PgIdentifier;
        columns: string[];
        onDelete?: PgForeignKeyAction;
        onUpdate?: PgForeignKeyAction;
    };
}
declare class IndexDefinition {
    readonly name?: string | undefined;
    readonly kind = "index";
    columns: string[];
    unique?: boolean;
    using?: string;
    include?: string[];
    where?: SQLExpression;
    constructor(name?: string | undefined, options?: Omit<PgIndexDefinition, "kind" | "name" | "columns">);
    on<T extends PgIdentifier>(first: TableColumn<T, string, string, any, any>, ...rest: TableColumn<T, string, string, any, any>[]): this;
    includeColumns(...columns: (string | TableColumn<any, string, string, any, any>)[]): this;
}
export declare const unique: (name?: string) => UniqueConstraint;
export declare const primaryKey: (name?: string) => PrimaryKeyConstraint;
export declare const check: (name: string | undefined, expression: SQLExpression, predicate?: ConstraintPredicate) => CheckConstraint;
export declare const foreignKey: (name?: string) => ForeignKeyConstraint;
export declare const index: (name?: string, options?: Omit<PgIndexDefinition, "kind" | "name" | "columns">) => IndexDefinition;
type TriggerOptions = {
    name: string;
    when: PgTriggerDefinition["timing"];
    action: PgTriggerDefinition["events"];
    execute: string;
    with?: PgTriggerDefinition["function"]["args"];
    condition?: SQLExpression;
    forEach?: PgTriggerDefinition["forEach"];
} | {
    name: string;
    timing: PgTriggerDefinition["timing"];
    events: PgTriggerDefinition["events"];
    execute: string;
    with?: PgTriggerDefinition["function"]["args"];
    condition?: SQLExpression;
    forEach?: PgTriggerDefinition["forEach"];
};
export declare const trigger: (options: TriggerOptions) => PgTriggerDefinition;
export declare const registerTableConstraints: (table: object, constraints: PgTableConstraint[]) => void;
export declare const getTableConstraints: (table: object) => PgTableConstraint[] | undefined;
export declare const tableRefinement: (table: object) => TableRefinement | undefined;
export declare const registerTableIndexes: (table: object, indexes: PgIndexDefinition[]) => WeakMap<object, PgIndexDefinition[]>;
export declare const getTableIndexes: (table: object) => PgIndexDefinition[] | undefined;
export declare const registerTableTriggers: (table: object, triggers: PgTriggerDefinition[]) => WeakMap<object, PgTriggerDefinition[]>;
export declare const getTableTriggers: (table: object) => PgTriggerDefinition[] | undefined;
export declare function normalizeConstraints(tableName: PgIdentifier, tableColumns: {
    name: string;
}[], constraints: (PgTableConstraint | PgIndexDefinition | PgTriggerDefinition)[]): PgTableConstraint[];
export declare function constraintRefinement(constraints: PgTableConstraint[]): TableRefinement;
export declare function renderConstraintExpression(expression: SQLExpression): string;
export {};
