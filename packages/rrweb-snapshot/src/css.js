const MEDIA_SELECTOR = /(max|min)-device-(width|height)/;
const MEDIA_SELECTOR_GLOBAL = new RegExp(MEDIA_SELECTOR.source, 'g');
const mediaSelectorPlugin = {
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
const pseudoClassPlugin = {
    postcssPlugin: 'postcss-hover-classes',
    prepare: function () {
        const fixed = [];
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
//# sourceMappingURL=css.js.map