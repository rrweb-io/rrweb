export const maskedEditingAttribute = 'data-rrweb-masked-editing';

const rules: (blockClass: string) => string[] = (blockClass: string) => [
  `.${blockClass} { background: currentColor }`,
  'noscript { display: none !important; }',
  `input[${maskedEditingAttribute}="true"], textarea[${maskedEditingAttribute}="true"], select[${maskedEditingAttribute}="true"] { filter: blur(4px) !important; }`,
];

export default rules;
