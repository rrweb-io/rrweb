# Coding Style

These have been adapted from the style guidelines for coding in Electron.

You can run `yarn lint` to show any style issues detected by `eslint`.

## General Code

- End files with a newline.
- Using a plain `return` when returning explicitly at the end of a function.
  - Not `return null`, `return undefined`, `null` or `undefined`
- run `yarn format` to rewrite all files in the standard format
- run `yarn format:head` to rewrite files from your last commit

## Documentation

- Write [remark](https://github.com/remarkjs/remark) markdown style.

<!-- You can run `yarn lint-docs` to ensure that your documentation changes are
formatted correctly. -->

## TypeScript

- Write [standard](https://www.npmjs.com/package/standard) JavaScript style.
- File names should be concatenated with `-` instead of `_`, e.g.
  `file-name.js` rather than `file_name.js`, because in
  [github/atom](https://github.com/github/atom) module names are usually in
  the `module-name` form. This rule only applies to `.js` files.
- Use newer ES6/ES2015 syntax where appropriate
  - [`const`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const)
    for requires and other constants. If the value is a primitive, use uppercase naming (eg `const NUMBER_OF_RETRIES = 5`).
  - [`let`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let)
    for defining variables
  - [Arrow functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)
    instead of `function () { }`
  - [Template literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals)
    instead of string concatenation using `+`

## Naming Things

Electron APIs uses the same capitalization scheme as Node.js:

- When the module itself is a class like `BrowserWindow`, use `PascalCase`.
- When the module is a set of APIs, like `globalShortcut`, use `camelCase`.
- When the API is a property of object, and it is complex enough to be in a
  separate chapter like `win.webContents`, use `mixedCase`.
- For other non-module APIs, use natural titles, like `<webview> Tag` or
  `Process Object`.

When creating a new API, it is preferred to use getters and setters instead of
jQuery's one-function style. For example, `.getText()` and `.setText(text)`
are preferred to `.text([text])`. There is a
[discussion](https://github.com/electron/electron/issues/46) on this.
