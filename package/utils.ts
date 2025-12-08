import type { ZodType, ZodNullable } from "zod";
import type { PgIdentifier } from "./types";

export function entries<T extends Record<string, unknown> | object>(object: T) {
  return Object.entries(object) as [keyof T & string, T[keyof T]][];
}
export function fromEntries<T extends [string, unknown][]>(entries: T) {
  return Object.fromEntries(entries) as Record<T[number][0], T[number][1]>;
}
export function keys<T extends Record<string, unknown>>(object: T) {
  return Object.keys(object) as (keyof T)[];
}

export function pick<T extends object, S extends keyof T>(
  obj: T,
  ...properties: (S | (string & {}))[]
) {
  const newObj = {} as {
    [K in S]: T[S];
  };
  for (const prop of properties) {
    // eslint-disable-next-line
    // @ts-ignore
    if (prop in obj) newObj[prop] = obj[prop];
  }
  return newObj;
}

export function omit<T extends object, S extends keyof T>(
  obj: T,
  ...properties: (S | (string & {}))[]
) {
  const newObj = {} as Omit<T, S> & { [key in S]: never };
  for (const prop in obj) {
    // eslint-disable-next-line
    // @ts-ignore
    if (!properties.includes(prop)) newObj[prop] = obj[prop];
  }
  return newObj;
}

export function isObject(data: unknown): data is Record<string, unknown> {
  return !!(data && typeof data === "object");
}
export function clone<T>(object: T): T {
  if (isObject(object))
    // @ts-ignore
    return fromEntries(entries(object).map(([k, v]) => [k, clone(v)]));
  return object;
}

export function isNullable<T extends ZodType>(
  schema: ZodType,
): schema is ZodNullable<T> {
  return schema.safeParse(null).success;
}

export function isValidIdentifier(str: string): str is PgIdentifier {
  if (str.length < 3) return false;
  const split = str.split(".");
  return split.length === 2 && split.every((s) => s.length > 0);
}

export function filterFalsy<T>(array: T[]): T[] {
  return array.filter(Boolean) as Exclude<T, null | undefined>[];
}

export function flatTemplateStringArray(
  template: TemplateStringsArray,
  ...args: any[]
) {
  return template.reduce(
    (acc, str, i) =>
      acc +
      str +
      (args[i] && typeof args[i] === "object"
        ? JSON.stringify(args[i])
        : args[i] === undefined
          ? ""
          : args[i]),
    "",
  );
}

export function sql(template: TemplateStringsArray, ...args: any[]) {
  if (!template[0]) return "";
  const firstIndent = findFirstIdent(template[0]);
  if (!firstIndent) return "";
  const trimRegexp = new RegExp(`^ {1,${firstIndent}}`);
  return template
    .reduce(
      (previousLines, str, i) => {
        const currentLine = previousLines.pop()!;
        const parts = (currentLine + str)
          .split("\n")
          .map((line, i) => (i ? line.replace(trimRegexp, "") : line));
        const currentContent = [...previousLines, ...parts];
        const lastLine = currentContent.pop()!;
        const lastPartIndent = findFirstIdent(lastLine);
        const argsParts = (
          lastLine +
          (args[i] && typeof args[i] === "object"
            ? `'${JSON.stringify(args[i])}'`
            : args[i] || "")
        )
          .toString()
          .split("\n")
          .map((s) =>
            s.startsWith(" ") ? s : " ".repeat(lastPartIndent ?? 0) + s,
          );
        return [...currentContent, ...argsParts];
      },
      [""],
    )
    .join("\n");
}

function findFirstIdent(str: string) {
  let firstIdent = 0;
  for (let i = 0; i < str.length; i++) {
    let char = str[i];
    if (!char) throw new Error("Invalid string");
    if (char === "\n") firstIdent = 0;
    else if (/[ \t]/gim.test(char)) firstIdent++;
    else return firstIdent;
  }
  return firstIdent;
}

export function hasItems<T>(arr: T[]): arr is [T, ...T[]] {
  return arr.length > 0;
}

export function isTableColumn(
  value: unknown,
): value is import("./types").TableColumn<
  import("./types").PgIdentifier,
  string,
  any,
  any,
  any
> {
  return !!(
    value &&
    typeof value === "object" &&
    (value as { __brand?: string }).__brand === "TableColumn"
  );
}
