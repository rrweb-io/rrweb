import type { CaptionPosition } from './types';

const positions: readonly CaptionPosition[] = [
  'top-left',
  'top',
  'top-right',
  'left',
  'center',
  'right',
  'bottom-left',
  'bottom',
  'bottom-right',
];

export type ResolvedCaptionStyle = {
  position: CaptionPosition;
  fontSize?: string;
  color?: string;
  background?: string;
  textShadow?: string;
};

function cssValue(property: string, value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return;
  if (typeof CSS === 'undefined' || !CSS.supports(property, value)) return;
  return value;
}

/** An eight-way shadow ring scales with the text and draws outside the glyphs. */
function outlineShadow(color: string): string {
  const w = '0.06em';
  return [
    [`-${w}`, `-${w}`],
    ['0', `-${w}`],
    [w, `-${w}`],
    [`-${w}`, '0'],
    [w, '0'],
    [`-${w}`, w],
    ['0', w],
    [w, w],
  ]
    .map(([x, y]) => `${x} ${y} 0 ${color}`)
    .join(', ');
}

/** Unknown or malformed values keep the default caption look. */
export function resolveCaptionStyle(style: unknown): ResolvedCaptionStyle {
  const s: Record<string, unknown> =
    typeof style === 'object' && style !== null
      ? (style as Record<string, unknown>)
      : {};
  const outline = cssValue('color', s.outline);
  // CSS-wide keywords such as `inherit` are valid colors but not shadow colors.
  const textShadow = outline && cssValue('text-shadow', outlineShadow(outline));
  return {
    position: positions.find((p) => p === s.position) ?? 'bottom',
    fontSize: cssValue('font-size', s.fontSize),
    color: cssValue('color', s.color),
    background: cssValue('background-color', s.background),
    textShadow,
  };
}
