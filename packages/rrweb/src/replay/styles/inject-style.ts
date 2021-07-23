const rules: (blockClass: string) => string[] = (blockClass: string) => [
  `.${blockClass} { background: #ccc }`,
  'noscript { display: none !important; }',
];

export default rules;
