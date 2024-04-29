import type { Plugin } from 'postcss';

const MEDIA_SELECTOR = /(max|min)-device-(width|height)/;
const MEDIA_SELECTOR_GLOBAL = new RegExp(MEDIA_SELECTOR.source, 'g');

const creator: Plugin = {
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

export default creator;
