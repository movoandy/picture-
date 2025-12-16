import { HandGesture, NormalizedLandmarkList } from '../types';
import { HAND_INDICES } from '../constants';

/**
 * Calculates Euclidean distance between two landmarks (ignoring Z for simple gesture checks)
 */
const getDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

/**
 * Determines if a specific finger is extended
 */
const isFingerExtended = (landmarks: NormalizedLandmarkList, fingerName: 'INDEX' | 'MIDDLE' | 'RING' | 'PINKY') => {
  const tipIndex = HAND_INDICES[`${fingerName}_TIP` as keyof typeof HAND_INDICES];
  const pipIndex = HAND_INDICES[`${fingerName}_PIP` as keyof typeof HAND_INDICES];
  
  // Simple check: Tip is higher (smaller y) than PIP joint? 
  // Note: This logic assumes hand is pointing up. A more robust way is distance from wrist.
  // Robust method: Distance from Wrist to Tip > Distance from Wrist to PIP
  const wrist = landmarks[HAND_INDICES.WRIST];
  const tip = landmarks[tipIndex];
  const pip = landmarks[pipIndex];

  return getDistance(wrist, tip) > getDistance(wrist, pip);
};

export const analyzeGesture = (landmarks: NormalizedLandmarkList): HandGesture => {
  if (!landmarks || landmarks.length === 0) return HandGesture.NONE;

  const thumbTip = landmarks[HAND_INDICES.THUMB_TIP];
  const indexTip = landmarks[HAND_INDICES.INDEX_TIP];
  const wrist = landmarks[HAND_INDICES.WRIST];

  const indexExtended = isFingerExtended(landmarks, 'INDEX');
  const middleExtended = isFingerExtended(landmarks, 'MIDDLE');
  const ringExtended = isFingerExtended(landmarks, 'RING');
  const pinkyExtended = isFingerExtended(landmarks, 'PINKY');

  // 1. Check for OK Sign
  // Thumb tip and Index tip are close, other fingers are extended
  const thumbIndexDist = getDistance(thumbTip, indexTip);
  if (thumbIndexDist < 0.05 && middleExtended && ringExtended && pinkyExtended) {
    return HandGesture.OK_SIGN;
  }

  // 2. Check for Fist
  // All fingers (except maybe thumb) are curled (not extended)
  if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return HandGesture.FIST;
  }

  // 3. Check for Open Palm
  // All fingers extended
  if (indexExtended && middleExtended && ringExtended && pinkyExtended) {
    return HandGesture.OPEN_PALM;
  }

  return HandGesture.NONE;
};

/**
 * Estimates Z-depth based on hand size (Palm bounding box size relative to frame)
 * Returning a normalized value 0-1 where 1 is very close, 0 is far.
 */
export const estimateHandProximity = (landmarks: NormalizedLandmarkList): number => {
  const wrist = landmarks[HAND_INDICES.WRIST];
  const middleFingerMCP = landmarks[HAND_INDICES.MIDDLE_MCP];
  
  // Calculate size of the palm
  const palmSize = getDistance(wrist, middleFingerMCP);
  
  // Normalize: Assuming palmSize varies roughly between 0.1 (far) and 0.5 (close)
  // Clamp between 0 and 1
  return Math.min(Math.max((palmSize - 0.1) / 0.4, 0), 1);
};