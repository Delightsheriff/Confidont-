"use client"

import { useEffect, useRef, useState } from "react"
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision"

export default function CameraAnalyzer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [landmarker, setLandmarker] = useState<FaceLandmarker | null>(null)
  const [isCameraReady, setIsCameraReady] = useState(false)

  // NEW: State to manage the active session
  const [isSessionActive, setIsSessionActive] = useState(false)

  const prevNoseRef = useRef<{ x: number; y: number } | null>(null)
  const requestRef = useRef<number | undefined>(undefined) // Ref to store animation frame ID

  // 1. Initialize MediaPipe Face Landmarker
  useEffect(() => {
    const setupLandmarker = async () => {
      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      )
      const faceLandmarker = await FaceLandmarker.createFromOptions(
        filesetResolver,
        {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU",
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 1,
        }
      )
      setLandmarker(faceLandmarker)
    }
    setupLandmarker()
  }, [])

  // 2. Control Session (Start/Stop)
  const toggleSession = async () => {
    if (isSessionActive) {
      // STOP SESSION logic
      setIsSessionActive(false)
      setIsCameraReady(false)

      // Stop the camera stream
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach((track) => track.stop())
        videoRef.current.srcObject = null
      }
    } else {
      // START SESSION logic
      if (videoRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720 },
          })
          videoRef.current.srcObject = stream
          videoRef.current.onloadeddata = () => {
            setIsCameraReady(true)
            setIsSessionActive(true)
          }
        } catch (err) {
          console.error("Camera access denied", err)
        }
      }
    }
  }

  // Improved Logic for accuracy
  const processMetrics = (landmarks: { x: number; y: number; z: number }[]) => {
    const getGaze = (iris: { x: number; y: number; z: number }, inner: { x: number; y: number; z: number }, outer: { x: number; y: number; z: number }) =>
      (iris.x - inner.x) / (outer.x - inner.x)

    const leftGaze = getGaze(landmarks[468], landmarks[33], landmarks[133])
    const rightGaze = getGaze(landmarks[473], landmarks[362], landmarks[263])
    // Vertical check (iris vs top/bottom lids)
    const leftVerticalGaze =
      (landmarks[468].y - landmarks[159].y) /
      (landmarks[145].y - landmarks[159].y)

    // Tighter bullseye for accuracy
    const hasEyeContact =
      leftGaze > 0.42 &&
      leftGaze < 0.58 &&
      rightGaze > 0.42 &&
      rightGaze < 0.58 &&
      leftVerticalGaze > 0.4 &&
      leftVerticalGaze < 0.65

    const currentNose = landmarks[4]
    let movement = 0
    if (prevNoseRef.current) {
      movement = Math.sqrt(
        Math.pow(currentNose.x - prevNoseRef.current.x, 2) +
          Math.pow(currentNose.y - prevNoseRef.current.y, 2)
      )
    }
    prevNoseRef.current = currentNose
    const isStable = movement < 0.005

    console.log({
      eyeContact: hasEyeContact ? "🎯 ON CAMERA" : "❌ LOOKING AWAY",
      stability: isStable ? "Composed" : "Fidgeting",
    })
  }

  // 3. The Detection Loop
  useEffect(() => {
    // Only run the loop if landmarker is ready AND session is active
    if (!landmarker || !isSessionActive || !isCameraReady || !videoRef.current)
      return

    const predict = () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return

      const startTimeMs = performance.now()
      const results = landmarker.detectForVideo(videoRef.current, startTimeMs)

      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        processMetrics(results.faceLandmarks[0])
      }

      requestRef.current = requestAnimationFrame(predict)
    }

    requestRef.current = requestAnimationFrame(predict)

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
  }, [landmarker, isSessionActive, isCameraReady])

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="relative aspect-video w-full max-w-2xl overflow-hidden rounded-2xl border-4 border-slate-800 bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full -scale-x-100 object-cover"
        />
        {!isCameraReady && isSessionActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
            Initialising...
          </div>
        )}
      </div>

      <button
        onClick={toggleSession}
        disabled={!landmarker}
        className={`rounded-full px-8 py-3 font-bold text-white transition-all ${
          !landmarker
            ? "cursor-not-allowed bg-gray-400"
            : isSessionActive
              ? "bg-red-600 hover:bg-red-700"
              : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {!landmarker
          ? "Loading AI..."
          : isSessionActive
            ? "End Session"
            : "Start Session"}
      </button>
    </div>
  )
}
