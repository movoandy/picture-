// Enums for Gestures
export enum HandGesture {
  NONE = 'NONE',
  FIST = 'FIST',
  OPEN_PALM = 'OPEN_PALM',
  OK_SIGN = 'OK_SIGN',
}

// MediaPipe Type Definitions (since we use CDN)
export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface NormalizedLandmarkList extends Array<Landmark> {}

export interface Results {
  multiHandLandmarks: NormalizedLandmarkList[];
  multiHandedness: any[];
  image: any;
}

export interface HandsOptions {
  maxNumHands?: number;
  modelComplexity?: number;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
}

export interface Hands {
  setOptions(options: HandsOptions): void;
  onResults(callback: (results: Results) => void): void;
  send(input: { image: HTMLVideoElement }): Promise<void>;
  close(): Promise<void>;
}

// Window interface extension to include MediaPipe globals
declare global {
  interface Window {
    Hands: new (config?: { locateFile: (file: string) => string }) => Hands;
    Camera: new (video: HTMLVideoElement, config: { onFrame: () => Promise<void>, width: number, height: number }) => { start: () => Promise<void> };
  }
}