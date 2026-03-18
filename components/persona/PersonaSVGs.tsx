"use client"

// ─────────────────────────────────────────────
// Persona SVG Characters
//
// 5 distinct characters, each with 5 animation states:
// idle | nod | tilt | wave | clap
//
// Design language: soft shapes, rounded forms,
// expressive but not cartoonish. Welcoming.
// Each has a distinct silhouette readable at small sizes.
// ─────────────────────────────────────────────

export type PersonaAnimationState = "idle" | "nod" | "tilt" | "wave" | "clap"

interface PersonaSVGProps {
  state?: PersonaAnimationState
  size?: number
  className?: string
}

// ── Amara — warm rose, late 20s, natural hair ─────────────────────────
export function AmaraSVG({
  state = "idle",
  size = 120,
  className = "",
}: PersonaSVGProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ overflow: "visible" }}
    >
      <style>{`
        @keyframes amara-nod {
          0%, 100% { transform: translateY(0); }
          30% { transform: translateY(4px); }
          60% { transform: translateY(-2px); }
        }
        @keyframes amara-tilt {
          0%, 100% { transform: rotate(0deg); }
          40% { transform: rotate(-8deg); }
          70% { transform: rotate(4deg); }
        }
        @keyframes amara-wave {
          0%, 100% { transform: rotate(0deg); transform-origin: 90px 72px; }
          20% { transform: rotate(-20deg); transform-origin: 90px 72px; }
          40% { transform: rotate(15deg); transform-origin: 90px 72px; }
          60% { transform: rotate(-15deg); transform-origin: 90px 72px; }
          80% { transform: rotate(10deg); transform-origin: 90px 72px; }
        }
        @keyframes amara-clap {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          50% { transform: translateX(6px); }
          75% { transform: translateX(-3px); }
        }
        @keyframes amara-breathe {
          0%, 100% { transform: scaleY(1); transform-origin: center bottom; }
          50% { transform: scaleY(1.015); transform-origin: center bottom; }
        }
      `}</style>

      <g
        style={{
          animation:
            state === "nod"
              ? "amara-nod 0.7s ease-in-out"
              : state === "tilt"
                ? "amara-tilt 0.8s ease-in-out"
                : state === "clap"
                  ? "amara-clap 0.5s ease-in-out 2"
                  : "amara-breathe 3s ease-in-out infinite",
        }}
      >
        {/* Body / shoulders */}
        <ellipse
          cx="60"
          cy="105"
          rx="34"
          ry="22"
          fill="#f4a7a7"
          opacity="0.9"
        />
        {/* Neck */}
        <rect x="53" y="78" width="14" height="16" rx="7" fill="#d4845a" />
        {/* Head */}
        <ellipse cx="60" cy="62" rx="26" ry="28" fill="#c8714a" />
        {/* Natural hair — voluminous */}
        <ellipse cx="60" cy="40" rx="30" ry="20" fill="#1a0a00" />
        <ellipse cx="38" cy="55" rx="10" ry="16" fill="#1a0a00" />
        <ellipse cx="82" cy="55" rx="10" ry="16" fill="#1a0a00" />
        <ellipse cx="60" cy="35" rx="22" ry="12" fill="#2d1200" />
        {/* Ears */}
        <ellipse cx="34" cy="63" rx="5" ry="7" fill="#b8613a" />
        <ellipse cx="86" cy="63" rx="5" ry="7" fill="#b8613a" />
        {/* Eyes — warm, slightly curved */}
        <ellipse cx="49" cy="61" rx="5" ry="5.5" fill="#fff" />
        <ellipse cx="71" cy="61" rx="5" ry="5.5" fill="#fff" />
        <ellipse cx="49.5" cy="61.5" rx="3" ry="3.5" fill="#2d1200" />
        <ellipse cx="71.5" cy="61.5" rx="3" ry="3.5" fill="#2d1200" />
        <circle cx="50.5" cy="60.5" r="1.2" fill="#fff" />
        <circle cx="72.5" cy="60.5" r="1.2" fill="#fff" />
        {/* Eyebrows — soft arch */}
        <path
          d="M44 55 Q49 53 54 55"
          stroke="#1a0a00"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M66 55 Q71 53 76 55"
          stroke="#1a0a00"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Nose */}
        <ellipse cx="60" cy="69" rx="3" ry="2" fill="#b05030" opacity="0.5" />
        {/* Smile */}
        <path
          d="M52 75 Q60 80 68 75"
          stroke="#8b3a1a"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
        {/* Cheek blush */}
        <ellipse
          cx="43"
          cy="70"
          rx="6"
          ry="3.5"
          fill="#e8907a"
          opacity="0.35"
        />
        <ellipse
          cx="77"
          cy="70"
          rx="6"
          ry="3.5"
          fill="#e8907a"
          opacity="0.35"
        />
      </g>

      {/* Wave arm — separate group for independent animation */}
      {state === "wave" && (
        <g style={{ animation: "amara-wave 1s ease-in-out 1.5" }}>
          <path
            d="M86 78 Q96 68 100 58 Q103 50 100 45"
            stroke="#c8714a"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
          />
          {/* Hand */}
          <ellipse cx="100" cy="43" rx="7" ry="6" fill="#c8714a" />
          <path
            d="M96 38 Q98 32 100 30"
            stroke="#c8714a"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M100 37 Q102 31 104 29"
            stroke="#c8714a"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M104 39 Q106 33 107 32"
            stroke="#c8714a"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      )}
    </svg>
  )
}

