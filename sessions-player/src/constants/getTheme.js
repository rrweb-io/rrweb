import { config } from '../Config'

export function getTheme(theme) {
  return {
    palette: {
      primary: {
        main: config.primaryColor,
      }
    },
    maxContentWidth: theme.breakpoints.values.md,
  }
}
