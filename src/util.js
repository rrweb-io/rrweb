export function inlineCss(cssObj) {
  let style = '';
  Object.keys(cssObj).forEach(key => {
    style += `${key}: ${cssObj[key]};`;
  });
  return style;
}
