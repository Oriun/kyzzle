import { any } from "zod";
import { flatTemplateStringArray } from "../utils";
import { TypesToZod, pgKnownKeywords } from "./constants";
export class DataType {
    constructor(name, pgType) {
        var _a;
        this.name = name;
        this.pgType = pgType;
        this.isPrimaryKey = false;
        this.isUnique = false;
        this.isNotNull = false;
        this.isImmutable = false;
        this.isArray = false;
        this.defaultExpression = undefined;
        this.generatedAlwaysExpression = undefined;
        this.constraints = [];
        this.zodSchema = ((_a = TypesToZod[pgType]) !== null && _a !== void 0 ? _a : any());
    }
    computeType() {
        return this.pgType;
    }
    notNull() {
        this.isNotNull = true;
        return this;
    }
    unique() {
        this.isUnique = true;
        return this;
    }
    primaryKey() {
        this.isPrimaryKey = true;
        return this.notNull();
    }
    default(expression, ...args) {
        this.defaultExpression = processExpression(expression, args);
        return this;
    }
    generatedAlwaysAs(expression, ...args) {
        this.generatedAlwaysExpression = processExpression(expression, args);
        this.isImmutable = true;
        return this;
    }
    immutable() {
        this.isImmutable = true;
        return this;
    }
    override(schema) {
        this.zodSchema =
            typeof schema === "function" ? schema(this.zodSchema) : schema;
        return this;
    }
}
function processExpression(expression, args) {
    if (Array.isArray(expression)) {
        return `(${flatTemplateStringArray(expression, ...(args !== null && args !== void 0 ? args : []))})`;
    }
    return typeof expression === "string" &&
        !pgKnownKeywords.has(expression) &&
        !(expression.startsWith("'") && expression.endsWith("'"))
        ? `'${expression}'`
        : typeof expression === "object"
            ? expression instanceof Date
                ? `'${expression.toISOString()}'`
                : `'${JSON.stringify(expression)}'`
            : expression;
}
//# sourceMappingURL=base.js.map