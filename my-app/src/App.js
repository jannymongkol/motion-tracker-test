import React, { useEffect, useState, useRef } from 'react';
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

  // Initialize pose landmarker when component mounts
  useEffect(() => {
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
        
        setPoseLandmarker(landmarker);
        
        // Initialize canvas context and drawing utils
        if (canvasRef.current) {
          canvasCtxRef.current = canvasRef.current.getContext("2d");
          drawingUtilsRef.current = new DrawingUtils(canvasCtxRef.current);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error initializing pose landmarker:", error);
      }
    };

    createPoseLandmarker();
  }, []);

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
  
  // Handle window resize and initial sizing
  useEffect(() => {
    const handleResize = () => {
      if (videoRef.current && videoRef.current.videoWidth) {
        adjustVideoSize();
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Enable webcam and start predictions
  const enableCam = async () => {
    if (!poseLandmarker) {
      console.log("Wait! poseLandmaker not loaded yet.");
      return;
    }
    
    if (webcamRunning) {
      setWebcamRunning(false);
      
      // Stop webcam
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      
      document.getElementById('webcamButton').innerText = "ENABLE WEBCAM";
      document.body.classList.remove('webcam-active');
    } else {
      setWebcamRunning(true);
      document.getElementById('webcamButton').innerText = "DISABLE WEBCAM";
      document.body.classList.add('webcam-active');
      
      try {
        // Get video stream with default settings
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "user" } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // Set up handler for when video metadata is loaded
          const handleVideoMetadata = () => {
            console.log(`Video metadata loaded: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);
            adjustVideoSize();
            videoRef.current.removeEventListener('loadedmetadata', handleVideoMetadata);
          };
          
          // Set up handler for when video data is loaded
          const handleVideoData = () => {
            console.log("Video data loaded, starting prediction");
            predictWebcam();
            videoRef.current.removeEventListener('loadeddata', handleVideoData);
          };
          
          videoRef.current.addEventListener('loadedmetadata', handleVideoMetadata);
          videoRef.current.addEventListener('loadeddata', handleVideoData);
        }
      } catch (error) {
        console.error("Error accessing webcam:", error);
      }
    }
  };

  // Check if webcam access is supported
  const hasGetUserMedia = () => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  };

  // Predict from webcam feed
  const predictWebcam = async () => {
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
    
    // Continue prediction loop if webcam is still running
    if (webcamRunning) {
      window.requestAnimationFrame(predictWebcam);
    }
  };

  return (
    <div className="App">
      <div id="liveView" className="videoView">
        <button 
          id="webcamButton" 
          className="mdc-button mdc-button--raised"
          onClick={enableCam}
          disabled={isLoading || !hasGetUserMedia()}
        >
          <span className="mdc-button__ripple"></span>
          <span className="mdc-button__label">ENABLE WEBCAM</span>
        </button>
        
        <div id="videoContainer">
          <video 
            id="webcam" 
            ref={videoRef}
            autoPlay 
            playsInline
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