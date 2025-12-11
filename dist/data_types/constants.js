import { number, date as zodDate, string, boolean as zodBoolean, preprocess, } from "zod";
const safeDateTime = preprocess((v) => {
    const parsing = zodDate()
        .or(string()
        .datetime()
        .transform((date) => new Date(date)))
        .safeParse(v);
    if (parsing.success)
        return parsing.data;
    return undefined;
}, zodDate());
export const TypesToZod = {
    text: string(),
    varchar: string(),
    char: string(),
    uuid: string()
        .uuid()
        .transform((uuid) => uuid),
    bigint: number().int(),
    numeric: number(),
    ["double precision"]: number(),
    boolean: zodBoolean(),
    integer: number().int(),
    date: safeDateTime,
    timestamp: safeDateTime,
    timestamptz: safeDateTime,
    serial: number(),
};
export const pgKnownKeywords = new Set([
    "CURRENT_DATE",
    "CURRENT_TIME",
    "CURRENT_TIMESTAMP",
    "NOW()",
    "uuid_generate_v4()",
    "NULL",
]);
//# sourceMappingURL=constants.js.map