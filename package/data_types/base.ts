import { any, type ZodType } from "zod";
import type {
  ParametersWithTypeImpact,
  PgKnownKeywords,
  PgKnownTypes,
  SQLExpression,
} from "../types";
import { flatTemplateStringArray } from "../utils";
import { TypesToZod, pgKnownKeywords } from "./constants";

export abstract class DataType<
  T extends string,
  PgType extends PgKnownTypes | (string & {}),
  //@ts-ignore
  ZodschemaType extends ZodType = PgType extends keyof typeof TypesToZod
    ? (typeof TypesToZod)[PgType]
    : ZodType,
  Parameters extends ParametersWithTypeImpact = {},
  DefaultType = SQLExpression,
> {
  public isPrimaryKey: boolean = false;
  public isUnique: boolean = false;
  public isNotNull: boolean = false;
  public isImmutable: boolean = false;
  public isArray: boolean = false;
  public defaultExpression?: SQLExpression = undefined;
  public generatedAlwaysExpression?: SQLExpression = undefined;
  public zodSchema: ZodschemaType;
  constructor(
    public readonly name: T,
    public readonly pgType: PgType,
  ) {
    this.zodSchema = (TypesToZod[pgType as keyof typeof TypesToZod] ??
      any()) as unknown as ZodschemaType;
  }
  computeType(): string {
    return this.pgType;
  }
  notNull() {
    this.isNotNull = true;
    return this as unknown as DataType<
      T,
      PgType,
      ZodschemaType,
      Parameters & { isNotNull: true },
      DefaultType
    >;
  }
  array() {
    this.isArray = true;
    this.isNotNull = false;
    return this as unknown as DataType<
      T,
      PgType,
      ZodschemaType,
      Parameters & { isNotNull: false },
      DefaultType
    >;
  }
  unique() {
    this.isUnique = true;
    return this as unknown as DataType<
      T,
      PgType,
      ZodschemaType,
      Parameters,
      DefaultType
    >;
  }
  primaryKey() {
    this.isPrimaryKey = true;
    return this.notNull();
  }
  default<TExpression extends SQLExpression | DefaultType>(
    expression: TExpression,
    ...args: any[]
  ) {
    this.defaultExpression = processExpression(
      expression as SQLExpression,
      args,
    );
    return this as unknown as DataType<
      T,
      PgType,
      ZodschemaType,
      Parameters & { hasDefault: true },
      DefaultType
    >;
  }
  generatedAlwaysAs(expression: SQLExpression, ...args: any[]) {
    this.generatedAlwaysExpression = processExpression(expression, args);
    this.isImmutable = true;
    return this as unknown as DataType<
      T,
      PgType,
      ZodschemaType,
      Parameters & { isImmutable: true; isGeneratedAlways: true },
      DefaultType
    >;
  }
  immutable() {
    this.isImmutable = true;
    return this as unknown as DataType<
      T,
      PgType,
      ZodschemaType,
      Parameters & { isImmutable: true },
      DefaultType
    >;
  }
  /**
   * Note: Schema is taken as-is, nullability is not automatically applied back
   */
  override<Z extends ZodType>(schema: Z) {
    // @ts-ignore
    this.zodSchema = schema;
    return this as unknown as DataType<T, PgType, Z, Parameters, DefaultType>;
  }
}

function processExpression(expression: SQLExpression, args?: any[]) {
  if (Array.isArray(expression)) {
    return `(${flatTemplateStringArray(expression as TemplateStringsArray, ...(args ?? []))})`;
  }
  return typeof expression === "string" &&
    !pgKnownKeywords.has(expression as PgKnownKeywords) &&
    !(expression.startsWith("'") && expression.endsWith("'"))
    ? `'${expression}'`
    : typeof expression === "object"
      ? `'${JSON.stringify(expression)}'`
      : expression;
}