// ── James — calm sky-blue, early 40s, neat fade ───────────────────────
export function JamesSVG({
  state = "idle",
  size = 120,
  className = "",
}: PersonaSVGProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ overflow: "visible" }}
    >
      <style>{`
        @keyframes james-nod {
          0%, 100% { transform: translateY(0); }
          30% { transform: translateY(4px); }
          60% { transform: translateY(-2px); }
        }
        @keyframes james-tilt {
          0%, 100% { transform: rotate(0deg); }
          40% { transform: rotate(-6deg); }
          70% { transform: rotate(3deg); }
        }
        @keyframes james-wave {
          0%, 100% { transform: rotate(0deg); transform-origin: 88px 74px; }
          20% { transform: rotate(-18deg); transform-origin: 88px 74px; }
          40% { transform: rotate(14deg); transform-origin: 88px 74px; }
          60% { transform: rotate(-12deg); transform-origin: 88px 74px; }
          80% { transform: rotate(8deg); transform-origin: 88px 74px; }
        }
        @keyframes james-clap {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          50% { transform: translateX(5px); }
          75% { transform: translateX(-3px); }
        }
        @keyframes james-breathe {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.012); transform-origin: center bottom; }
        }
      `}</style>

      <g
        style={{
          animation:
            state === "nod"
              ? "james-nod 0.7s ease-in-out"
              : state === "tilt"
                ? "james-tilt 0.8s ease-in-out"
                : state === "clap"
                  ? "james-clap 0.5s ease-in-out 2"
                  : "james-breathe 3.5s ease-in-out infinite",
        }}
      >
        {/* Body / shoulders — broader, shirt collar visible */}
        <ellipse
          cx="60"
          cy="107"
          rx="38"
          ry="20"
          fill="#bcd6f0"
          opacity="0.9"
        />
        {/* Collar */}
        <path
          d="M48 92 L60 98 L72 92"
          stroke="#fff"
          strokeWidth="2"
          fill="none"
        />
        {/* Neck */}
        <rect x="54" y="79" width="12" height="14" rx="6" fill="#c49a72" />
        {/* Head */}
        <ellipse cx="60" cy="63" rx="24" ry="26" fill="#c49a72" />
        {/* Hair — short fade, clean line */}
        <path d="M36 58 Q36 34 60 33 Q84 34 84 58" fill="#3d2400" />
        <path d="M38 58 Q40 45 60 44 Q80 45 82 58" fill="#5c3800" />
        {/* Ears */}
        <ellipse cx="36" cy="64" rx="4.5" ry="6" fill="#b48a62" />
        <ellipse cx="84" cy="64" rx="4.5" ry="6" fill="#b48a62" />
        {/* Eyes — steady, calm */}
        <ellipse cx="50" cy="62" rx="5" ry="5" fill="#fff" />
        <ellipse cx="70" cy="62" rx="5" ry="5" fill="#fff" />
        <ellipse cx="50.5" cy="62.5" rx="3" ry="3" fill="#1a0d00" />
        <ellipse cx="70.5" cy="62.5" rx="3" ry="3" fill="#1a0d00" />
        <circle cx="51.5" cy="61.5" r="1" fill="#fff" />
        <circle cx="71.5" cy="61.5" r="1" fill="#fff" />
        {/* Eyebrows — level, composed */}
        <path
          d="M45 56 Q50 54.5 55 56"
          stroke="#3d2400"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M65 56 Q70 54.5 75 56"
          stroke="#3d2400"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        {/* Nose */}
        <path
          d="M58 69 Q60 72 62 69"
          stroke="#a0784a"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Slight smile — calm */}
        <path
          d="M53 76 Q60 80 67 76"
          stroke="#8a6030"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
        {/* Light stubble suggestion */}
        <ellipse cx="60" cy="78" rx="10" ry="4" fill="#b0854a" opacity="0.15" />
      </g>

      {state === "wave" && (
        <g style={{ animation: "james-wave 1s ease-in-out 1.5" }}>
          <path
            d="M84 80 Q94 70 98 60 Q101 52 98 47"
            stroke="#c49a72"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
          />
          <ellipse cx="98" cy="45" rx="6" ry="5.5" fill="#c49a72" />
        </g>
      )}
    </svg>
  )
}

