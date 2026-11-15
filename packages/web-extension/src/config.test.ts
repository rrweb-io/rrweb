import { describe, expect, it } from 'vitest';
import { uninstallSurveyUrl } from './config';

describe('uninstallSurveyUrl', () => {
  it('pre-fills the version question and adds nothing else', () => {
    const url = new URL(uninstallSurveyUrl('2.2.2'));
    expect(url.origin + url.pathname).toBe(
      'https://docs.google.com/forms/d/e/1FAIpQLSfy_mh3YstjtPac7rjKmZTbe5V9Vjlnc9Dky7mY-ydVNmSQXg/viewform',
    );
    expect(url.search).toBe('?usp=pp_url&entry.470733856=2.2.2');
  });

  it('encodes a version name with spaces', () => {
    const url = new URL(uninstallSurveyUrl('2.3.0 beta'));
    expect(url.searchParams.get('entry.470733856')).toBe('2.3.0 beta');
  });
});
