export const THROTTLE_INTERVAL = 200;
export const SMOOTHING_WINDOW_SIZE = 10; // Number of frames to average (adjust based on your THROTTLE_INTERVAL)
export const GREEN_HUE_MIN = 90; // Min green hue in HSV (adjust as needed)
export const GREEN_HUE_MAX = 150; // Max green hue in HSV (adjust as needed)
export const GREEN_SATURATION_MIN = 25; // Min saturation percentage
export const GREEN_VALUE_MIN = 25; // Min value percentage
export const MIN_OBJECT_SIZE = 500; // Minimum area in pixels to consider a valid object
export const NEAR_DISTANCE = 50; // Maximum distance in pixels to consider a green object "near" a landmark

export const RED_HUE_MIN1 = 0;     // First red hue range (beginning of spectrum)
export const RED_HUE_MAX1 = 160;    // First red hue range end
export const RED_HUE_MIN2 = 340;   // Second red hue range (end of spectrum) 
export const RED_HUE_MAX2 = 360;   // Second red hue range end
export const RED_SATURATION_MIN = 25;  // Min saturation percentage (increase for more vibrant reds)
export const RED_VALUE_MIN = 25;       // Min value percentage