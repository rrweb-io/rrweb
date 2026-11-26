const rules: (blockClass: string) => string[] = (blockClass: string) => [
  `.${blockClass} { background: currentColor }`,
  'noscript { display: none !important; }',
  // Phone browsers enlarge text in pages they consider too small to read. A
  // replay is usually shown scaled down, so the enlarged text would no longer
  // fit the recorded layout. This comes before the recorded page's styles, so
  // a page that sets text-size-adjust in an ordinary html rule keeps its own
  // value. One set inside a CSS cascade layer loses to this rule; wrapping it
  // in @layer would need a fallback for browsers that cannot parse it.
  'html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }',
];

export default rules;
