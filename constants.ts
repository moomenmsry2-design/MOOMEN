
export const GEMINI_MODEL_FAST = 'gemini-2.5-flash';
export const GEMINI_MODEL_REASONING = 'gemini-2.5-flash'; // Using flash for responsiveness, can upgrade to pro
export const GEMINI_MODEL_IMAGE = 'gemini-2.5-flash-image';

// Physics Constants
export const TIME_STEP = 0.1; // seconds per frame in calculation
export const MAX_TIME = 20; // Max seconds to simulate graph
export const TRACK_LENGTH = 100; // Meters visually represented

// Colors
export const COLOR_BODY_A = '#4CC9F0'; // Neon Blue
export const COLOR_BODY_B = '#F72585'; // Neon Pink

// Initial State
export const INITIAL_BODY_A = {
  id: 'A',
  name: 'Object A',
  x0: 0,
  v0: 5,
  a: 0,
  color: COLOR_BODY_A,
};

export const INITIAL_BODY_B = {
  id: 'B',
  name: 'Object B',
  x0: 50,
  v0: -2,
  a: 0,
  color: COLOR_BODY_B,
};
