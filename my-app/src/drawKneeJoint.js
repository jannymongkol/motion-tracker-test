
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

// Custom function to draw knee joints
export const drawKneeJoint = (canvasCtxRef, canvasRef, setAreLandmarksShown, kneePoint, side) => {
if (!canvasCtxRef.current || !kneePoint || !canvasRef.current) return;

// Set the indicator that landmarks are drawn
setAreLandmarksShown(true);

const ctx = canvasCtxRef.current;
const radius = 10; // Size of the knee point
const canvasWidth = canvasRef.current.width;

// Calculate flipped X coordinate to match the mirrored view
const flippedX = canvasWidth - (kneePoint.x * canvasWidth);
const y = kneePoint.y * canvasRef.current.height;

// Set different colors for left and right knees
// if (side === "left") {
ctx.fillStyle = "#4CAF50"; // Green for left knee
// } else {
    // ctx.fillStyle = "#2196F3"; // Blue for right knee
// }

// Draw the knee point with flipped X coordinate
ctx.beginPath();
ctx.arc(
    flippedX,
    y,
    radius,
    0,
    2 * Math.PI
);
ctx.fill();

// Add a border
ctx.strokeStyle = "#FFFFFF";
ctx.lineWidth = 2;
ctx.stroke();

// Add a label with flipped X coordinate
ctx.fillStyle = "#FFFFFF";
ctx.font = "16px Arial";
ctx.textAlign = "center";
// ctx.fillText(
//     side === "left" ? "L Knee" : "R Knee",
//     flippedX,
//     y - 15
// );
};