// ── Zoe — amber, early 20s, messy bun, expressive ────────────────────
export function ZoeSVG({
  state = "idle",
  size = 120,
  className = "",
}: PersonaSVGProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ overflow: "visible" }}
    >
      <style>{`
        @keyframes zoe-nod {
          0%, 100% { transform: translateY(0); }
          25% { transform: translateY(5px); }
          55% { transform: translateY(-3px); }
          80% { transform: translateY(2px); }
        }
        @keyframes zoe-tilt {
          0%, 100% { transform: rotate(0deg); }
          35% { transform: rotate(-10deg); }
          65% { transform: rotate(6deg); }
        }
        @keyframes zoe-wave {
          0%, 100% { transform: rotate(0deg); transform-origin: 88px 72px; }
          15% { transform: rotate(-25deg); transform-origin: 88px 72px; }
          35% { transform: rotate(20deg); transform-origin: 88px 72px; }
          55% { transform: rotate(-18deg); transform-origin: 88px 72px; }
          75% { transform: rotate(14deg); transform-origin: 88px 72px; }
          90% { transform: rotate(-8deg); transform-origin: 88px 72px; }
        }
        @keyframes zoe-clap {
          0%, 100% { transform: translateX(0) translateY(0); }
          20% { transform: translateX(-8px) translateY(-3px); }
          40% { transform: translateX(8px) translateY(-3px); }
          60% { transform: translateX(-5px) translateY(-1px); }
          80% { transform: translateX(5px) translateY(-1px); }
        }
        @keyframes zoe-breathe {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1px); }
        }
      `}</style>

      <g
        style={{
          animation:
            state === "nod"
              ? "zoe-nod 0.6s ease-in-out"
              : state === "tilt"
                ? "zoe-tilt 0.7s ease-in-out"
                : state === "clap"
                  ? "zoe-clap 0.4s ease-in-out 3"
                  : "zoe-breathe 2.8s ease-in-out infinite",
        }}
      >
        {/* Body — casual hoodie */}
        <ellipse
          cx="60"
          cy="107"
          rx="35"
          ry="20"
          fill="#fbbf6a"
          opacity="0.85"
        />
        <path
          d="M42 95 Q60 100 78 95 L75 108 Q60 112 45 108 Z"
          fill="#e8a840"
          opacity="0.6"
        />
        {/* Neck */}
        <rect x="54" y="79" width="12" height="14" rx="6" fill="#e8b48a" />
        {/* Head — slightly rounder, youthful */}
        <ellipse cx="60" cy="63" rx="25" ry="26" fill="#e8b48a" />
        {/* Messy bun */}
        <ellipse cx="60" cy="37" rx="14" ry="14" fill="#8b4513" />
        <ellipse cx="60" cy="34" rx="10" ry="9" fill="#a0522d" />
        {/* Loose strands */}
        <path
          d="M36 50 Q32 42 38 36"
          stroke="#8b4513"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M84 50 Q88 42 82 36"
          stroke="#8b4513"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M38 58 Q34 52 36 45"
          stroke="#8b4513"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Ears */}
        <ellipse cx="35" cy="64" rx="4.5" ry="6" fill="#dba070" />
        <ellipse cx="85" cy="64" rx="4.5" ry="6" fill="#dba070" />
        {/* Eyes — bright, slightly bigger */}
        <ellipse cx="49" cy="62" rx="5.5" ry="5.5" fill="#fff" />
        <ellipse cx="71" cy="62" rx="5.5" ry="5.5" fill="#fff" />
        <ellipse cx="49.5" cy="62.5" rx="3.5" ry="3.5" fill="#3d1a00" />
        <ellipse cx="71.5" cy="62.5" rx="3.5" ry="3.5" fill="#3d1a00" />
        <circle cx="50.5" cy="61" r="1.3" fill="#fff" />
        <circle cx="72.5" cy="61" r="1.3" fill="#fff" />
        {/* Eyebrows — expressive, one slightly raised */}
        <path
          d="M43.5 55.5 Q49 53 54 55"
          stroke="#7a3800"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M66 54.5 Q71 52.5 76.5 54.5"
          stroke="#7a3800"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
        {/* Nose — small button */}
        <circle cx="60" cy="70" r="2" fill="#d0906a" opacity="0.5" />
        {/* Big open smile */}
        <path
          d="M51 75 Q60 82 69 75"
          stroke="#c07040"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M53 76 Q60 81 67 76 Q63 79 57 79 Z"
          fill="#c07040"
          opacity="0.3"
        />
        {/* Cheeks */}
        <ellipse cx="42" cy="70" rx="7" ry="4" fill="#f0907a" opacity="0.4" />
        <ellipse cx="78" cy="70" rx="7" ry="4" fill="#f0907a" opacity="0.4" />
        {/* Freckles */}
        <circle cx="55" cy="68" r="1" fill="#b87050" opacity="0.4" />
        <circle cx="65" cy="68" r="1" fill="#b87050" opacity="0.4" />
        <circle cx="52" cy="71" r="0.8" fill="#b87050" opacity="0.3" />
      </g>

      {state === "wave" && (
        <g style={{ animation: "zoe-wave 0.9s ease-in-out 2" }}>
          <path
            d="M85 78 Q95 65 99 54 Q102 45 98 40"
            stroke="#e8b48a"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
          />
          <ellipse cx="98" cy="38" rx="7" ry="6" fill="#e8b48a" />
        </g>
      )}
    </svg>
  )
}

