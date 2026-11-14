import { dashboardUrlFrom, withoutTrailingSlash } from './dashboardUrl';

export const config: {
  apiUrl: string;
  dashboardUrl: string;
  cloudEnabled: boolean;
  uninstallSurveyUrl: string;
  uninstallSurveyVersionField: string;
  privacyPolicyUrl: string;
} = {
  apiUrl: withoutTrailingSlash(
    import.meta.env.VITE_RRWEB_API_URL || 'https://api.rrweb.com',
  ),
  dashboardUrl: dashboardUrlFrom(import.meta.env.VITE_RRWEB_DASHBOARD_URL),
  cloudEnabled: import.meta.env.VITE_TARGET_BROWSER !== 'firefox',
  // Opened by the browser after the extension is removed. The only value added
  // to it is the extension version, in the form's "Which version" question.
  uninstallSurveyUrl:
    'https://docs.google.com/forms/d/e/1FAIpQLSfy_mh3YstjtPac7rjKmZTbe5V9Vjlnc9Dky7mY-ydVNmSQXg/viewform',
  uninstallSurveyVersionField: 'entry.470733856',
  privacyPolicyUrl: 'https://rrweb.com/privacy',
};

export function uninstallSurveyUrl(version: string): string {
  const url = new URL(config.uninstallSurveyUrl);
  url.searchParams.set('usp', 'pp_url');
  url.searchParams.set(config.uninstallSurveyVersionField, version);
  return url.href;
}

/** Where the dashboard shows a cloud recording. */
export const dashboardRecordingUrl = (recordingId: string) =>
  `${config.dashboardUrl}/recordings/${recordingId}`;

/** The extension's list of offline sessions. */
export const SESSIONS_PAGE = '/pages/index.html#/';
/** The extension's player for one offline session. */
export const sessionPage = (sessionId: string) =>
  `${SESSIONS_PAGE}session/${sessionId}`;

/** The dashboard page that connects an organization to this extension. */
export const connectUrl = () => `${config.dashboardUrl}/extension/connect`;
// Clerk returns new accounts to `redirect_url`, so they land back on connect.
export const signUpUrl = () =>
  `${config.dashboardUrl}/signup?redirect_url=${encodeURIComponent(
    connectUrl(),
  )}`;
