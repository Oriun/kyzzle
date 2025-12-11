import { never, object, ZodObject, ZodType } from "zod";
import { entries, fromEntries, isNullable } from "./utils";
export function selectSchema(table) {
    return object(fromEntries(entries(table).map(([name, column]) => {
        let schema = column.type.zodSchema;
        if (!column.type.isNotNull && !isNullable(column.type.zodSchema))
            schema = schema.nullable();
        return [name, schema];
    })));
}
export function insertSchema(table, options = { throwOnForbiddenColumns: true }) {
    return object(fromEntries(entries(table)
        .filter(([, column]) => {
        if (column.type.generatedAlwaysExpression)
            return options.throwOnForbiddenColumns;
        return true;
    })
        .map(([name, column]) => {
        let schema = column.type.zodSchema;
        if (!column.type.isNotNull)
            schema = schema.nullable();
        if (column.type.defaultExpression || !column.type.isNotNull)
            schema = schema.optional();
        if (column.type.generatedAlwaysExpression)
            schema = never().optional();
        return [name, schema];
    })));
}
export function updateSchema(table, options = { throwOnForbiddenColumns: true }) {
    return object(fromEntries(entries(table)
        .filter(([, column]) => {
        if (column.type.generatedAlwaysExpression !== undefined ||
            column.type.isImmutable)
            return options.throwOnForbiddenColumns;
        return true;
    })
        .map(([name, column]) => {
        let schema = column.type.zodSchema;
        if (!column.type.isNotNull)
            schema = schema.nullable();
        if (column.type.generatedAlwaysExpression !== undefined ||
            column.type.isImmutable)
            schema = never().optional();
        return [name, schema];
    }))).partial();
}
//# sourceMappingURL=schema.js.map