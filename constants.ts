// 3D Scene Config
export const SCENE_CONFIG = {
  TEXT: "THANKS",
  FONT_SIZE: 120,
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 300,
  PARTICLE_SIZE: 0.15, // Size of individual plane
  PARTICLE_GAP: 2,     // Step size when reading pixels
  DEFAULT_COLOR: 0xffffff,
  BG_COLOR: 0x050505,
};

// Camera Movement Limits
export const CAMERA_LIMITS = {
  MIN_Z: 5,   // Closest (Scatter trigger)
  MAX_Z: 40,  // Furthest
  DEFAULT_Z: 20,
};

// Gesture Physics
export const PHYSICS = {
  PULL_ACCELERATION: 0.1,    // Exponential Ease-In base
  PUSH_VELOCITY: 0.8,        // Initial burst for push
  FRICTION: 0.92,            // Damping factor
  SCATTER_RADIUS: 5,         // How far particles explode
  OK_SCALE_MULTIPLIER: 2.5,  // How much bigger particles get
};

// Hand Landmarks Indices
export const HAND_INDICES = {
  WRIST: 0,
  THUMB_CMC: 1, THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4,
  INDEX_MCP: 5, INDEX_PIP: 6, INDEX_DIP: 7, INDEX_TIP: 8,
  MIDDLE_MCP: 9, MIDDLE_PIP: 10, MIDDLE_DIP: 11, MIDDLE_TIP: 12,
  RING_MCP: 13, RING_PIP: 14, RING_DIP: 15, RING_TIP: 16,
  PINKY_MCP: 17, PINKY_PIP: 18, PINKY_DIP: 19, PINKY_TIP: 20,
};