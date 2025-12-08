import type {
  PgIdentifier,
  PgTableConstraint,
  PgTableDefinition,
  TableColumn,
} from "./types";
import { isTableColumn, sql } from "./utils";
import { getTableConstraints } from "./constraints";
import { renderConstraintExpression } from "./constraints";

export function serializeTable(
  table: PgTableDefinition<any, any> & { constraints?: PgTableConstraint[] },
): string {
  return serializeCreateTable(table);
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
