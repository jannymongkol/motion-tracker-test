import {
  THROTTLE_INTERVAL,
  SMOOTHING_WINDOW_SIZE,
  GREEN_HUE_MIN,
  GREEN_HUE_MAX,      
  GREEN_SATURATION_MIN,
  GREEN_VALUE_MIN,  
  MIN_OBJECT_SIZE,     
  NEAR_DISTANCE,      
} from './constants';

// Function to adjust video and canvas size based on the actual video dimensions
export const adjustVideoSize = (videoRef, canvasRef, greenCanvasRef) => {
if (!videoRef.current || !canvasRef.current || !greenCanvasRef.current) return;

// Get the actual video stream dimensions
const videoWidth = videoRef.current.videoWidth;
const videoHeight = videoRef.current.videoHeight;

if (!videoWidth || !videoHeight) {
    console.log("Video dimensions not yet available");
    return;
}

console.log(`Setting dimensions from video: ${videoWidth}x${videoHeight}`);

// Get window dimensions
const windowWidth = window.innerWidth;
const windowHeight = window.innerHeight;

// Calculate the aspect ratio from the video
const videoAspectRatio = videoWidth / videoHeight;

let newWidth, newHeight;

if (windowWidth / windowHeight > videoAspectRatio) {
    // Window is wider than video aspect ratio
    newHeight = windowHeight * 0.9; // 90% of window height
    newWidth = newHeight * videoAspectRatio;
} else {
    // Window is taller than video aspect ratio
    newWidth = windowWidth * 0.9; // 90% of window width
    newHeight = newWidth / videoAspectRatio;
}

// Apply dimensions to video display
videoRef.current.style.width = `${newWidth}px`;
videoRef.current.style.height = `${newHeight}px`;

// Set canvas display dimensions to match the video display size
canvasRef.current.style.width = `${newWidth}px`;
canvasRef.current.style.height = `${newHeight}px`;

// Set green canvas display dimensions to match the video display size
greenCanvasRef.current.style.width = `${newWidth}px`;
greenCanvasRef.current.style.height = `${newHeight}px`;

// Important: set the canvas drawing dimensions to match the video's intrinsic dimensions
// This ensures correct coordinate mapping between video and canvas
canvasRef.current.width = videoWidth;
canvasRef.current.height = videoHeight;

// Set the green canvas drawing dimensions
greenCanvasRef.current.width = videoWidth;
greenCanvasRef.current.height = videoHeight;

console.log(`Adjusted sizes - Display: ${newWidth}x${newHeight}, Canvas drawing area: ${videoWidth}x${videoHeight}`);
};