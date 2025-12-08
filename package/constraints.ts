import type {
  PgForeignKeyAction,
  PgIdentifier,
  PgTableConstraint,
  SQLExpression,
  TableColumn,
  TableRefinement,
} from "./types";
import { flatTemplateStringArray, isValidIdentifier } from "./utils";

type ConstraintPredicate = (row: Record<string, unknown>) => boolean;

class UniqueConstraint implements PgTableConstraint {
  public readonly kind = "unique";
  public columns: string[] = [];
  constructor(public readonly name?: string) {}
  on<T extends PgIdentifier>(
    first: TableColumn<T, string, string, any, any>,
    ...rest: TableColumn<T, string, string, any, any>[]
  ) {
    if (this.columns.length)
      throw new Error("Unique constraint already defined");
    this.columns = [first, ...rest].map((col) => col.name);
    return this;
  }
}

class PrimaryKeyConstraint implements PgTableConstraint {
  public readonly kind = "primary_key";
  public columns: string[] = [];
  constructor(public readonly name?: string) {}
  on<T extends PgIdentifier>(
    first: TableColumn<T, string, string, any, any>,
    ...rest: TableColumn<T, string, string, any, any>[]
  ) {
    if (this.columns.length)
      throw new Error("Primary key constraint already defined");
    this.columns = [first, ...rest].map((col) => col.name);
    return this;
  }
}

class CheckConstraint implements PgTableConstraint {
  public readonly kind = "check";
  constructor(
    public readonly name: string | undefined,
    public readonly expression: SQLExpression,
    public readonly predicate?: ConstraintPredicate,
  ) {}
}

class ForeignKeyConstraint implements PgTableConstraint {
  public readonly kind = "foreign_key";
  public columns: string[] = [];
  public references: {
    table: PgIdentifier;
    columns: string[];
    onDelete?: PgForeignKeyAction;
    onUpdate?: PgForeignKeyAction;
  } = { table: "" as PgIdentifier, columns: [] };
  constructor(public readonly name?: string) {}
  on<T extends PgIdentifier>(
    first: TableColumn<T, string, string, any, any>,
    ...rest: TableColumn<T, string, string, any, any>[]
  ) {
    if (this.columns.length)
      throw new Error("Foreign key columns already defined");
    this.columns = [first, ...rest].map((col) => col.name);
    return this;
  }
  references(
    table: PgIdentifier,
    columns: (string | TableColumn<any, string, string, any, any>)[],
    options: {
      onDelete?: PgForeignKeyAction;
      onUpdate?: PgForeignKeyAction;
    } = {},
  ) {
    this.references = {
      table,
      columns: columns.map((col) =>
        typeof col === "string"
          ? col
          : (col as TableColumn<any, string, string, any, any>).name,
      ),
      onDelete: options.onDelete,
      onUpdate: options.onUpdate,
    } as (typeof this)["references"];
    return this;
  }
}

export const unique = (name?: string) => new UniqueConstraint(name);
export const primaryKey = (name?: string) => new PrimaryKeyConstraint(name);
export const check = (
  name: string | undefined,
  expression: SQLExpression,
  predicate?: ConstraintPredicate,
) => new CheckConstraint(name, expression, predicate);
export const foreignKey = (name?: string) => new ForeignKeyConstraint(name);

export function normalizeConstraints(
  tableName: PgIdentifier,
  tableColumns: { name: string }[],
  constraints: PgTableConstraint[],
): PgTableConstraint[] {
  return constraints.map((constraint) => {
    switch (constraint.kind) {
      case "unique":
      case "primary_key":
        if (!constraint.columns.length)
          throw new Error(
            `Constraint ${constraint.name ?? constraint.kind} on ${tableName} has no columns`,
          );
        validateColumns(tableName, tableColumns, constraint.columns);
        return constraint;
      case "check":
        if (!constraint.expression)
          throw new Error(
            `Check constraint ${constraint.name ?? ""} on ${tableName} is missing expression`,
          );
        return constraint;
      case "foreign_key":
        if (!constraint.columns.length)
          throw new Error(
            `Foreign key ${constraint.name ?? ""} on ${tableName} has no columns`,
          );
        validateColumns(tableName, tableColumns, constraint.columns);
        if (
          !constraint.references?.table ||
          !constraint.references.columns?.length ||
          !isValidIdentifier(constraint.references.table)
        )
          throw new Error(
            `Foreign key ${constraint.name ?? ""} on ${tableName} has invalid references`,
          );
        if (constraint.references.columns.length !== constraint.columns.length)
          throw new Error(
            `Foreign key ${constraint.name ?? ""} on ${tableName} must reference the same number of columns`,
          );
        return constraint;
      default:
        return constraint;
    }
  });
}

export function constraintRefinement(
  constraints: PgTableConstraint[],
): TableRefinement {
  return (value, ctx) => {
    if (!constraints.length) return;
    for (const constraint of constraints) {
      if (constraint.kind === "check" && constraint.predicate) {
        let result = true;
        try {
          result = constraint.predicate(value);
        } catch (error: any) {
          result = false;
        }
        if (!result)
          ctx.addIssue({
            code: "custom",
            message: `Check constraint ${constraint.name ?? ""} failed`,
          });
      }
      if (constraint.kind === "foreign_key") {
        const columns = constraint.columns;
        const present = columns.filter(
          (column) => (value as Record<string, unknown>)[column] !== undefined,
        );
        const missing = columns.filter(
          (column) => (value as Record<string, unknown>)[column] === undefined,
        );
        if (present.length > 0 && missing.length > 0)
          ctx.addIssue({
            code: "custom",
            path: [missing[0]],
            message: `Foreign key ${constraint.name ?? ""} requires columns [${columns.join(", ")}] together`,
          });
      }
    }
  };
}

export function renderConstraintExpression(expression: SQLExpression): string {
  if (Array.isArray(expression))
    return flatTemplateStringArray(expression as TemplateStringsArray);
  return typeof expression === "object" && !(expression instanceof Date)
    ? JSON.stringify(expression)
    : `${expression}`;
}

function validateColumns(
  tableName: PgIdentifier,
  tableColumns: { name: string }[],
  columns: string[],
) {
  const availableColumns = new Set(tableColumns.map((col) => col.name));
  for (const column of columns)
    if (!availableColumns.has(column))
      throw new Error(
        `Constraint references unknown column ${column} on table ${tableName}`,
      );
}
