import React, { useEffect, useState, useRef, useCallback } from 'react';
import './App.css';

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
                predictWebcam();
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
    if (!videoRef.current || !canvasRef.current) return;
    
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
    
    // Important: set the canvas drawing dimensions to match the video's intrinsic dimensions
    // This ensures correct coordinate mapping between video and canvas
    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;
    
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

  // Predict from webcam feed
  const predictWebcam = useCallback(async () => {
    console.log("videoRef", videoRef.current);
    console.log("canvasRef", canvasRef.current);
    console.log("poseLandmarker", poseLandmarker);
    console.log("canvasCtxRef", canvasCtxRef.current);
    if (!videoRef.current || !canvasRef.current || !poseLandmarker || !canvasCtxRef.current) return;
    
    // Switch to video mode if needed
    if (runningMode === "IMAGE") {
      setRunningMode("VIDEO");
      await poseLandmarker.setOptions({ runningMode: "VIDEO" });
    }
    
    const startTimeMs = performance.now();
    
    if (lastVideoTimeRef.current !== videoRef.current.currentTime) {
      lastVideoTimeRef.current = videoRef.current.currentTime;
      
      const { PoseLandmarker, DrawingUtils } = await import(
        "https://cdn.skypack.dev/@mediapipe/tasks-vision@0.10.0"
      );
      
      poseLandmarker.detectForVideo(videoRef.current, startTimeMs, (result) => {
        // Clear the entire canvas
        canvasCtxRef.current.save();
        canvasCtxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        for (const landmark of result.landmarks) {
          if (!drawingUtilsRef.current) {
            const { DrawingUtils } = import("https://cdn.skypack.dev/@mediapipe/tasks-vision@0.10.0");
            drawingUtilsRef.current = new DrawingUtils(canvasCtxRef.current);
          }
          
          drawingUtilsRef.current.drawLandmarks(landmark, {
            radius: (data) => DrawingUtils.lerp(data.from.z, -0.15, 0.1, 5, 1)
          });
          drawingUtilsRef.current.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS);
        }
        
        canvasCtxRef.current.restore();
      });
    }
    
  }, 
  [poseLandmarker, runningMode]
);

  useEffect(() => {
    // Continue prediction loop if webcam is still running
    if (webcamRunning) {
      window.requestAnimationFrame(predictWebcam);
    }
  }, [webcamRunning, predictWebcam])

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
          <canvas 
            className="output_canvas" 
            id="output_canvas" 
            ref={canvasRef}
          ></canvas>
        </div>
      </div>
    </div>
  );
};

export default App;