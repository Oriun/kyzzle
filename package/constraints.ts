import type { ZodType } from "zod";
import type { PgIdentifier, TableColumn } from "./types";

class UniqueConstraint {
  columns: TableColumn<PgIdentifier, string, string, ZodType, {}>[];
  constructor(public readonly name: string) {
    this.columns = [];
  }
  on<T extends PgIdentifier>(
    first: TableColumn<T, string, string, ZodType, {}>,
    ...rest: TableColumn<
      [T][T extends any ? 0 : never],
      string,
      string,
      ZodType,
      {}
    >[]
  ) {
    if (this.columns.length)
      throw new Error("Unique constraint already defined");
    this.columns = [first, ...rest];
    return this;
  }
}
export const unique = (name: string) => {
  return new UniqueConstraint(name);
};
