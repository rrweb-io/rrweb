const getBlockStyle: (blockClass: string) => string[] = (blockClass: string) => [
  `iframe, .${blockClass} { background: #ccc }`,
  'noscript { display: none !important; }',
];

export default getBlockStyle;
