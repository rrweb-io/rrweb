const rules: (blockClass: string) => string[] = (blockClass: string) => [
  `.${blockClass} { background: currentColor }`,
  'noscript { display: none !important; }',
];

export default rules;
