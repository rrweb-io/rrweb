import { extendTheme } from '@chakra-ui/react';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
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
      // The rrweb dashboard's text, panels and rules on the full pages.
      ink: '#DBE2FD',
      inkSoft: 'rgb(219 226 253 / 0.85)',
      inkMuted: 'rgb(219 226 253 / 0.66)',
      surface: '#0F2136',
      rule: 'rgb(219 226 253 / 0.1)',
      input: 'rgb(219 226 253 / 0.17)',
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
    // Checked boxes are white on the dark pages, not Chakra's blue.
    Checkbox: {
      baseStyle: {
        control: {
          borderColor: 'brand.input',
          _checked: {
            bg: 'white',
            borderColor: 'white',
            color: 'brand.accentText',
            _hover: { bg: 'brand.ink', borderColor: 'brand.ink' },
          },
          _indeterminate: {
            bg: 'white',
            borderColor: 'white',
            color: 'brand.accentText',
          },
          _focusVisible: { boxShadow: focusRing },
        },
      },
    },
    Button: {
      baseStyle: { _focusVisible: { boxShadow: focusRing } },
      variants: {
        // A plain bordered button for the full pages.
        quiet: {
          bg: 'transparent',
          color: 'white',
          border: '1px solid',
          borderColor: 'brand.input',
          fontWeight: 600,
          _hover: { bg: 'whiteAlpha.100', _disabled: { bg: 'transparent' } },
          _active: { bg: 'whiteAlpha.200' },
          _focusVisible: { boxShadow: focusRing },
        },
        // Light white outline, the dashboard's pattern. Every state is set so Chakra's defaults never replace it.
        signup: {
          bg: 'rgba(255,255,255,0.06)',
          color: '#F5F7FA',
          border: '1px solid',
          borderColor: 'rgba(255,255,255,0.20)',
          fontWeight: 700,
          fontSize: '15px',
          h: '48px',
          _hover: {
            bg: 'rgba(255,255,255,0.10)',
            borderColor: 'rgba(255,255,255,0.35)',
            _disabled: {
              bg: 'rgba(255,255,255,0.06)',
              borderColor: 'rgba(255,255,255,0.20)',
            },
          },
          _active: { bg: 'rgba(255,255,255,0.14)' },
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
