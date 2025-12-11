import { array as zodArray, } from "zod";
import { DataType } from "./base";
export class ArrayType extends DataType {
    constructor(type) {
        super(type.name, type.pgType);
        this.item = type;
        this.isArray = true;
        this.itemsAreNullable = true;
        this.refreshSchema();
    }
    notNullableItems() {
        this.itemsAreNullable = false;
        this.refreshSchema();
        return this;
    }
    minLength(length) {
        this.minItemsLength = length;
        this.refreshSchema();
        return this;
    }
    maxLength(length) {
        this.maxItemsLength = length;
        this.refreshSchema();
        return this;
    }
    length(length) {
        this.minItemsLength = length;
        this.maxItemsLength = length;
        this.refreshSchema();
        return this;
    }
    computeType() {
        return `${this.item.computeType()}[]`;
    }
    refreshSchema() {
        const itemSchema = (this.itemsAreNullable
            ? this.item.zodSchema.nullable()
            : this.item.zodSchema);
        let schema = zodArray(itemSchema);
        if (this.minItemsLength !== undefined &&
            this.maxItemsLength !== undefined) {
            const sameLength = this.minItemsLength === this.maxItemsLength;
            schema = sameLength
                ? schema.length(this.minItemsLength)
                : schema;
        }
        if (this.minItemsLength !== undefined &&
            (this.maxItemsLength === undefined ||
                this.minItemsLength !== this.maxItemsLength))
            schema = schema.min(this.minItemsLength);
        if (this.maxItemsLength !== undefined &&
            (this.minItemsLength === undefined ||
                this.minItemsLength !== this.maxItemsLength))
            schema = schema.max(this.maxItemsLength);
        this.zodSchema = schema;
    }
}
export const array = (type) => new ArrayType(type);
//# sourceMappingURL=array.js.map