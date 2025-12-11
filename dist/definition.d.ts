import { DataType } from "./data_types/base";
import { UserDefined } from "./data_types/pg_types";
import type { PgCompositeTypeDefinition, PgTableColumnDefinition, PgIdentifier, PgTableConstraintsCallback, PgTable, SQLExpression } from "./types";
import { type output, type ZodType } from "zod";
type CompositeDefaultInput<FieldsDefinition extends PgTableColumnDefinition> = Partial<{
    [key in keyof FieldsDefinition & string]: output<FieldsDefinition[key]["zodSchema"]>;
}>;
declare class CompositeUserDefined<Name extends string, CompositeName extends PgIdentifier, Schema extends ZodType, FieldsDefinition extends PgTableColumnDefinition> extends UserDefined<Name, CompositeName, Schema, {}, CompositeDefaultInput<FieldsDefinition> | SQLExpression> {
    readonly meta: {
        compositeTypeName: CompositeName;
        defaultInputSchema: ZodType<Record<string, unknown>>;
    };
    readonly _defaultReturn: CompositeUserDefined<Name, CompositeName, Schema, FieldsDefinition> & DataType<Name, CompositeName, Schema, {
        hasDefault: true;
    }, CompositeDefaultInput<FieldsDefinition> | SQLExpression> & Omit<typeof this, keyof DataType<Name, CompositeName, Schema, any, any>>;
    constructor(name: Name, parameters: {
        type: CompositeName;
        schema: Schema;
    }, meta: {
        compositeTypeName: CompositeName;
        defaultInputSchema: ZodType<Record<string, unknown>>;
    });
    default(expression: CompositeDefaultInput<FieldsDefinition> | SQLExpression, ...args: any[]): typeof this._defaultReturn;
}
export declare function pgTable<TableName extends PgIdentifier, ColumnDefinition extends PgTableColumnDefinition>(tableName: TableName, definition: ColumnDefinition, _constraints?: PgTableConstraintsCallback<TableName, ColumnDefinition>): PgTable<TableName, ColumnDefinition>;
export declare function pgEnumType<EnumName extends PgIdentifier, Values extends string>(enumName: EnumName, definition: Record<string, Values> | Values[]): (<T extends string>(name: T) => UserDefined<T, EnumName, import("zod").ZodEnum<[Values, ...Values[]]>, {}, SQLExpression | Values>) & {
    enumName: EnumName;
    values: [Values, ...Values[]];
};
export declare function pgCompositeType<CompositeTypeName extends PgIdentifier, FieldsDefinition extends PgTableColumnDefinition>(compositeTypeName: CompositeTypeName, definition: FieldsDefinition): (<T extends string>(name: T) => CompositeUserDefined<T, CompositeTypeName, import("zod").ZodObject<import("./types").SelectSchema<FieldsDefinition>, import("zod").UnknownKeysParam, import("zod").ZodTypeAny, import("zod").objectUtil.addQuestionMarks<import("zod").baseObjectOutputType<import("./types").SelectSchema<FieldsDefinition>>, any> extends infer T_1 ? { [k in keyof T_1]: T_1[k]; } : never, import("zod").baseObjectInputType<import("./types").SelectSchema<FieldsDefinition>> extends infer T_2 ? { [k_1 in keyof T_2]: T_2[k_1]; } : never>, FieldsDefinition>) & PgCompositeTypeDefinition<CompositeTypeName, FieldsDefinition> & {
    fields: PgCompositeTypeDefinition<CompositeTypeName, FieldsDefinition>;
    compositeTypeName: CompositeTypeName;
};
export declare function pgView(): void;
export declare function pgMatView(): void;
export declare function pgFunction(): void;
export {};
