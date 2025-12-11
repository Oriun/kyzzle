import { DataType } from "./data_types/base";
import { UserDefined } from "./data_types/pg_types";
import { custom } from "./data_types/helpers";
import { entries, fromEntries, hasItems, isObject, isValidIdentifier, } from "./utils";
import { enum as _enum, object } from "zod";
import { selectSchema } from "./schema";
import { normalizeConstraints, registerTableConstraints, registerTableIndexes, registerTableTriggers, } from "./constraints";
class CompositeUserDefined extends UserDefined {
    constructor(name, parameters, meta) {
        super(name, parameters);
        this.meta = meta;
    }
    default(expression, ...args) {
        const { defaultInputSchema, compositeTypeName } = this.meta;
        const isPlainObject = isObject(expression) &&
            !Array.isArray(expression) &&
            Object.getPrototypeOf(expression) === Object.prototype;
        if (isPlainObject) {
            const parsed = defaultInputSchema.safeParse(expression);
            if (!parsed.success)
                throw new Error(`Invalid default value for composite type ${compositeTypeName}: ${parsed.error.message}`);
            const normalized = parsed.data;
            const jsonPayload = JSON.stringify(normalized).replace(/'/g, "''");
            this.defaultExpression = `jsonb_populate_record(NULL::${compositeTypeName}, '${jsonPayload}'::jsonb)`;
            return this;
        }
        return super.default(expression, ...args);
    }
}
export function pgTable(tableName, definition, _constraints) {
    var _a;
    if (!isValidIdentifier(tableName))
        throw new Error(`Invalid table name: ${tableName}. Please provide full reference like "public.users".`);
    const columnsDefinition = entries(definition);
    if (!columnsDefinition.length)
        throw new Error(`Table ${tableName} has no columns`);
    for (const [key, value] of columnsDefinition)
        if (!(value instanceof DataType))
            throw new Error(`Invalid column ${key}. Definition does not involve a DataType, example: "text(...)" or "integer(...)".`);
    const table = fromEntries(columnsDefinition.map(([key, value]) => {
        const col = {
            name: value.name,
            table: tableName,
            type: value,
        };
        return [
            key,
            Object.defineProperty(col, "__brand", {
                value: "TableColumn",
                writable: false,
                enumerable: false,
            }),
        ];
    }));
    const rawDefinitions = (_a = _constraints === null || _constraints === void 0 ? void 0 : _constraints(table)) !== null && _a !== void 0 ? _a : [];
    const allDefinitions = Array.isArray(rawDefinitions) ? rawDefinitions : [];
    const constraints = normalizeConstraints(tableName, Object.values(table).map((col) => ({ name: col.name })), allDefinitions);
    const extras = allDefinitions;
    const indexes = extras.filter((extra) => extra.kind === "index");
    const triggers = extras.filter((extra) => extra.kind === "trigger");
    registerTableConstraints(table, constraints);
    registerTableIndexes(table, indexes);
    registerTableTriggers(table, triggers);
    return Object.defineProperties(table, {
        __brand: {
            value: "Table",
            writable: false,
            enumerable: false,
        },
    });
}
export function pgEnumType(enumName, definition) {
    if (!isValidIdentifier(enumName))
        throw new Error(`Invalid table name: ${enumName}. Please provide full reference like "public.users_type".`);
    const values = Array.isArray(definition)
        ? definition
        : Object.values(definition);
    if (!hasItems(values))
        throw new Error(`Enum ${enumName} has no values`);
    return Object.defineProperty(Object.assign(custom(enumName, _enum(values)), {
        enumName,
        values,
    }), "__brand", {
        value: "EnumType",
        writable: false,
        enumerable: false,
    });
}
export function pgCompositeType(compositeTypeName, definition) {
    if (!isValidIdentifier(compositeTypeName))
        throw new Error(`Invalid type name: ${compositeTypeName}. Please provide full reference like "public.users".`);
    const fieldsDefinition = entries(definition);
    if (!fieldsDefinition.length)
        throw new Error(`Composite type ${compositeTypeName} has no fields`);
    for (const [key, value] of fieldsDefinition)
        if (!(value instanceof DataType))
            throw new Error(`Invalid field ${key}. Definition does not involve a DataType, example: "text(...)" or "integer(...)".`);
    const fields = fromEntries(fieldsDefinition.map(([key, value]) => {
        const field = {
            name: value.name,
            compositeType: compositeTypeName,
            type: value,
        };
        return [
            key,
            Object.defineProperty(field, "__brand", {
                value: "CompositeTypeField",
                writable: false,
                enumerable: false,
            }),
        ];
    }));
    const schema = selectSchema(fields);
    const defaultInputShape = {};
    for (const [key, value] of fieldsDefinition) {
        const optionalSchema = value.zodSchema.optional();
        defaultInputShape[key] = optionalSchema;
        if (value.name !== key)
            defaultInputShape[value.name] = optionalSchema;
    }
    const defaultInputSchema = object(defaultInputShape)
        .strict()
        .transform((val) => {
        const normalized = {};
        for (const [key, value] of fieldsDefinition) {
            const fromCode = val[key];
            const fromDb = val[value.name];
            const chosen = fromCode !== undefined
                ? fromCode
                : fromDb !== undefined
                    ? fromDb
                    : undefined;
            if (chosen !== undefined)
                normalized[value.name] = chosen;
        }
        return normalized;
    });
    const composite = ((name) => new CompositeUserDefined(name, { type: compositeTypeName, schema }, {
        compositeTypeName,
        defaultInputSchema,
    }));
    return Object.defineProperty(Object.assign(composite, Object.assign(Object.assign({}, fields), { fields,
        compositeTypeName })), "__brand", {
        value: "CompositeType",
        writable: false,
        enumerable: false,
    });
}
export function pgView() { }
export function pgMatView() { }
export function pgFunction() { }
//# sourceMappingURL=definition.js.map