import { extendTheme } from '@chakra-ui/react';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';

const fontFamily = "'Space Grotesk', system-ui, sans-serif";
// A navy gap keeps the ring visible around the yellow sign-up button.
const focusRing = '0 0 0 2px #0D2035, 0 0 0 4px #EEC202';

export const theme = extendTheme({
  config: { initialColorMode: 'dark', useSystemColorMode: false },
  fonts: { heading: fontFamily, body: fontFamily },
  radii: { md: '0.625rem', lg: '0.625rem', xl: '0.625rem' },
  // Chakra draws every focus-visible ring from this token.
  shadows: { outline: focusRing },
  colors: {
    brand: {
      bg: '#0D2035',
      accent: '#EEC202',
      accentHover: '#DDB400',
      accentActive: '#C9A400',
      accentText: '#0A1325',
      muted: '#8FA0B5',
      pitch: '#C9D2DE',
      line: '#2E4560',
      field: '#0A1828',
      // Hover and active fills for navigation on the full pages.
      hover: '#16304D',
      active: '#21436A',
      // Error text: the record red is under 4.5:1 on navy at small sizes.
      danger: '#FF9592',
    },
    record: { 500: '#E5484D', 600: '#DC3E42', 700: '#CE2C31' },
  },
  styles: {
    global: {
      body: { bg: '#0D2035', color: 'white' },
      a: { color: 'white', textDecoration: 'underline' },
    },
  },
  components: {
    // A global `a` rule loses to Chakra's Link class, so links are styled here.
    Link: {
      baseStyle: {
        color: 'white',
        textDecoration: 'underline',
        _hover: { color: 'white', textDecoration: 'underline' },
        _focusVisible: { boxShadow: focusRing },
      },
    },
    Button: {
      baseStyle: { _focusVisible: { boxShadow: focusRing } },
      variants: {
        // Every interactive state is set here so Chakra's defaults never
        // replace the solid fill.
        signup: {
          bg: 'brand.accent',
          color: 'brand.accentText',
          fontWeight: 700,
          fontSize: '15px',
          h: '48px',
          _hover: {
            bg: 'brand.accentHover',
            _disabled: { bg: 'brand.accent' },
          },
          _active: { bg: 'brand.accentActive' },
          _focusVisible: { boxShadow: focusRing },
        },
        record: {
          bg: 'record.500',
          color: 'white',
          fontWeight: 700,
          fontSize: '14px',
          h: '44px',
          _hover: { bg: 'record.600', _disabled: { bg: 'record.500' } },
          _active: { bg: 'record.700' },
          _focusVisible: { boxShadow: focusRing },
          // aria-busy: a start is in flight. Same look, no hover change.
          _loading: { cursor: 'progress', _hover: { bg: 'record.500' } },
        },
      },
    },
  },
});
