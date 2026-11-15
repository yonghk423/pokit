// Small silhouettes stay legible around a 75 × 53 camera, with motion tuned to its material.
export const cameraMotionProfiles = {
  'mini-evo': { color: '#D8E5EA', duration: 680, lift: 1.5, tilt: -1, drift: -5, turn: 20, path: 'M12 1L15 9L23 12L15 15L12 23L9 15L1 12L9 9Z' },
  'mini-12': { color: '#A9C6DF', duration: 760, lift: 4, tilt: 2, drift: -9, turn: -12, path: 'M12 2A10 10 0 1 0 12 22A10 10 0 1 0 12 2ZM12 6A6 6 0 1 1 12 18A6 6 0 1 1 12 6Z' },
  'polaroid-now': { color: '#D97B63', duration: 820, lift: 2, tilt: -2, drift: -7, turn: 8, path: 'M2 3H22V23H2ZM5 6V17H19V6ZM7 19H17V21H7Z' },
  'kodak-mini-shot': { color: '#D4A52F', duration: 720, lift: 3, tilt: 1.5, drift: -6, turn: 15, path: 'M2 5H22V20H2ZM6 8V17H18V8ZM3 6V8H5V6ZM19 6V8H21V6ZM3 17V19H5V17ZM19 17V19H21V17Z' },
  'leica-sofort-2': { color: '#C44A43', duration: 640, lift: 1, tilt: -0.8, drift: -4, turn: 60, path: 'M12 2L21 7V17L12 22L3 17V7ZM12 7L7 10V15L12 18L17 15V10Z' },
  'decor-cat-camera': { color: '#A67A61', duration: 800, lift: 3, tilt: -3, drift: -8, turn: -18, path: 'M6 12C3 7 1 9 2 13C3 16 7 16 6 12ZM11 7C10 2 6 3 7 8C8 11 12 11 11 7ZM17 7C18 2 22 4 20 9C18 12 16 11 17 7ZM21 12C24 8 26 12 23 15C21 17 19 15 21 12ZM7 18C10 11 16 11 19 18C23 25 12 21 9 23C5 24 3 21 7 18Z' },
  'decor-shell-camera': { color: '#B3A7CE', duration: 980, lift: 1.5, tilt: 1, drift: -12, turn: 8, path: 'M12 3C3 -1 -2 10 4 16L12 22L20 16C27 8 20 -1 12 3ZM11 6H13V18H11ZM5 7L10 18L8 19L3 8ZM19 7L21 8L16 19L14 18Z' },
  'decor-chick-camera': { color: '#E7B94B', duration: 780, lift: 4.5, tilt: 3, drift: -9, turn: -20, path: 'M13 3C15 -1 20 0 20 4C26 5 25 11 20 12C18 17 12 14 12 10C6 8 8 3 13 3ZM5 13C1 15 0 21 2 24C7 23 11 20 10 16Z' },
  'decor-ribbon-camera': { color: '#D997AA', duration: 920, lift: 2.5, tilt: -4, drift: -9, turn: 25, path: 'M11 10C0 -2 -5 17 10 14L6 24L11 21L13 15L17 24L20 20L15 13C30 18 28 -2 14 10ZM11 10H15V15H11Z' },
  'decor-berry-camera': { color: '#C9666C', duration: 860, lift: 3, tilt: 2.5, drift: -8, turn: -24, path: 'M12 8C-1 1 2 18 12 24C23 17 26 0 12 8ZM10 11H12V14H10ZM15 15H17V18H15ZM7 16H9V19H7ZM8 2L12 5L17 1L16 6L22 7L14 10L9 8L3 7L9 5Z' },
  'decor-stamp-camera': { color: '#80A899', duration: 740, lift: 1.5, tilt: -2, drift: -5, turn: -12, path: 'M2 2H6V4H10V2H14V4H18V2H22V6H20V10H22V14H20V18H22V22H18V20H14V22H10V20H6V22H2V18H4V14H2V10H4V6H2ZM7 7V17H17V7Z' },
  'mini-bunny': { color: '#B0BBD7', duration: 900, lift: 5, tilt: -2, drift: -10, turn: 12, path: 'M7 13C0 -3 10 -5 11 12H14C16 -5 25 -2 19 14C27 28 -3 29 7 13ZM7 20A1 1 0 1 0 9 20A1 1 0 1 0 7 20ZM16 20A1 1 0 1 0 18 20A1 1 0 1 0 16 20Z' },
  'mini-toast': { color: '#D6A16A', duration: 1020, lift: 3.5, tilt: 1, drift: -13, turn: 0, path: 'M4 24C-2 16 11 13 5 4L8 2C16 15 1 17 7 23ZM13 24C7 16 20 11 14 3L17 1C25 13 10 18 16 23Z' },
  'mini-mail': { color: '#92A476', duration: 950, lift: 2, tilt: -2.5, drift: -11, turn: -16, path: 'M12 10C0 -5 -5 12 9 12C-5 18 6 30 12 16C18 30 30 18 16 12C30 8 18 -6 12 10ZM12 14H14L19 25H16Z' },
} as const;
