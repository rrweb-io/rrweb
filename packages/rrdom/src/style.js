export function parseCSSText(cssText) {
    const res = {};
    const listDelimiter = /;(?![^(]*\))/g;
    const propertyDelimiter = /:(.+)/;
    const comment = /\/\*.*?\*\//g;
    cssText
        .replace(comment, '')
        .split(listDelimiter)
        .forEach(function (item) {
        if (item) {
            const tmp = item.split(propertyDelimiter);
            tmp.length > 1 && (res[camelize(tmp[0].trim())] = tmp[1].trim());
        }
    });
    return res;
}
export function toCSSText(style) {
    const properties = [];
    for (const name in style) {
        const value = style[name];
        if (typeof value !== 'string')
            continue;
        const normalizedName = hyphenate(name);
        properties.push(`${normalizedName}: ${value};`);
    }
    return properties.join(' ');
}
const camelizeRE = /-([a-z])/g;
const CUSTOM_PROPERTY_REGEX = /^--[a-zA-Z0-9-]+$/;
export const camelize = (str) => {
    if (CUSTOM_PROPERTY_REGEX.test(str))
        return str;
    return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''));
};
const hyphenateRE = /\B([A-Z])/g;
export const hyphenate = (str) => {
    return str.replace(hyphenateRE, '-$1').toLowerCase();
};
//# sourceMappingURL=style.js.map