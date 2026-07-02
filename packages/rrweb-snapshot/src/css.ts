import type { AcceptedPlugin, Rule } from 'postcss';

const MEDIA_SELECTOR = /(max|min)-device-(width|height)/;
const MEDIA_SELECTOR_GLOBAL = new RegExp(MEDIA_SELECTOR.source, 'g');

const mediaSelectorPlugin: AcceptedPlugin = {
  postcssPlugin: 'postcss-custom-selectors',
  prepare() {
    return {
      postcssPlugin: 'postcss-custom-selectors',
      AtRule: function (atrule) {
        if (atrule.params.match(MEDIA_SELECTOR_GLOBAL)) {
          atrule.params = atrule.params.replace(MEDIA_SELECTOR_GLOBAL, '$1-$2');
        }
      },
    };
  },
};

/**
 * User-action pseudo-classes that `pseudoClassPlugin` can mirror to an escaped
 * class for replay.
 *
 * Each regex ends with a `(?![-\w])` boundary so a pseudo-class only matches as
 * a whole token since otherwise `:focus` would match `:focus-visible` / `:focus-within`.
 */
const PSEUDO_CLASS_MIRRORS = {
  ':hover': /:hover(?![-\w])/g,
  ':active': /:active(?![-\w])/g,
  ':focus': /:focus(?![-\w])/g,
  ':focus-visible': /:focus-visible(?![-\w])/g,
  ':focus-within': /:focus-within(?![-\w])/g,
} as const;

export type HackCssPseudoClass = keyof typeof PSEUDO_CLASS_MIRRORS;

// Simplified from https://github.com/giuseppeg/postcss-pseudo-classes/blob/master/index.js
const pseudoClassPlugin = (
  pseudoClasses: HackCssPseudoClass[],
): AcceptedPlugin => ({
  postcssPlugin: 'postcss-pseudo-classes',
  prepare: function () {
    const fixed: Rule[] = [];
    return {
      Rule: function (rule) {
        if (fixed.indexOf(rule) !== -1) {
          return;
        }
        fixed.push(rule);
        rule.selectors.forEach(function (selector) {
          for (const pseudoClass of pseudoClasses) {
            const regex = PSEUDO_CLASS_MIRRORS[pseudoClass];
            // cheap happy-path filter: skip the regex work when the
            // pseudo-class isn't present at all.
            if (!regex || !selector.includes(pseudoClass)) {
              continue;
            }
            // compare against the result so a boundary miss (e.g. `:focus`
            // inside `:focus-visible`, guarded by `(?![-\w])`) doesn't append a
            // duplicate selector.
            const mirrored = selector.replace(regex, '.\\' + pseudoClass);
            if (mirrored !== selector) {
              rule.selector += ',\n' + mirrored;
            }
          }
        });
      },
    };
  },
});

export { mediaSelectorPlugin, pseudoClassPlugin };
