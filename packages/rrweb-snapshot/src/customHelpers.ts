export const shouldTryAnonymousFetchingOnCorsError = () => {
  return !(
    '_rrweb_skip_re_fetching_to_suppress_cors_errors' in window &&
    window._rrweb_skip_re_fetching_to_suppress_cors_errors === true
  );
};
