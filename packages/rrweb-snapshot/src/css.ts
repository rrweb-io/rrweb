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
const pseudoClassPlugin: AcceptedPlugin = {
  postcssPlugin: 'postcss-hover-classes',
  prepare: function () {
    const fixed = new WeakSet<Rule>();
    return {
      Rule: function (rule) {
        if (fixed.has(rule)) {
          return;
        }
        fixed.add(rule);

        const hoverSelectors = rule.selectors.filter((selector) =>
          selector.includes(':hover'),
        );

        if (!hoverSelectors.length) {
          return;
        }

        hoverSelectors.forEach((selector) => {
          const escapedSelector = selector.replace(/:hover/g, '.\\:hover');
          rule.selector += `,\n${escapedSelector}`;
        });
      },
    };
  },
};
export { mediaSelectorPlugin, pseudoClassPlugin };
