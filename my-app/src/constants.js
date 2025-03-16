export const THROTTLE_INTERVAL = 200;
export const SMOOTHING_WINDOW_SIZE = 10; // Number of frames to average (adjust based on your THROTTLE_INTERVAL)
export const GREEN_HUE_MIN = 90; // Min green hue in HSV (adjust as needed)
export const GREEN_HUE_MAX = 150; // Max green hue in HSV (adjust as needed)
export const GREEN_SATURATION_MIN = 25; // Min saturation percentage
export const GREEN_VALUE_MIN = 25; // Min value percentage
export const MIN_OBJECT_SIZE = 500; // Minimum area in pixels to consider a valid object
export const NEAR_DISTANCE = 50; // Maximum distance in pixels to consider a green object "near" a landmark