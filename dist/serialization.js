import { isTableColumn, sql } from "./utils";
import { getTableConstraints, getTableIndexes, getTableTriggers, } from "./constraints";
import { renderConstraintExpression } from "./constraints";
export function serializeTable(table) {
    return serializeCreateTable(table);
}
export function serializeIndexes(table, indexes) {
    var _a, _b;
    const tableIndexes = (_a = indexes !== null && indexes !== void 0 ? indexes : getTableIndexes(table)) !== null && _a !== void 0 ? _a : [];
    const tableName = (_b = Object.values(table)[0]) === null || _b === void 0 ? void 0 : _b.table;
    if (!tableName || !tableIndexes.length)
        return [];
    return tableIndexes.map((idx) => {
        var _a;
        return [
            "CREATE",
            idx.unique ? "UNIQUE" : undefined,
            "INDEX",
            idx.name ? `"${idx.name}"` : "IF NOT EXISTS",
            "ON",
            serializeName(tableName),
            idx.using ? `USING ${idx.using}` : undefined,
            `(${idx.columns.map((col) => `"${col}"`).join(", ")})`,
            ((_a = idx.include) === null || _a === void 0 ? void 0 : _a.length)
                ? `INCLUDE (${idx.include.map((col) => `"${col}"`).join(", ")})`
                : undefined,
            idx.where ? `WHERE ${renderConstraintExpression(idx.where)}` : undefined,
            ";",
        ]
            .filter(Boolean)
            .join(" ");
    });
}
export function serializeTriggers(table, triggers) {
    var _a, _b;
    const tableTriggers = (_a = triggers !== null && triggers !== void 0 ? triggers : getTableTriggers(table)) !== null && _a !== void 0 ? _a : [];
    const tableName = (_b = Object.values(table)[0]) === null || _b === void 0 ? void 0 : _b.table;
    if (!tableName || !tableTriggers.length)
        return [];
    return tableTriggers.map((trg) => {
        var _a, _b;
        return [
            "CREATE TRIGGER",
            `"${trg.name}"`,
            trg.timing,
            trg.events.join(" OR "),
            "ON",
            serializeName(tableName),
            `FOR EACH ${(_a = trg.forEach) !== null && _a !== void 0 ? _a : "ROW"}`,
            trg.when ? `WHEN (${renderConstraintExpression(trg.when)})` : undefined,
            "EXECUTE FUNCTION",
            `${trg.function.schema ? serializeName(trg.function.schema) + "." : ""}"${trg.function.name}"(${((_b = trg.function.args) !== null && _b !== void 0 ? _b : [])
                .map((arg) => (typeof arg === "number" ? arg : `'${arg}'`))
                .join(", ")})`,
            ";",
        ]
            .filter(Boolean)
            .join(" ");
    });
}
function serializeCreateTable(table, constraints = []) {
    var _a, _b;
    const columns = Object.values(table).filter((value) => isTableColumn(value));
    const tableName = (_a = columns[0]) === null || _a === void 0 ? void 0 : _a.table;
    if (!tableName)
        throw new Error("Table name is required");
    const constraintDefinitions = constraints.length > 0 ? constraints : ((_b = getTableConstraints(table)) !== null && _b !== void 0 ? _b : []);
    return sql `
    CREATE TABLE IF NOT EXISTS ${serializeName(tableName)} (
      ${[
        ...columns.map((col) => `"${col.name}" ${[
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
            .join(" ")}`),
        ...constraintDefinitions.map((constraint) => serializeConstraint(constraint)),
    ].join(",\n")}
    );
  `;
}
function serializeName(name) {
    return name
        .split(".")
        .map((s) => `"${s}"`)
        .join(".");
}
function serializeConstraint(constraint) {
    const columns = (cols) => `(${cols.map((col) => `"${col}"`).join(", ")})`;
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
//# sourceMappingURL=serialization.js.map