// ── Dr. Nkosi — emerald, mid 50s, glasses, distinguished ─────────────
export function DrNkosiSVG({
  state = "idle",
  size = 120,
  className = "",
}: PersonaSVGProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ overflow: "visible" }}
    >
      <style>{`
        @keyframes nkosi-nod {
          0%, 100% { transform: translateY(0); }
          30% { transform: translateY(3px); }
          60% { transform: translateY(-1.5px); }
        }
        @keyframes nkosi-tilt {
          0%, 100% { transform: rotate(0deg); }
          40% { transform: rotate(-5deg); }
          70% { transform: rotate(3deg); }
        }
        @keyframes nkosi-wave {
          0%, 100% { transform: rotate(0deg); transform-origin: 86px 76px; }
          20% { transform: rotate(-14deg); transform-origin: 86px 76px; }
          40% { transform: rotate(11deg); transform-origin: 86px 76px; }
          60% { transform: rotate(-10deg); transform-origin: 86px 76px; }
          80% { transform: rotate(6deg); transform-origin: 86px 76px; }
        }
        @keyframes nkosi-clap {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          50% { transform: translateX(4px); }
          75% { transform: translateX(-2px); }
        }
        @keyframes nkosi-breathe {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.01); transform-origin: center bottom; }
        }
      `}</style>

      <g
        style={{
          animation:
            state === "nod"
              ? "nkosi-nod 0.8s ease-in-out"
              : state === "tilt"
                ? "nkosi-tilt 0.9s ease-in-out"
                : state === "clap"
                  ? "nkosi-clap 0.6s ease-in-out 2"
                  : "nkosi-breathe 4s ease-in-out infinite",
        }}
      >
        {/* Body — suit jacket */}
        <ellipse
          cx="60"
          cy="107"
          rx="38"
          ry="20"
          fill="#1a3a2a"
          opacity="0.95"
        />
        <path
          d="M46 95 L60 100 L74 95 L72 108 Q60 113 48 108 Z"
          fill="#0d2218"
          opacity="0.8"
        />
        {/* Collar / tie */}
        <path d="M55 93 L60 97 L65 93" fill="#fff" opacity="0.9" />
        <path
          d="M60 97 L59 103 L60 108 L61 103 Z"
          fill="#2d7a4a"
          opacity="0.8"
        />
        {/* Neck */}
        <rect x="54" y="79" width="12" height="15" rx="6" fill="#5a3010" />
        {/* Head */}
        <ellipse cx="60" cy="63" rx="24" ry="26" fill="#5a3010" />
        {/* Hair — very short, greying at temples */}
        <path d="M36 60 Q36 37 60 36 Q84 37 84 60" fill="#1a0a00" />
        {/* Grey temples */}
        <ellipse cx="38" cy="56" rx="6" ry="8" fill="#888888" opacity="0.5" />
        <ellipse cx="82" cy="56" rx="6" ry="8" fill="#888888" opacity="0.5" />
        {/* Ears */}
        <ellipse cx="36" cy="64" rx="4.5" ry="7" fill="#4a2808" />
        <ellipse cx="84" cy="64" rx="4.5" ry="7" fill="#4a2808" />
        {/* Glasses frame */}
        <rect
          x="42"
          y="57"
          width="15"
          height="11"
          rx="3"
          stroke="#b8860b"
          strokeWidth="2"
          fill="none"
          opacity="0.9"
        />
        <rect
          x="63"
          y="57"
          width="15"
          height="11"
          rx="3"
          stroke="#b8860b"
          strokeWidth="2"
          fill="none"
          opacity="0.9"
        />
        <path d="M57 62.5 L63 62.5" stroke="#b8860b" strokeWidth="2" />
        <path d="M42 62.5 L38 61" stroke="#b8860b" strokeWidth="1.5" />
        <path d="M78 62.5 L82 61" stroke="#b8860b" strokeWidth="1.5" />
        {/* Eyes — behind glasses, thoughtful */}
        <ellipse cx="49.5" cy="62.5" rx="4" ry="4" fill="#fff" opacity="0.9" />
        <ellipse cx="70.5" cy="62.5" rx="4" ry="4" fill="#fff" opacity="0.9" />
        <ellipse cx="49.5" cy="62.5" rx="2.5" ry="2.5" fill="#0d0500" />
        <ellipse cx="70.5" cy="62.5" rx="2.5" ry="2.5" fill="#0d0500" />
        <circle cx="50.5" cy="61.5" r="1" fill="#fff" />
        <circle cx="71.5" cy="61.5" r="1" fill="#fff" />
        {/* Eyebrows — mature, slightly heavy */}
        <path
          d="M43 55 Q49.5 53 56 55"
          stroke="#1a0800"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M64 55 Q70.5 53 77 55"
          stroke="#1a0800"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Nose — prominent */}
        <path
          d="M57 70 Q60 74 63 70"
          stroke="#3a1e08"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <ellipse
          cx="60"
          cy="71"
          rx="2.5"
          ry="1.5"
          fill="#3a1e08"
          opacity="0.3"
        />
        {/* Measured smile */}
        <path
          d="M54 77 Q60 81 66 77"
          stroke="#3a1a08"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
        {/* Beard / short */}
        <path
          d="M48 78 Q60 88 72 78 Q68 84 60 85 Q52 84 48 78Z"
          fill="#2a1200"
          opacity="0.35"
        />
        {/* Grey beard streaks */}
        <path
          d="M58 80 Q60 84 62 80"
          stroke="#888"
          strokeWidth="1"
          opacity="0.5"
          strokeLinecap="round"
          fill="none"
        />
      </g>

      {state === "wave" && (
        <g style={{ animation: "nkosi-wave 1.1s ease-in-out 1.5" }}>
          <path
            d="M84 80 Q93 70 96 60 Q99 52 96 47"
            stroke="#5a3010"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
          />
          <ellipse cx="96" cy="45" rx="6" ry="5.5" fill="#5a3010" />
        </g>
      )}
    </svg>
  )
}

