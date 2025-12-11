import { flatTemplateStringArray, isValidIdentifier } from "./utils";
const tableConstraints = new WeakMap();
const tableRefinements = new WeakMap();
const tableIndexes = new WeakMap();
const tableTriggers = new WeakMap();
class UniqueConstraint {
    constructor(name) {
        this.name = name;
        this.kind = "unique";
        this.columns = [];
    }
    on(first, ...rest) {
        if (this.columns.length)
            throw new Error("Unique constraint already defined");
        this.columns = [first, ...rest].map((col) => col.name);
        return this;
    }
}
class PrimaryKeyConstraint {
    constructor(name) {
        this.name = name;
        this.kind = "primary_key";
        this.columns = [];
    }
    on(first, ...rest) {
        if (this.columns.length)
            throw new Error("Primary key constraint already defined");
        this.columns = [first, ...rest].map((col) => col.name);
        return this;
    }
}
class CheckConstraint {
    constructor(name, expression, predicate) {
        this.name = name;
        this.expression = expression;
        this.predicate = predicate;
        this.kind = "check";
    }
}
class ForeignKeyConstraint {
    constructor(name) {
        this.name = name;
        this.kind = "foreign_key";
        this.columns = [];
        this._references = { table: "", columns: [] };
    }
    on(first, ...rest) {
        if (this.columns.length)
            throw new Error("Foreign key columns already defined");
        this.columns = [first, ...rest].map((col) => col.name);
        return this;
    }
    setReferences(table, columns, options = {}) {
        this._references = {
            table,
            columns: columns.map((col) => typeof col === "string"
                ? col
                : col.name),
            onDelete: options.onDelete,
            onUpdate: options.onUpdate,
        };
        return this;
    }
    get references() {
        return this._references;
    }
}
class IndexDefinition {
    constructor(name, options = {}) {
        this.name = name;
        this.kind = "index";
        this.columns = [];
        this.unique = options.unique;
        this.using = options.using;
        this.include = options.include;
        this.where = options.where;
    }
    on(first, ...rest) {
        if (this.columns.length)
            throw new Error("Index columns already defined");
        this.columns = [first, ...rest].map((col) => col.name);
        return this;
    }
    includeColumns(...columns) {
        this.include = columns.map((col) => typeof col === "string" ? col : col.name);
        return this;
    }
}
export const unique = (name) => new UniqueConstraint(name);
export const primaryKey = (name) => new PrimaryKeyConstraint(name);
export const check = (name, expression, predicate) => new CheckConstraint(name, expression, predicate);
export const foreignKey = (name) => new ForeignKeyConstraint(name);
export const index = (name, options) => new IndexDefinition(name, options);
export const trigger = (options) => {
    var _a, _b;
    const parts = options.execute.split(".");
    const fnName = (_a = parts.pop()) !== null && _a !== void 0 ? _a : options.execute;
    const schema = parts.length ? parts.join(".") : undefined;
    const timing = "when" in options ? options.when : options.timing;
    const events = "action" in options ? options.action : options.events;
    return {
        kind: "trigger",
        name: options.name,
        timing,
        events,
        forEach: (_b = options.forEach) !== null && _b !== void 0 ? _b : "ROW",
        function: { schema, name: fnName, args: options.with },
        when: options.condition,
    };
};
export const registerTableConstraints = (table, constraints) => {
    tableConstraints.set(table, constraints);
    tableRefinements.set(table, constraintRefinement(constraints));
};
export const getTableConstraints = (table) => tableConstraints.get(table);
export const tableRefinement = (table) => tableRefinements.get(table);
export const registerTableIndexes = (table, indexes) => tableIndexes.set(table, indexes);
export const getTableIndexes = (table) => tableIndexes.get(table);
export const registerTableTriggers = (table, triggers) => tableTriggers.set(table, triggers);
export const getTableTriggers = (table) => tableTriggers.get(table);
export function normalizeConstraints(tableName, tableColumns, constraints) {
    return constraints
        .filter((constraint) => ["unique", "primary_key", "check", "foreign_key"].includes(constraint.kind))
        .map((constraint) => {
        var _a, _b, _c, _d, _e, _f, _g;
        switch (constraint.kind) {
            case "unique":
            case "primary_key":
                if (!constraint.columns.length)
                    throw new Error(`Constraint ${(_a = constraint.name) !== null && _a !== void 0 ? _a : constraint.kind} on ${tableName} has no columns`);
                validateColumns(tableName, tableColumns, constraint.columns);
                return constraint;
            case "check":
                if (!constraint.expression)
                    throw new Error(`Check constraint ${(_b = constraint.name) !== null && _b !== void 0 ? _b : ""} on ${tableName} is missing expression`);
                return constraint;
            case "foreign_key":
                if (!constraint.columns.length)
                    throw new Error(`Foreign key ${(_c = constraint.name) !== null && _c !== void 0 ? _c : ""} on ${tableName} has no columns`);
                validateColumns(tableName, tableColumns, constraint.columns);
                if (!((_d = constraint.references) === null || _d === void 0 ? void 0 : _d.table) ||
                    !((_e = constraint.references.columns) === null || _e === void 0 ? void 0 : _e.length) ||
                    !isValidIdentifier(constraint.references.table))
                    throw new Error(`Foreign key ${(_f = constraint.name) !== null && _f !== void 0 ? _f : ""} on ${tableName} has invalid references`);
                if (constraint.references.columns.length !== constraint.columns.length)
                    throw new Error(`Foreign key ${(_g = constraint.name) !== null && _g !== void 0 ? _g : ""} on ${tableName} must reference the same number of columns`);
                return constraint;
            default:
                return constraint;
        }
    });
}
export function constraintRefinement(constraints) {
    return (value, ctx) => {
        var _a, _b, _c, _d;
        if (!constraints.length)
            return;
        for (const constraint of constraints) {
            if (constraint.kind === "check" && constraint.predicate) {
                let result = true;
                try {
                    result = constraint.predicate(value);
                }
                catch (error) {
                    result = false;
                }
                if (!result)
                    ctx.addIssue({
                        code: "custom",
                        message: `Check constraint ${(_a = constraint.name) !== null && _a !== void 0 ? _a : ""} failed`,
                    });
            }
            if (constraint.kind === "foreign_key") {
                const columns = constraint.columns;
                const present = columns.filter((column) => value[column] !== undefined);
                const missing = columns.filter((column) => value[column] === undefined);
                if (present.length > 0 && missing.length > 0)
                    ctx.addIssue({
                        code: "custom",
                        path: [(_c = (_b = missing[0]) !== null && _b !== void 0 ? _b : columns[0]) !== null && _c !== void 0 ? _c : ""],
                        message: `Foreign key ${(_d = constraint.name) !== null && _d !== void 0 ? _d : ""} requires columns [${columns.join(", ")}] together`,
                    });
            }
        }
    };
}
export function renderConstraintExpression(expression) {
    if (Array.isArray(expression))
        return flatTemplateStringArray(expression);
    return typeof expression === "object" && !(expression instanceof Date)
        ? JSON.stringify(expression)
        : `${expression}`;
}
function validateColumns(tableName, tableColumns, columns) {
    const availableColumns = new Set(tableColumns.map((col) => col.name));
    for (const column of columns)
        if (!availableColumns.has(column))
            throw new Error(`Constraint references unknown column ${column} on table ${tableName}`);
}
//# sourceMappingURL=constraints.js.map