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

// Simplified from https://github.com/giuseppeg/postcss-pseudo-classes/blob/master/index.js
const pseudoClassPlugin: AcceptedPlugin = {
  postcssPlugin: 'postcss-hover-classes',
  prepare: function () {
    const fixed: Rule[] = [];
    return {
      Rule: function (rule) {
        if (fixed.indexOf(rule) !== -1) {
          return;
        }
        fixed.push(rule);
        rule.selectors.forEach(function (selector) {
          if (selector.includes(':hover')) {
            rule.selector += ',\n' + selector.replace(/:hover/g, '.\\:hover');
          }
        });
      },
    };
  },
};

export { mediaSelectorPlugin, pseudoClassPlugin };
