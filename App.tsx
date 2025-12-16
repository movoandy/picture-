import React, { useEffect, useRef, useState } from 'react';
import ThreeScene from './components/ThreeScene';
import { HandGesture } from './types';
import { analyzeGesture } from './services/gestureRecognition';

const App: React.FC = () => {
  const [gesture, setGesture] = useState<HandGesture>(HandGesture.NONE);
  const [uploadedTextures, setUploadedTextures] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // --- MediaPipe Initialization ---
  useEffect(() => {
    const initMediaPipe = async () => {
      if (!videoRef.current) return;
      if (!window.Hands) {
        setError("MediaPipe scripts not loaded. Check internet connection.");
        setLoading(false);
        return;
      }

      try {
        const hands = new window.Hands({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          },
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        hands.onResults((results) => {
          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            const detectedGesture = analyzeGesture(landmarks);
            setGesture(detectedGesture);
          } else {
            setGesture(HandGesture.NONE);
          }
        });

        const camera = new window.Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current) {
              await hands.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480,
        });

        await camera.start();
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Failed to access camera or initialize MediaPipe.");
        setLoading(false);
      }
    };

    initMediaPipe();
  }, []);

  // --- File Upload Handler ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const promises = Array.from(files).map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
      });

      Promise.all(promises).then(images => {
        setUploadedTextures(images);
      });
    }
  };

  return (
    <div className="relative w-full h-screen bg-black text-white font-sans overflow-hidden">
      
      {/* 3D Background */}
      <ThreeScene gesture={gesture} uploadedTextures={uploadedTextures} />

      {/* Hidden Video for MediaPipe */}
      <video ref={videoRef} className="hidden" playsInline />

      {/* UI Overlay */}
      <div className="absolute top-0 left-0 w-full p-6 pointer-events-none flex justify-between items-start z-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter mb-2">GESTURE 3D</h1>
          <p className="text-sm opacity-70 max-w-xs">
            Show hand gestures to interact with the particle text.
          </p>
          
          <div className="mt-6 space-y-4">
            <div className={`flex items-center space-x-3 transition-opacity ${gesture === HandGesture.FIST ? 'opacity-100' : 'opacity-40'}`}>
              <span className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-xs font-bold">✊</span>
              <div className="flex flex-col">
                 <span className="font-bold">Fist</span>
                 <span className="text-xs">Pull back (Zoom Out)</span>
              </div>
            </div>

            <div className={`flex items-center space-x-3 transition-opacity ${gesture === HandGesture.OPEN_PALM ? 'opacity-100' : 'opacity-40'}`}>
              <span className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">✋</span>
              <div className="flex flex-col">
                 <span className="font-bold">Open Palm</span>
                 <span className="text-xs">Push forward & Flowing Effect</span>
              </div>
            </div>

            <div className={`flex items-center space-x-3 transition-opacity ${gesture === HandGesture.OK_SIGN ? 'opacity-100' : 'opacity-40'}`}>
              <span className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-xs font-bold">👌</span>
               <div className="flex flex-col">
                 <span className="font-bold">OK Sign</span>
                 <span className="text-xs">Scale Up Particles</span>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Control */}
        <div className="pointer-events-auto bg-gray-900/80 backdrop-blur-sm p-4 rounded-xl border border-gray-700">
            <label className="block text-xs font-bold mb-2 uppercase tracking-wide text-gray-400">
              Custom Textures (Select Multiple)
            </label>
            <input 
              type="file" 
              accept="image/*" 
              multiple
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-300
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-xs file:font-semibold
                file:bg-indigo-600 file:text-white
                hover:file:bg-indigo-700
                cursor-pointer
              "
            />
            <p className="text-xs text-gray-500 mt-2">
              {uploadedTextures.length > 0 ? `${uploadedTextures.length} images loaded` : 'Default texture active'}
            </p>
        </div>
      </div>

      {/* Loading / Error States */}
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black">
          <div className="text-center">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
             <p className="animate-pulse">Initializing Camera & AI Model...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/90">
           <div className="p-8 bg-red-900/50 rounded-xl border border-red-500 text-center max-w-md">
              <h2 className="text-2xl font-bold mb-2">Error</h2>
              <p>{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-6 px-4 py-2 bg-white text-red-900 font-bold rounded hover:bg-gray-200 transition"
              >
                Reload
              </button>
           </div>
        </div>
      )}

      {/* Current Gesture Indicator (Bottom Center) */}
      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-10">
         <div className="bg-white/10 backdrop-blur-md px-6 py-2 rounded-full border border-white/20">
            <span className="font-mono text-sm tracking-widest uppercase">
               DETECTED: {gesture === HandGesture.NONE ? '...' : gesture.replace('_', ' ')}
            </span>
         </div>
      </div>

    </div>
  );
};

export default App;