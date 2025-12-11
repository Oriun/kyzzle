export function entries(object) {
    return Object.entries(object);
}
export function fromEntries(entries) {
    return Object.fromEntries(entries);
}
export function keys(object) {
    return Object.keys(object);
}
export function pick(obj, ...properties) {
    const newObj = {};
    for (const prop of properties) {
        if (prop in obj)
            newObj[prop] = obj[prop];
    }
    return newObj;
}
export function omit(obj, ...properties) {
    const newObj = {};
    for (const prop in obj) {
        if (!properties.includes(prop))
            newObj[prop] = obj[prop];
    }
    return newObj;
}
export function isObject(data) {
    return !!(data && typeof data === "object");
}
export function clone(object) {
    if (isObject(object))
        return fromEntries(entries(object).map(([k, v]) => [k, clone(v)]));
    return object;
}
export function isNullable(schema) {
    return schema.safeParse(null).success;
}
export function isValidIdentifier(str) {
    if (str.length < 3)
        return false;
    const split = str.split(".");
    return split.length === 2 && split.every((s) => s.length > 0);
}
export function filterFalsy(array) {
    return array.filter(Boolean);
}
export function flatTemplateStringArray(template, ...args) {
    return template.reduce((acc, str, i) => acc +
        str +
        (args[i] && typeof args[i] === "object"
            ? JSON.stringify(args[i])
            : args[i] === undefined
                ? ""
                : args[i]), "");
}
export function sql(template, ...args) {
    if (!template[0])
        return "";
    const firstIndent = findFirstIdent(template[0]);
    if (!firstIndent)
        return "";
    const trimRegexp = new RegExp(`^ {1,${firstIndent}}`);
    return template
        .reduce((previousLines, str, i) => {
        const currentLine = previousLines.pop();
        const parts = (currentLine + str)
            .split("\n")
            .map((line, i) => (i ? line.replace(trimRegexp, "") : line));
        const currentContent = [...previousLines, ...parts];
        const lastLine = currentContent.pop();
        const lastPartIndent = findFirstIdent(lastLine);
        const argsParts = (lastLine +
            (args[i] && typeof args[i] === "object"
                ? `'${JSON.stringify(args[i])}'`
                : args[i] || ""))
            .toString()
            .split("\n")
            .map((s) => s.startsWith(" ") ? s : " ".repeat(lastPartIndent !== null && lastPartIndent !== void 0 ? lastPartIndent : 0) + s);
        return [...currentContent, ...argsParts];
    }, [""])
        .join("\n");
}
function findFirstIdent(str) {
    let firstIdent = 0;
    for (let i = 0; i < str.length; i++) {
        let char = str[i];
        if (!char)
            throw new Error("Invalid string");
        if (char === "\n")
            firstIdent = 0;
        else if (/[ \t]/gim.test(char))
            firstIdent++;
        else
            return firstIdent;
    }
    return firstIdent;
}
export function hasItems(arr) {
    return arr.length > 0;
}
export function isTableColumn(value) {
    return !!(value &&
        typeof value === "object" &&
        value.__brand === "TableColumn");
}
//# sourceMappingURL=utils.js.map