// ── Priya — violet, early 30s, sleek pulled-back hair, direct ────────
export function PriyaSVG({
  state = "idle",
  size = 120,
  className = "",
}: PersonaSVGProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ overflow: "visible" }}
    >
      <style>{`
        @keyframes priya-nod {
          0%, 100% { transform: translateY(0); }
          30% { transform: translateY(4px); }
          60% { transform: translateY(-2px); }
        }
        @keyframes priya-tilt {
          0%, 100% { transform: rotate(0deg); }
          40% { transform: rotate(-7deg); }
          70% { transform: rotate(4deg); }
        }
        @keyframes priya-wave {
          0%, 100% { transform: rotate(0deg); transform-origin: 88px 74px; }
          20% { transform: rotate(-20deg); transform-origin: 88px 74px; }
          40% { transform: rotate(16deg); transform-origin: 88px 74px; }
          60% { transform: rotate(-14deg); transform-origin: 88px 74px; }
          80% { transform: rotate(9deg); transform-origin: 88px 74px; }
        }
        @keyframes priya-clap {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-7px); }
          50% { transform: translateX(7px); }
          75% { transform: translateX(-4px); }
        }
        @keyframes priya-breathe {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1.5px); }
        }
      `}</style>

      <g
        style={{
          animation:
            state === "nod"
              ? "priya-nod 0.65s ease-in-out"
              : state === "tilt"
                ? "priya-tilt 0.75s ease-in-out"
                : state === "clap"
                  ? "priya-clap 0.45s ease-in-out 2"
                  : "priya-breathe 3.2s ease-in-out infinite",
        }}
      >
        {/* Body — sharp blazer */}
        <ellipse
          cx="60"
          cy="107"
          rx="36"
          ry="20"
          fill="#6d3d8a"
          opacity="0.9"
        />
        <path
          d="M44 93 L60 99 L76 93 L74 107 Q60 112 46 107 Z"
          fill="#4a2460"
          opacity="0.9"
        />
        <path d="M55 92 L60 96 L65 92" fill="#fff" opacity="0.85" />
        {/* Neck */}
        <rect x="54" y="79" width="12" height="14" rx="6" fill="#c4845a" />
        {/* Head */}
        <ellipse cx="60" cy="63" rx="24" ry="26" fill="#c4845a" />
        {/* Sleek pulled-back hair */}
        <path
          d="M36 58 Q36 35 60 34 Q84 35 84 58 Q84 50 60 48 Q36 50 36 58Z"
          fill="#1a0808"
        />
        {/* Hair pulled back — bun suggestion */}
        <ellipse cx="60" cy="37" rx="16" ry="6" fill="#1a0808" />
        <path
          d="M44 42 Q40 38 36 40"
          stroke="#1a0808"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M76 42 Q80 38 84 40"
          stroke="#1a0808"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* Ears */}
        <ellipse cx="36" cy="63" rx="4.5" ry="6.5" fill="#b47448" />
        <ellipse cx="84" cy="63" rx="4.5" ry="6.5" fill="#b47448" />
        {/* Small earring */}
        <circle cx="36" cy="68" r="2" fill="#a070c0" opacity="0.9" />
        <circle cx="84" cy="68" r="2" fill="#a070c0" opacity="0.9" />
        {/* Eyes — focused, direct */}
        <ellipse cx="49.5" cy="62" rx="5" ry="5" fill="#fff" />
        <ellipse cx="70.5" cy="62" rx="5" ry="5" fill="#fff" />
        <ellipse cx="50" cy="62" rx="3" ry="3" fill="#0d0500" />
        <ellipse cx="71" cy="62" rx="3" ry="3" fill="#0d0500" />
        <circle cx="51" cy="61" r="1.1" fill="#fff" />
        <circle cx="72" cy="61" r="1.1" fill="#fff" />
        {/* Eyebrows — strong, defined */}
        <path
          d="M44 55 Q49.5 53 55 55"
          stroke="#1a0808"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M65 55 Q70.5 53 76 55"
          stroke="#1a0808"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
        {/* Nose — defined */}
        <path
          d="M58 69 Q60 73 62 69"
          stroke="#a06030"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Confident half-smile */}
        <path
          d="M54 76 Q60 79 66 76"
          stroke="#904020"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
        {/* Lip color — subtle */}
        <path d="M56 76.5 Q60 79 64 76.5" fill="#c04060" opacity="0.2" />
        {/* Cheeks — subtle */}
        <ellipse cx="43" cy="69" rx="5" ry="3" fill="#e08060" opacity="0.25" />
        <ellipse cx="77" cy="69" rx="5" ry="3" fill="#e08060" opacity="0.25" />
      </g>

      {state === "wave" && (
        <g style={{ animation: "priya-wave 0.95s ease-in-out 1.5" }}>
          <path
            d="M84 78 Q94 67 98 56 Q101 48 98 43"
            stroke="#c4845a"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
          />
          <ellipse cx="98" cy="41" rx="6.5" ry="6" fill="#c4845a" />
        </g>
      )}
    </svg>
  )
}

// ── Persona resolver ──────────────────────────────────────────────────
interface PersonaDisplayProps {
  personaId: string
  state?: PersonaAnimationState
  size?: number
  className?: string
}

export function PersonaDisplay({
  personaId,
  state = "idle",
  size = 120,
  className = "",
}: PersonaDisplayProps) {
  switch (personaId) {
    case "amara":
      return <AmaraSVG state={state} size={size} className={className} />
    case "james":
      return <JamesSVG state={state} size={size} className={className} />
    case "zoe":
      return <ZoeSVG state={state} size={size} className={className} />
    case "dr-nkosi":
      return <DrNkosiSVG state={state} size={size} className={className} />
    case "priya":
      return <PriyaSVG state={state} size={size} className={className} />
    default:
      return <AmaraSVG state={state} size={size} className={className} />
  }
}
