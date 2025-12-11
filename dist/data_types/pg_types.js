import { DataType } from "./base";
export class Integer extends DataType {
    constructor(name, parameters) {
        const pgType = (parameters.size === 2
            ? "smallint"
            : parameters.size === 4
                ? "integer"
                : "bigint");
        super(name, pgType);
    }
    gt(value) {
        this.minExclusive = value;
        this.zodSchema = this.zodSchema.gt(value);
        return this;
    }
    lt(value) {
        this.maxExclusive = value;
        this.zodSchema = this.zodSchema.lt(value);
        return this;
    }
    gte(value) {
        this.minInclusive = value;
        this.zodSchema = this.zodSchema.gte(value);
        return this;
    }
    lte(value) {
        this.maxInclusive = value;
        this.zodSchema = this.zodSchema.lte(value);
        return this;
    }
    nonnegative() {
        this.zodSchema = this.zodSchema.nonnegative();
        this.minInclusive = 0;
        this.minExclusive = undefined;
        this.maxExclusive = undefined;
        this.maxInclusive = undefined;
        return this;
    }
    nonpositive() {
        this.zodSchema = this.zodSchema.nonpositive();
        this.maxInclusive = 0;
        this.maxExclusive = undefined;
        this.minExclusive = undefined;
        this.minInclusive = undefined;
        return this;
    }
    positive() {
        this.zodSchema = this.zodSchema.positive();
        this.minExclusive = 0;
        this.minInclusive = undefined;
        this.maxExclusive = undefined;
        this.maxInclusive = undefined;
        return this;
    }
    negative() {
        this.zodSchema = this.zodSchema.negative();
        this.maxExclusive = 0;
        this.maxInclusive = undefined;
        this.minExclusive = undefined;
        this.minInclusive = undefined;
        return this;
    }
    multipleOf(value) {
        this.zodSchema = this.zodSchema.multipleOf(value);
        this.divisibleBy = value;
        return this;
    }
}
export class Bool extends DataType {
    constructor(name) {
        super(name, "boolean");
    }
}
export class BoundedString extends DataType {
    constructor(name, parameters) {
        super(name, parameters.mode);
        this.length = parameters.length;
    }
    computeType() {
        return this.pgType + `(${this.length})`;
    }
    regex(pattern) {
        this.pattern = pattern;
        this.zodSchema = this.zodSchema.regex(pattern);
        return this;
    }
}
export class UnBoundedString extends DataType {
    constructor(name) {
        super(name, "text");
    }
    length(length) {
        return this.min(length).max(length);
    }
    min(length) {
        this.minLength = length;
        this.zodSchema = this.zodSchema.min(length);
        return this;
    }
    max(length) {
        this.maxLength = length;
        this.zodSchema = this.zodSchema.max(length);
        return this;
    }
    regex(pattern) {
        this.pattern = pattern;
        this.zodSchema = this.zodSchema.regex(pattern);
        return this;
    }
}
export class JsonObject extends DataType {
    constructor(name, parameters) {
        super(name, parameters.mode);
        this.zodSchema = parameters.schema;
    }
}
export class Timestamp extends DataType {
    constructor(name, parameters) {
        super(name, (parameters.withTimezone ? "timestamptz" : "timestamp"));
        this.precision = parameters.precision;
    }
    computeType() {
        if (this.precision !== undefined)
            return this.pgType + `(${this.precision})`;
        return this.pgType;
    }
    min(date) {
        this.minDate = date;
        this.zodSchema = this.zodSchema.refine((value) => {
            return value >= date;
        }, `must be greater than or equal to ${date}`);
        return this;
    }
    max(date) {
        this.maxDate = date;
        this.zodSchema = this.zodSchema.refine((value) => {
            return value <= date;
        }, `must be less than or equal to ${date}`);
        return this;
    }
}
export class PgDate extends DataType {
    constructor(name) {
        super(name, "date");
    }
}
export class UnParametered extends DataType {
    constructor(name, parameters) {
        super(name, parameters.type);
    }
}
export class Numeric extends DataType {
    constructor(name, parameters = {}) {
        super(name, "numeric");
        this.precision = parameters.precision;
        this.scale = parameters.scale;
    }
    computeType() {
        if (this.precision === undefined && this.scale === undefined)
            return this.pgType;
        return `${this.pgType}(${[this.precision, this.scale].join(", ")})`;
    }
    gt(value) {
        this.minExclusive = value;
        this.zodSchema = this.zodSchema.gt(value);
        return this;
    }
    lt(value) {
        this.maxExclusive = value;
        this.zodSchema = this.zodSchema.lt(value);
        return this;
    }
    gte(value) {
        this.minInclusive = value;
        this.zodSchema = this.zodSchema.gte(value);
        return this;
    }
    lte(value) {
        this.maxInclusive = value;
        this.zodSchema = this.zodSchema.lte(value);
        return this;
    }
    nonnegative() {
        this.zodSchema = this.zodSchema.nonnegative();
        this.minInclusive = 0;
        this.minExclusive = undefined;
        this.maxExclusive = undefined;
        this.maxInclusive = undefined;
        return this;
    }
    nonpositive() {
        this.zodSchema = this.zodSchema.nonpositive();
        this.maxInclusive = 0;
        this.maxExclusive = undefined;
        this.minExclusive = undefined;
        this.minInclusive = undefined;
        return this;
    }
    positive() {
        this.zodSchema = this.zodSchema.positive();
        this.minExclusive = 0;
        this.minInclusive = undefined;
        this.maxExclusive = undefined;
        this.maxInclusive = undefined;
        return this;
    }
    negative() {
        this.zodSchema = this.zodSchema.negative();
        this.maxExclusive = 0;
        this.maxInclusive = undefined;
        this.minExclusive = undefined;
        this.minInclusive = undefined;
        return this;
    }
    multipleOf(value) {
        this.zodSchema = this.zodSchema.multipleOf(value);
        this.divisibleBy = value;
        return this;
    }
}
export class UserDefined extends DataType {
    constructor(name, parameters) {
        super(name, parameters.type);
        this.zodSchema = parameters.schema;
    }
}
//# sourceMappingURL=pg_types.js.map