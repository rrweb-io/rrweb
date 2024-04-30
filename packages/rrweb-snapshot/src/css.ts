import type { Plugin, Rule } from 'postcss';

const MEDIA_SELECTOR = /(max|min)-device-(width|height)/;
const MEDIA_SELECTOR_GLOBAL = new RegExp(MEDIA_SELECTOR.source, 'g');

const mediaSelectorPlugin: Plugin = {
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

// Adapted from https://github.com/giuseppeg/postcss-pseudo-classes/blob/master/index.js
const pseudoClassPlugin: Plugin = {
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
          if (!selector.includes(':')) {
            return;
          }

          const selectorParts = selector.split(' ');
          const pseudoedSelectorParts: string[] = [];

          selectorParts.forEach(function (selectorPart) {
            const pseudos = selectorPart.match(/::?([^:]+)/g);

            if (!pseudos) {
              pseudoedSelectorParts.push(selectorPart);
              return;
            }

            const baseSelector = selectorPart.substr(
              0,
              selectorPart.length - pseudos.join('').length,
            );

            const classPseudos = pseudos.map(function (pseudo) {
              const pseudoToCheck = pseudo.replace(/\(.*/g, '');
              if (pseudoToCheck !== ':hover') {
                return pseudo;
              }

              // Ignore pseudo-elements!
              if (pseudo.match(/^::/)) {
                return pseudo;
              }

              // Kill the colon
              pseudo = pseudo.substr(1);

              // Replace left and right parens
              pseudo = pseudo.replace(/\(/g, '\\(');
              pseudo = pseudo.replace(/\)/g, '\\)');

              return '.' + '\\:' + pseudo;
            });

            pseudoedSelectorParts.push(baseSelector + classPseudos.join(''));
          });

          addSelector(pseudoedSelectorParts.join(' '));

          function addSelector(newSelector: string) {
            if (newSelector && newSelector !== selector) {
              rule.selector += ',\n' + newSelector;
            }
          }
        });
      },
    };
  },
};

export { mediaSelectorPlugin, pseudoClassPlugin };
