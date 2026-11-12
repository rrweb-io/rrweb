const PRODUCTION_CLERK_KEY = 'pk_live_Y2xlcmsucnJ3ZWIuY29tJA';

function withoutTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

export const config: {
  clerkPublishableKey: string;
  clerkSyncHost: string;
  apiUrl: string;
  dashboardUrl: string;
  cloudEnabled: boolean;
  uninstallSurveyUrl: string;
} = {
  clerkPublishableKey:
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || PRODUCTION_CLERK_KEY,
  clerkSyncHost: withoutTrailingSlash(
    import.meta.env.VITE_CLERK_SYNC_HOST || 'https://app.rrweb.com',
  ),
  apiUrl: withoutTrailingSlash(
    import.meta.env.VITE_RRWEB_API_URL || 'https://api.rrweb.com',
  ),
  dashboardUrl: withoutTrailingSlash(
    import.meta.env.VITE_RRWEB_DASHBOARD_URL || 'https://app.rrweb.com',
  ),
  cloudEnabled: import.meta.env.VITE_TARGET_BROWSER !== 'firefox',
  // Opened by the browser after the extension is removed. Carries no user data.
  uninstallSurveyUrl:
    'https://docs.google.com/forms/d/e/1FAIpQLSfy_mh3YstjtPac7rjKmZTbe5V9Vjlnc9Dky7mY-ydVNmSQXg/viewform',
};
