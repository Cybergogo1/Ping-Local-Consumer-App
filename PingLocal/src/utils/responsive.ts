import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Breakpoints
export const BREAKPOINTS = {
  SMALL: 380,
  LARGE: 420,
};

export type DeviceSize = 'small' | 'medium' | 'large';

export const getDeviceSize = (): DeviceSize => {
  if (SCREEN_WIDTH < BREAKPOINTS.SMALL) return 'small';
  if (SCREEN_WIDTH >= BREAKPOINTS.LARGE) return 'large';
  return 'medium';
};

export const deviceSize = getDeviceSize();
export const isSmallDevice = deviceSize === 'small';

// Scale factor: reduces values by ~10% on small devices
const SCALE_FACTORS: Record<DeviceSize, number> = {
  small: 0.9,
  medium: 1,
  large: 1,
};

// Scale a value based on device size
export const scale = (size: number): number => {
  return Math.round(size * SCALE_FACTORS[deviceSize]);
};

// For images: constrain to max percentage of screen while preserving aspect ratio
export const constrainedImageSize = (
  originalWidth: number,
  originalHeight: number,
  maxWidthPercent: number = 0.9,
  maxHeightPercent: number = 0.35
): { width: number; height: number } => {
  const maxWidth = SCREEN_WIDTH * maxWidthPercent;
  const maxHeight = SCREEN_HEIGHT * maxHeightPercent;
  const aspectRatio = originalWidth / originalHeight;

  let width = maxWidth;
  let height = width / aspectRatio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return { width: Math.round(width), height: Math.round(height) };
};

// Screen dimensions for convenience
export const screen = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
};
