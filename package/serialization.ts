import type {
  PgIdentifier,
  PgTableConstraint,
  PgTableDefinition,
  TableColumn,
} from "./types";
import { isTableColumn, sql } from "./utils";
import {
  getTableConstraints,
  getTableIndexes,
  getTableTriggers,
} from "./constraints";
import { renderConstraintExpression } from "./constraints";

export function serializeTable(
  table: PgTableDefinition<any, any> & { constraints?: PgTableConstraint[] },
): string {
  return serializeCreateTable(table);
}

export function serializeIndexes(
  table: PgTableDefinition<any, any>,
  indexes?: import("./types").PgIndexDefinition[],
): string[] {
  const tableIndexes = indexes ?? getTableIndexes(table) ?? [];
  const tableName = (
    Object.values(table)[0] as import("./types").TableColumn<
      PgIdentifier,
      string,
      any,
      any,
      any
    >
  )?.table;
  if (!tableName || !tableIndexes.length) return [];
  return tableIndexes.map((idx) =>
    [
      "CREATE",
      idx.unique ? "UNIQUE" : undefined,
      "INDEX",
      idx.name ? `"${idx.name}"` : "IF NOT EXISTS",
      "ON",
      serializeName(tableName),
      idx.using ? `USING ${idx.using}` : undefined,
      `(${idx.columns.map((col) => `"${col}"`).join(", ")})`,
      idx.include?.length
        ? `INCLUDE (${idx.include.map((col) => `"${col}"`).join(", ")})`
        : undefined,
      idx.where ? `WHERE ${renderConstraintExpression(idx.where)}` : undefined,
      ";",
    ]
      .filter(Boolean)
      .join(" "),
  );
}

export function serializeTriggers(
  table: PgTableDefinition<any, any>,
  triggers?: import("./types").PgTriggerDefinition[],
): string[] {
  const tableTriggers = triggers ?? getTableTriggers(table) ?? [];
  const tableName = (
    Object.values(table)[0] as import("./types").TableColumn<
      PgIdentifier,
      string,
      any,
      any,
      any
    >
  )?.table;
  if (!tableName || !tableTriggers.length) return [];
  return tableTriggers.map((trg) =>
    [
      "CREATE TRIGGER",
      `"${trg.name}"`,
      trg.timing,
      trg.events.join(" OR "),
      "ON",
      serializeName(tableName),
      "FOR EACH ROW",
      trg.when ? `WHEN (${renderConstraintExpression(trg.when)})` : undefined,
      "EXECUTE FUNCTION",
      `${trg.function.schema ? serializeName(trg.function.schema) + "." : ""}"${trg.function.name}"(${(
        trg.function.args ?? []
      )
        .map((arg) => (typeof arg === "number" ? arg : `'${arg}'`))
        .join(", ")})`,
      ";",
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function serializeCreateTable(
  table: PgTableDefinition<PgIdentifier, any> & {
    constraints?: PgTableConstraint[];
  },
  constraints: PgTableConstraint[] = [],
): string {
  const columns = Object.values(table).filter(
    (value): value is TableColumn<PgIdentifier, string, any, any, any> =>
      isTableColumn(value),
  );
  const tableName = columns[0]?.table;
  if (!tableName) throw new Error("Table name is required");
  const constraintDefinitions =
    constraints.length > 0 ? constraints : (getTableConstraints(table) ?? []);
  return sql`
    CREATE TABLE IF NOT EXISTS ${serializeName(tableName)} (
      ${[
        ...columns.map(
          (col) =>
            `"${col.name}" ${[
              col.type.computeType(),
              col.type.isPrimaryKey && "PRIMARY KEY",
              col.type.isNotNull && "NOT NULL",
              col.type.defaultExpression &&
                `DEFAULT ${col.type.defaultExpression}`,
              col.type.generatedAlwaysExpression &&
                `GENERATED ALWAYS AS (${col.type.generatedAlwaysExpression.toString().replace(/^\(/, "").replace(/\)$/, "")}) STORED`,
              col.type.isUnique && "UNIQUE",
            ]
              .filter(Boolean)
              .join(" ")}`,
        ),
        ...constraintDefinitions.map((constraint) =>
          serializeConstraint(constraint),
        ),
      ].join(",\n")}
    );
  `;
}

function serializeName(name: PgIdentifier | string): string {
  return name
    .split(".")
    .map((s) => `"${s}"`)
    .join(".");
}

function serializeConstraint(constraint: PgTableConstraint): string {
  const columns = (cols: string[]) =>
    `(${cols.map((col) => `"${col}"`).join(", ")})`;

  switch (constraint.kind) {
    case "unique":
      return [
        constraint.name && `CONSTRAINT "${constraint.name}"`,
        `UNIQUE ${columns(constraint.columns)}`,
      ]
        .filter(Boolean)
        .join(" ");
    case "primary_key":
      return [
        constraint.name && `CONSTRAINT "${constraint.name}"`,
        `PRIMARY KEY ${columns(constraint.columns)}`,
      ]
        .filter(Boolean)
        .join(" ");
    case "check":
      return [
        constraint.name && `CONSTRAINT "${constraint.name}"`,
        `CHECK (${renderConstraintExpression(constraint.expression)})`,
      ]
        .filter(Boolean)
        .join(" ");
    case "foreign_key": {
      const parts = [
        constraint.name && `CONSTRAINT "${constraint.name}"`,
        `FOREIGN KEY ${columns(constraint.columns)}`,
        `REFERENCES ${serializeName(constraint.references.table)} ${columns(constraint.references.columns)}`,
      ];
      if (constraint.references.onDelete)
        parts.push(`ON DELETE ${constraint.references.onDelete}`);
      if (constraint.references.onUpdate)
        parts.push(`ON UPDATE ${constraint.references.onUpdate}`);
      return parts.filter(Boolean).join(" ");
    }
    default:
      return "";
  }
}
