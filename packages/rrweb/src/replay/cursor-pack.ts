// 32x32 cursor images as [svg markup, hotspot x, hotspot y]
export const cursors: Record<string, [string, number, number]> = {
  alias: [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M4 3 L4 23 L9.2 18.4 L13 27 L17 25.3 L13.3 16.8 L20 16.4 Z" fill="#1A1A1A" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/><circle cx="23" cy="23" r="6.5" fill="#FFFFFF" stroke="#1A1A1A" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/><path d="M19.5 25.5 Q20 20.5 25.5 20.5 M23.5 18.5 L26 20.7 L23.5 22.9" fill="none" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    4,
    3,
  ],
  'all-scroll': [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g transform="translate(16 16)" fill="#1A1A1A" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><path d="M-1.8 -1.8 L-1.8 -5.7 L-4.5 -5.7 L0 -11 L4.5 -5.7 L1.8 -5.7 L1.8 -1.8 L5.7 -1.8 L5.7 -4.5 L11 0 L5.7 4.5 L5.7 1.8 L1.8 1.8 L1.8 5.7 L4.5 5.7 L0 11 L-4.5 5.7 L-1.8 5.7 L-1.8 1.8 L-5.7 1.8 L-5.7 4.5 L-11 0 L-5.7 -4.5 L-5.7 -1.8 Z"/></g><circle cx="16" cy="16" r="2.4" fill="#FFFFFF" stroke="#1A1A1A" stroke-width="1.2"/></svg>',
    16,
    16,
  ],
  cell: [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M14 6 L18 6 L18 14 L26 14 L26 18 L18 18 L18 26 L14 26 L14 18 L6 18 L6 14 L14 14 Z" fill="#1A1A1A" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>',
    16,
    16,
  ],
  'col-resize': [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M16 5 L16 27" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 5 L16 27" fill="none" stroke="#1A1A1A" stroke-width="2.2" stroke-linecap="round"/><g transform="translate(16 16) rotate(0)"><path d="M-10 0 L-5.5 -4.5 L-5.5 -2.2 L5.5 -2.2 L5.5 -4.5 L10 0 L5.5 4.5 L5.5 2.2 L-5.5 2.2 L-5.5 4.5 Z" fill="#1A1A1A" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></g></svg>',
    16,
    16,
  ],
  'context-menu': [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M4 3 L4 23 L9.2 18.4 L13 27 L17 25.3 L13.3 16.8 L20 16.4 Z" fill="#1A1A1A" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/><rect x="18" y="19" width="11" height="10" rx="1.5" fill="#FFFFFF" stroke="#1A1A1A" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/><path d="M20.5 22 L26.5 22 M20.5 24.5 L26.5 24.5 M20.5 27 L24 27" fill="none" stroke="#1A1A1A" stroke-width="1.2" stroke-linecap="round"/></svg>',
    4,
    3,
  ],
  copy: [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M4 3 L4 23 L9.2 18.4 L13 27 L17 25.3 L13.3 16.8 L20 16.4 Z" fill="#1A1A1A" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/><circle cx="23" cy="23" r="6.5" fill="#FFFFFF" stroke="#1A1A1A" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/><path d="M19.5 23 L26.5 23 M23 19.5 L23 26.5" fill="none" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    4,
    3,
  ],
  crosshair: [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M16 4 L16 28 M4 16 L28 16" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 4 L16 28 M4 16 L28 16" fill="none" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="16" r="1.6" fill="#FFFFFF"/></svg>',
    16,
    16,
  ],
  default: [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M4 3 L4 23 L9.2 18.4 L13 27 L17 25.3 L13.3 16.8 L20 16.4 Z" fill="#1A1A1A" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>',
    4,
    3,
  ],
  'ew-resize': [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g transform="translate(16 16) rotate(0)"><path d="M-11 0 L-6 -5 L-6 -2.2 L6 -2.2 L6 -5 L11 0 L6 5 L6 2.2 L-6 2.2 L-6 5 Z" fill="#1A1A1A" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></g></svg>',
    16,
    16,
  ],
  grab: [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M9 11 Q9 8.5 11 8.5 Q13 8.5 13 11 L13 13 L13 6 Q13 3.5 15.2 3.5 Q17.4 3.5 17.4 6 L17.4 13 L17.4 5.5 Q17.4 3 19.6 3 Q21.8 3 21.8 5.5 L21.8 14 L21.8 10.5 Q21.8 8.5 23.6 8.5 Q25.4 8.5 25.4 10.5 L25.4 15 Q26.2 16 26.2 19 Q26.2 29 18 29 L15.5 29 Q11.5 29 9.5 25.5 L4.5 17.5 Q3.5 15.5 5.2 14.5 Q6.8 13.6 8 15 L9 16.5 Z" fill="#1A1A1A" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/><path d="M13 13 L13 17 M17.4 13 L17.4 17 M21.8 14 L21.8 17" fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/></svg>',
    15,
    11,
  ],
  grabbing: [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M9.5 15 Q9.5 12.5 11.5 12.5 Q13.3 12.5 13.5 14.5 L13.5 13.5 Q13.5 11 15.7 11 Q17.9 11 17.9 13.5 L17.9 12.5 Q17.9 10 20.1 10 Q22.3 10 22.3 12.5 L22.3 13.5 Q22.3 11.5 24.3 11.5 Q26.5 11.5 26.5 14 L26.5 20 Q26.5 29 18.5 29 L16 29 Q12 29 10 25.5 L6 20.5 Q5 18.5 6.6 17.3 Q8.2 16.3 9.5 17.6 Z" fill="#1A1A1A" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/><path d="M13.5 15 L13.5 18 M17.9 14 L17.9 18 M22.3 14 L22.3 18" fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/></svg>',
    15,
    14,
  ],
  help: [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M4 3 L4 23 L9.2 18.4 L13 27 L17 25.3 L13.3 16.8 L20 16.4 Z" fill="#1A1A1A" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/><circle cx="23" cy="23" r="6.5" fill="#FFFFFF" stroke="#1A1A1A" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/><path d="M20.6 21 Q20.8 18.6 23.2 18.6 Q25.6 18.6 25.6 20.6 Q25.6 22 23.4 22.8 L23.3 24.2" fill="none" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="23.3" cy="26.4" r="1.1" fill="#1A1A1A"/></svg>',
    4,
    3,
  ],
  move: [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g transform="translate(16 16)" fill="#1A1A1A" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><path d="M-1.8 -1.8 L-1.8 -5.7 L-4.5 -5.7 L0 -11 L4.5 -5.7 L1.8 -5.7 L1.8 -1.8 L5.7 -1.8 L5.7 -4.5 L11 0 L5.7 4.5 L5.7 1.8 L1.8 1.8 L1.8 5.7 L4.5 5.7 L0 11 L-4.5 5.7 L-1.8 5.7 L-1.8 1.8 L-5.7 1.8 L-5.7 4.5 L-11 0 L-5.7 -4.5 L-5.7 -1.8 Z"/></g></svg>',
    16,
    16,
  ],
  'nesw-resize': [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g transform="translate(16 16) rotate(-45)"><path d="M-11 0 L-6 -5 L-6 -2.2 L6 -2.2 L6 -5 L11 0 L6 5 L6 2.2 L-6 2.2 L-6 5 Z" fill="#1A1A1A" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></g></svg>',
    16,
    16,
  ],
  'no-drop': [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M4 3 L4 23 L9.2 18.4 L13 27 L17 25.3 L13.3 16.8 L20 16.4 Z" fill="#1A1A1A" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/><circle cx="23" cy="23" r="7.0" fill="#FFFFFF"/><circle cx="23" cy="23" r="5.5" fill="none" stroke="#C62828" stroke-width="3"/><path d="M19.15 19.15 L26.85 26.85" fill="none" stroke="#C62828" stroke-width="3" stroke-linecap="round"/></svg>',
    4,
    3,
  ],
  none: [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"></svg>',
    16,
    16,
  ],
  'not-allowed': [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="11.5" fill="#FFFFFF"/><circle cx="16" cy="16" r="10" fill="none" stroke="#C62828" stroke-width="3"/><path d="M9.00 9.00 L23.00 23.00" fill="none" stroke="#C62828" stroke-width="3" stroke-linecap="round"/></svg>',
    16,
    16,
  ],
  'ns-resize': [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g transform="translate(16 16) rotate(90)"><path d="M-11 0 L-6 -5 L-6 -2.2 L6 -2.2 L6 -5 L11 0 L6 5 L6 2.2 L-6 2.2 L-6 5 Z" fill="#1A1A1A" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></g></svg>',
    16,
    16,
  ],
  'nwse-resize': [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g transform="translate(16 16) rotate(45)"><path d="M-11 0 L-6 -5 L-6 -2.2 L6 -2.2 L6 -5 L11 0 L6 5 L6 2.2 L-6 2.2 L-6 5 Z" fill="#1A1A1A" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></g></svg>',
    16,
    16,
  ],
  'pen-tip': [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="5" fill="#FFFFFF" stroke="#1A1A1A" stroke-width="2"/><circle cx="16" cy="16" r="1.6" fill="#1A1A1A"/></svg>',
    16,
    16,
  ],
  pointer: [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M12 8.5 Q12 6 14.5 6 Q17 6 17 8.5 L17 14 L19 14 Q21 13.8 21.5 15 L23.5 15 Q25.5 15 26 16.6 L27.5 16.6 Q29.5 17 29.5 19.5 L29.5 23.5 Q29.5 29.5 23.5 29.5 L17 29.5 Q13 29.5 11 26.5 L6.5 20 Q5.5 18 7 17 Q8.5 16.2 10 17.5 L12 19.8 Z" fill="#1A1A1A" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/><path d="M17 15.5 L17 21 M21.5 16 L21.5 21 M26 17.5 L26 21" fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/></svg>',
    14,
    6,
  ],
  progress: [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M4 3 L4 23 L9.2 18.4 L13 27 L17 25.3 L13.3 16.8 L20 16.4 Z" fill="#1A1A1A" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/><circle cx="24" cy="24" r="8.0" fill="#FFFFFF" stroke="none" opacity="0.9"/><line x1="26.00" y1="24.00" x2="29.50" y2="24.00" stroke="#1A1A1A" stroke-width="2.2" stroke-linecap="round" opacity="0.25"/><line x1="25.41" y1="25.41" x2="27.89" y2="27.89" stroke="#1A1A1A" stroke-width="2.2" stroke-linecap="round" opacity="0.36"/><line x1="24.00" y1="26.00" x2="24.00" y2="29.50" stroke="#1A1A1A" stroke-width="2.2" stroke-linecap="round" opacity="0.46"/><line x1="22.59" y1="25.41" x2="20.11" y2="27.89" stroke="#1A1A1A" stroke-width="2.2" stroke-linecap="round" opacity="0.57"/><line x1="22.00" y1="24.00" x2="18.50" y2="24.00" stroke="#1A1A1A" stroke-width="2.2" stroke-linecap="round" opacity="0.68"/><line x1="22.59" y1="22.59" x2="20.11" y2="20.11" stroke="#1A1A1A" stroke-width="2.2" stroke-linecap="round" opacity="0.79"/><line x1="24.00" y1="22.00" x2="24.00" y2="18.50" stroke="#1A1A1A" stroke-width="2.2" stroke-linecap="round" opacity="0.89"/><line x1="25.41" y1="22.59" x2="27.89" y2="20.11" stroke="#1A1A1A" stroke-width="2.2" stroke-linecap="round" opacity="1.00"/></svg>',
    4,
    3,
  ],
  'row-resize': [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M5 16 L27 16" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 16 L27 16" fill="none" stroke="#1A1A1A" stroke-width="2.2" stroke-linecap="round"/><g transform="translate(16 16) rotate(90)"><path d="M-10 0 L-5.5 -4.5 L-5.5 -2.2 L5.5 -2.2 L5.5 -4.5 L10 0 L5.5 4.5 L5.5 2.2 L-5.5 2.2 L-5.5 4.5 Z" fill="#1A1A1A" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></g></svg>',
    16,
    16,
  ],
  text: [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M11 4 Q13.5 4 15 6 Q16.5 4 19 4 L19 7 Q17.5 7 17 8.5 L17 23.5 Q17.5 25 19 25 L19 28 Q16.5 28 15 26 Q13.5 28 11 28 L11 25 Q12.5 25 13 23.5 L13 8.5 Q12.5 7 11 7 Z" fill="#1A1A1A" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>',
    15,
    16,
  ],
  'vertical-text': [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g transform="rotate(90 16 16)"><path d="M11 4 Q13.5 4 15 6 Q16.5 4 19 4 L19 7 Q17.5 7 17 8.5 L17 23.5 Q17.5 25 19 25 L19 28 Q16.5 28 15 26 Q13.5 28 11 28 L11 25 Q12.5 25 13 23.5 L13 8.5 Q12.5 7 11 7 Z" fill="#1A1A1A" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></g></svg>',
    16,
    15,
  ],
  wait: [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="11.5" fill="#FFFFFF" stroke="none" opacity="0.9"/><line x1="21.50" y1="16.00" x2="25.00" y2="16.00" stroke="#1A1A1A" stroke-width="3.5" stroke-linecap="round" opacity="0.25"/><line x1="19.89" y1="19.89" x2="22.36" y2="22.36" stroke="#1A1A1A" stroke-width="3.5" stroke-linecap="round" opacity="0.36"/><line x1="16.00" y1="21.50" x2="16.00" y2="25.00" stroke="#1A1A1A" stroke-width="3.5" stroke-linecap="round" opacity="0.46"/><line x1="12.11" y1="19.89" x2="9.64" y2="22.36" stroke="#1A1A1A" stroke-width="3.5" stroke-linecap="round" opacity="0.57"/><line x1="10.50" y1="16.00" x2="7.00" y2="16.00" stroke="#1A1A1A" stroke-width="3.5" stroke-linecap="round" opacity="0.68"/><line x1="12.11" y1="12.11" x2="9.64" y2="9.64" stroke="#1A1A1A" stroke-width="3.5" stroke-linecap="round" opacity="0.79"/><line x1="16.00" y1="10.50" x2="16.00" y2="7.00" stroke="#1A1A1A" stroke-width="3.5" stroke-linecap="round" opacity="0.89"/><line x1="19.89" y1="12.11" x2="22.36" y2="9.64" stroke="#1A1A1A" stroke-width="3.5" stroke-linecap="round" opacity="1.00"/></svg>',
    16,
    16,
  ],
  'zoom-in': [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M22.5 22.5 L29 29" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M22.5 22.5 L29 29" fill="none" stroke="#1A1A1A" stroke-width="3" stroke-linecap="round"/><circle cx="16" cy="14" r="9" fill="#FFFFFF" stroke="#1A1A1A" stroke-width="2"/><path d="M12 14 L20 14 M16 10 L16 18" fill="none" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    16,
    14,
  ],
  'zoom-out': [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M22.5 22.5 L29 29" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M22.5 22.5 L29 29" fill="none" stroke="#1A1A1A" stroke-width="3" stroke-linecap="round"/><circle cx="16" cy="14" r="9" fill="#FFFFFF" stroke="#1A1A1A" stroke-width="2"/><path d="M12 14 L20 14" fill="none" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    16,
    14,
  ],
};
