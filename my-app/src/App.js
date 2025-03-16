import React, { useEffect, useState, useRef, useCallback } from 'react';
import './App.css';

const THROTTLE_INTERVAL = 200;
const SMOOTHING_WINDOW_SIZE = 10; // Number of frames to average (adjust based on your THROTTLE_INTERVAL)

// Color detection settings
const GREEN_HUE_MIN = 90; // Min green hue in HSV (adjust as needed)
const GREEN_HUE_MAX = 150; // Max green hue in HSV (adjust as needed)
const GREEN_SATURATION_MIN = 25; // Min saturation percentage
const GREEN_VALUE_MIN = 25; // Min value percentage
const MIN_OBJECT_SIZE = 500; // Minimum area in pixels to consider a valid object

const App = () => {
  const [poseLandmarker, setPoseLandmarker] = useState(null);
  const [runningMode, setRunningMode] = useState("VIDEO");
  const [webcamRunning, setWebcamRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const canvasCtxRef = useRef(null);
  const drawingUtilsRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  
  // Add reference for the new green object detection canvas
  const greenCanvasRef = useRef(null);
  const greenCanvasCtxRef = useRef(null);
  
  // References for tracking position history
  const leftKneeHistoryRef = useRef([]);
  const rightKneeHistoryRef = useRef([]);
  
  // Reference for storing detected green objects
  const greenObjectsRef = useRef([]);
  // Temporary canvas for image processing
  const processingCanvasRef = useRef(document.createElement('canvas'));
  
  // Initialize pose landmarker and start webcam when component mounts
  useEffect(() => {
    let isMounted = true;
    
    const createPoseLandmarker = async () => {
      try {
        // Import required libraries
        const { PoseLandmarker, FilesetResolver, DrawingUtils } = await import(
          "https://cdn.skypack.dev/@mediapipe/tasks-vision@0.10.0"
        );
        
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
            delegate: "GPU"
          },
          runningMode: runningMode,
          numPoses: 2
        });
        
        // Only update state if component is still mounted
        if (isMounted) {
          setPoseLandmarker(landmarker);
          console.log("landmarker", landmarker);
          
          // Initialize canvas context and drawing utils
          if (canvasRef.current) {
            canvasCtxRef.current = canvasRef.current.getContext("2d");
            drawingUtilsRef.current = new DrawingUtils(canvasCtxRef.current);
          }
          
          // Initialize green object detection canvas
          if (greenCanvasRef.current) {
            greenCanvasCtxRef.current = greenCanvasRef.current.getContext("2d");
          }
          
          setIsLoading(false);
          
          // Start webcam immediately after pose landmarker is loaded
          try {
            console.log("Starting webcam after pose landmarker loaded");
            
            // Check if getUserMedia is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
              console.error("getUserMedia is not supported in this browser");
              return;
            }
            
            // Get video stream with default settings
            const stream = await navigator.mediaDevices.getUserMedia({ 
              video: true,
              audio: false
            });
            
            console.log("Webcam stream obtained successfully");
            
            if (videoRef.current && isMounted) {
              // Add muted attribute to ensure Chrome allows autoplay
              videoRef.current.muted = true;
              videoRef.current.srcObject = stream;
              
              // Set up a promise for when metadata is loaded
              const metadataPromise = new Promise(resolve => {
                videoRef.current.onloadedmetadata = () => {
                  console.log(`Video metadata loaded: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);
                  resolve();
                };
              });
              
              // Wait for metadata to load before continuing
              await metadataPromise;
              
              // Play the video
              try {
                await videoRef.current.play();
                console.log("Video playback started");
              } catch (playError) {
                console.error("Error playing video:", playError);
              }
              
              // Now adjust size and start predictions
              if (isMounted) {
                console.log("isMounted");
                adjustVideoSize();
                setWebcamRunning(true);
              }
            }
          } catch (webcamError) {
            console.error("Error accessing webcam:", webcamError);
            alert("Could not access the webcam. Please ensure you've granted camera permission and try again.");
          }
        }
      } catch (error) {
        console.error("Error initializing pose landmarker:", error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    createPoseLandmarker();
    
    // Cleanup function
    return () => {
      isMounted = false;
      
      // Stop webcam if it's running
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [runningMode]);

  // Function to adjust video and canvas size based on the actual video dimensions
  const adjustVideoSize = () => {
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
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (videoRef.current && videoRef.current.videoWidth) {
        console.log("handleResize");
        adjustVideoSize();
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Function to add a point to history and get smoothed value
  const updatePointHistory = (point, historyRef) => {
    if (!point) return null;
    
    // If the history is too large, remove the oldest entry
    if (historyRef.current.length >= SMOOTHING_WINDOW_SIZE) {
      historyRef.current.shift();
    }
    
    // Add current point to history
    historyRef.current.push({
      x: point.x,
      y: point.y,
      z: point.z || 0,
      visibility: point.visibility || 1.0
    });
    
    // Only process if we have enough points
    if (historyRef.current.length < 3) return point;
    
    // Calculate averages for each dimension
    let sumX = 0, sumY = 0, sumZ = 0, sumVisibility = 0;
    let validPoints = 0;
    
    // Apply exponentially weighted moving average (more weight to recent frames)
    historyRef.current.forEach((histPoint, index) => {
      // Calculate weight - more recent frames have higher weight
      const weight = Math.exp(index - historyRef.current.length + 1);
      
      sumX += histPoint.x * weight;
      sumY += histPoint.y * weight;
      sumZ += histPoint.z * weight;
      sumVisibility += histPoint.visibility * weight;
      validPoints += weight;
    });
    
    // Return smoothed point
    return {
      x: sumX / validPoints,
      y: sumY / validPoints,
      z: sumZ / validPoints,
      visibility: sumVisibility / validPoints
    };
  };

  // Function to convert RGB to HSV
  const rgbToHsv = (r, g, b) => {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    
    let h = 0;
    let s = max === 0 ? 0 : diff / max;
    const v = max;

    if (diff === 0) {
      h = 0;
    } else if (max === r) {
      h = 60 * (((g - b) / diff) % 6);
    } else if (max === g) {
      h = 60 * ((b - r) / diff + 2);
    } else {
      h = 60 * ((r - g) / diff + 4);
    }

    if (h < 0) h += 360;
    
    // Return HSV values
    return {
      h: h,                 // Hue: 0-360
      s: s * 100,           // Saturation: 0-100%
      v: v * 100            // Value: 0-100%
    };
  };

  // Function to detect green objects in the video frame
  const detectGreenObjects = () => {
    if (!videoRef.current || !processingCanvasRef.current) return [];
    
    const video = videoRef.current;
    const canvas = processingCanvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    // Set processing canvas to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current video frame to the processing canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get image data for processing
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Create a binary mask for green pixels
    const mask = new Uint8Array(canvas.width * canvas.height);
    
    // Analyze each pixel to identify green objects
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Convert RGB to HSV color space for better color detection
      const hsv = rgbToHsv(r, g, b);
      
      // Check if the pixel is in the green range
      const isGreen = 
        hsv.h >= GREEN_HUE_MIN && 
        hsv.h <= GREEN_HUE_MAX && 
        hsv.s >= GREEN_SATURATION_MIN && 
        hsv.v >= GREEN_VALUE_MIN;
      
      // Mark pixel in mask (1 for green, 0 for non-green)
      const pixelIndex = Math.floor(i / 4);
      mask[pixelIndex] = isGreen ? 1 : 0;
    }
    
    // Find connected components (objects) in the mask
    const objects = findConnectedComponents(mask, canvas.width, canvas.height);
    
    return objects;
  };
  
  // Find connected components using a simple flood fill algorithm
  const findConnectedComponents = (mask, width, height) => {
    const visited = new Uint8Array(mask.length);
    const objects = [];
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // 4-connectivity
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        
        // Skip if pixel is not green or already visited
        if (mask[idx] !== 1 || visited[idx] === 1) continue;
        
        // Start a new object
        const object = {
          pixels: [],
          minX: width,
          minY: height,
          maxX: 0,
          maxY: 0
        };
        
        // Use a queue for breadth-first traversal
        const queue = [[x, y]];
        visited[idx] = 1;
        
        while (queue.length > 0) {
          const [cx, cy] = queue.shift();
          const currentIdx = cy * width + cx;
          
          // Add pixel to the current object
          object.pixels.push([cx, cy]);
          
          // Update bounding box
          object.minX = Math.min(object.minX, cx);
          object.minY = Math.min(object.minY, cy);
          object.maxX = Math.max(object.maxX, cx);
          object.maxY = Math.max(object.maxY, cy);
          
          // Check neighbors
          for (const [dx, dy] of directions) {
            const nx = cx + dx;
            const ny = cy + dy;
            
            // Check boundaries
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            
            const neighborIdx = ny * width + nx;
            
            // Add unvisited green neighbors to queue
            if (mask[neighborIdx] === 1 && visited[neighborIdx] === 0) {
              queue.push([nx, ny]);
              visited[neighborIdx] = 1;
            }
          }
        }
        
        // Calculate object area and add to list if it's large enough
        const area = object.pixels.length;
        if (area >= MIN_OBJECT_SIZE) {
          object.width = object.maxX - object.minX + 1;
          object.height = object.maxY - object.minY + 1;
          object.area = area;
          objects.push(object);
        }
      }
    }
    
    return objects;
  };
  
  // Function to draw bounding boxes around green objects
  const drawGreenObjectBoundingBoxes = (ctx, objects) => {
    ctx.strokeStyle = '#FF0000'; // Red for the bounding box
    ctx.lineWidth = 3;
    ctx.font = '16px Arial';
    ctx.fillStyle = '#FF0000';
    
    // Get the canvas width for coordinate flipping
    const canvasWidth = greenCanvasRef.current.width;
    
    objects.forEach((obj, index) => {
      // Calculate flipped coordinates for the bounding box
      const flippedMinX = canvasWidth - obj.maxX;
      const flippedMaxX = canvasWidth - obj.minX;
      const width = obj.width; // Width stays the same
      
      // Draw bounding box using flipped coordinates
      ctx.beginPath();
      ctx.rect(flippedMinX, obj.minY, width, obj.height);
      ctx.stroke();
      
      // Draw label with flipped coordinates
      ctx.fillText(`Green Obj #${index + 1}`, flippedMinX, obj.minY - 5);
    });
  };
  
  // Custom function to draw knee joints
  const drawKneeJoint = (kneePoint, side) => {
    if (!canvasCtxRef.current || !kneePoint) return;
    
    const ctx = canvasCtxRef.current;
    const radius = 10; // Size of the knee point
    
    // Set different colors for left and right knees
    if (side === "left") {
      ctx.fillStyle = "#4CAF50"; // Green for left knee
    } else {
      ctx.fillStyle = "#2196F3"; // Blue for right knee
    }
    
    // Draw the knee point
    ctx.beginPath();
    ctx.arc(
      kneePoint.x * canvasRef.current.width,
      kneePoint.y * canvasRef.current.height,
      radius,
      0,
      2 * Math.PI
    );
    ctx.fill();
    
    // Add a border
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Add a label
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      side === "left" ? "L Knee" : "R Knee",
      kneePoint.x * canvasRef.current.width,
      (kneePoint.y * canvasRef.current.height) - 15
    );
  };

  // Predict from webcam feed
  const predictWebcam = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !greenCanvasRef.current || !poseLandmarker || 
        !canvasCtxRef.current || !greenCanvasCtxRef.current) return;
    
    // Switch to video mode if needed
    if (runningMode === "IMAGE") {
      setRunningMode("VIDEO");
      await poseLandmarker.setOptions({ runningMode: "VIDEO" });
    }
    
    const startTimeMs = performance.now();
    
    if (lastVideoTimeRef.current !== videoRef.current.currentTime) {
      lastVideoTimeRef.current = videoRef.current.currentTime;
      
      const { PoseLandmarker } = await import(
        "https://cdn.skypack.dev/@mediapipe/tasks-vision@0.10.0"
      );
      
      // Clear the green object canvas (not mirrored)
      greenCanvasCtxRef.current.clearRect(0, 0, greenCanvasRef.current.width, greenCanvasRef.current.height);
      
      // Draw the green object bounding boxes directly (the function handles the coordinate flipping)
      drawGreenObjectBoundingBoxes(greenCanvasCtxRef.current, greenObjectsRef.current);
      
      // Handle pose detection on the other canvas (still mirrored)
      poseLandmarker.detectForVideo(videoRef.current, startTimeMs, (result) => {
        // Clear the pose detection canvas
        canvasCtxRef.current.save();
        canvasCtxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        // Flip the canvas horizontally to correct the mirroring
        canvasCtxRef.current.scale(-1, 1);
        canvasCtxRef.current.translate(-canvasRef.current.width, 0);
        
        // Draw pose landmarks only on this canvas
        if (result.landmarks && result.landmarks.length > 0) {
          const landmarks = result.landmarks[0]; // Get first detected person
          
          // Process left knee (landmark 25)
          if (landmarks[25]) {
            const rawLeftKnee = landmarks[25];
            const smoothedLeftKnee = updatePointHistory(rawLeftKnee, leftKneeHistoryRef);
            if (smoothedLeftKnee) {
              drawKneeJoint(smoothedLeftKnee, "left");
            }
          }
          
          // Process right knee (landmark 26)
          if (landmarks[26]) {
            const rawRightKnee = landmarks[26];
            const smoothedRightKnee = updatePointHistory(rawRightKnee, rightKneeHistoryRef);
            if (smoothedRightKnee) {
              drawKneeJoint(smoothedRightKnee, "right");
            }
          }
        }
        
        canvasCtxRef.current.restore();
      });
    }
  }, [poseLandmarker, runningMode]);

  // Set up throttled interval for predictWebcam when webcam is running
  useEffect(() => {
    let animationFrameId = null;
    let lastCallTime = 0;
    
    const throttledPredict = (timestamp) => {
      // Calculate time since last execution
      const elapsed = timestamp - lastCallTime;
      
      // Only run if enough time has passed (THROTTLE_INTERVAL)
      if (elapsed > THROTTLE_INTERVAL) {
        lastCallTime = timestamp;
        
        // Detect green objects in the frame
        const detectedGreenObjects = detectGreenObjects();
        greenObjectsRef.current = detectedGreenObjects;
        
        // Run pose detection
        predictWebcam();
      }
      
      // Continue the loop only if webcam is running
      if (webcamRunning) {
        animationFrameId = requestAnimationFrame(throttledPredict);
      }
    };
    
    if (webcamRunning) {
      // Start the throttled prediction loop
      animationFrameId = requestAnimationFrame(throttledPredict);
    }
    
    // Cleanup function
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    };
  }, [webcamRunning, predictWebcam]);

  return (
    <div className="App">
      <div id="liveView" className="videoView">
        {isLoading && <div className="loading-indicator">Loading pose detection model...</div>}
        <div id="videoContainer">
          <video 
            id="webcam" 
            ref={videoRef}
            autoPlay 
            playsInline
            muted
          ></video>
          
          {/* Pose detection canvas (mirrored) */}
          <canvas 
            className="output_canvas" 
            id="output_canvas" 
            ref={canvasRef}
          ></canvas>
          
          {/* Green object detection canvas (not mirrored) */}
          <canvas 
            className="green_detection_canvas" 
            id="green_detection_canvas" 
            ref={greenCanvasRef}
          ></canvas>
          
          {/* Info overlay for green detection */}
          {webcamRunning && (
            <div style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              color: 'white',
              padding: '8px',
              borderRadius: '4px',
              fontSize: '14px',
              zIndex: 20
            }}>
              <div>Green Object Detection: ACTIVE</div>
              <div style={{fontSize: '12px', opacity: 0.8}}>
                Detected objects will be highlighted with red boxes
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;