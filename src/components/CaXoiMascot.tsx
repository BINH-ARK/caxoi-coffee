import React from "react";

interface CaXoiMascotProps {
  className?: string;
  showPaws?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

export default function CaXoiMascot({
  className = "",
  showPaws = true,
  size = "md",
}: CaXoiMascotProps) {
  const sizeMap = {
    sm: "w-10 h-10",
    md: "w-20 h-20",
    lg: "w-36 h-36",
    xl: "w-48 h-48",
  };

  return (
    <div className={`relative inline-block select-none ${className}`}>
      <svg
        viewBox="0 0 240 200"
        className={`${sizeMap[size]} overflow-visible`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Cat Ears */}
        {/* Left Ear */}
        <path
          d="M45 105 L25 25 L85 55 Z"
          fill="#6B7280"
          stroke="#374151"
          strokeWidth="6"
          strokeLinejoin="round"
        />
        <path
          d="M48 90 L38 38 L78 60 Z"
          fill="#FBCFE8"
        />

        {/* Right Ear */}
        <path
          d="M195 105 L215 25 L155 55 Z"
          fill="#6B7280"
          stroke="#374151"
          strokeWidth="6"
          strokeLinejoin="round"
        />
        <path
          d="M192 90 L202 38 L162 60 Z"
          fill="#FBCFE8"
        />

        {/* Head Shape */}
        <ellipse
          cx="120"
          cy="115"
          rx="80"
          ry="65"
          fill="#6B7280"
          stroke="#374151"
          strokeWidth="6"
        />

        {/* White Blaze / Muzzle on Face */}
        <path
          d="M120 70 C105 85 85 95 85 125 C85 155 100 170 120 170 C140 170 155 155 155 125 C155 95 135 85 120 70 Z"
          fill="#FFFFFF"
        />

        {/* Left Eye */}
        <circle cx="85" cy="115" r="20" fill="#1F2937" stroke="#374151" strokeWidth="3" />
        <circle cx="80" cy="108" r="7" fill="#FFFFFF" />
        <circle cx="92" cy="120" r="3.5" fill="#FFFFFF" />
        {/* Subtle pink eyelid sheen */}
        <path
          d="M68 102 C75 96 95 96 102 102"
          stroke="#F472B6"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Right Eye */}
        <circle cx="155" cy="115" r="20" fill="#1F2937" stroke="#374151" strokeWidth="3" />
        <circle cx="150" cy="108" r="7" fill="#FFFFFF" />
        <circle cx="162" cy="120" r="3.5" fill="#FFFFFF" />
        <path
          d="M138 102 C145 96 165 96 172 102"
          stroke="#F472B6"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Nose */}
        <polygon
          points="120,132 113,124 127,124"
          fill="#831843"
          stroke="#831843"
          strokeLinejoin="round"
        />

        {/* Mouth (Cute Cat Smile) */}
        <path
          d="M120 133 L120 142 C115 144 108 144 105 140"
          stroke="#374151"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M120 142 C125 144 132 144 135 140"
          stroke="#374151"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Whiskers */}
        <line x1="50" y1="125" x2="20" y2="120" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="50" y1="135" x2="22" y2="138" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="190" y1="125" x2="220" y2="120" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="190" y1="135" x2="218" y2="138" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" />

        {/* Cute Paws (Optional / Default True) */}
        {showPaws && (
          <g transform="translate(0, 15)">
            {/* Left Paw */}
            <path
              d="M55 160 C55 145 75 145 75 160 C75 145 95 145 95 160 C95 145 110 145 110 165 C110 185 55 185 55 160 Z"
              fill="#FFFFFF"
              stroke="#374151"
              strokeWidth="5"
            />
            {/* Left Toe lines */}
            <line x1="75" y1="155" x2="75" y2="175" stroke="#374151" strokeWidth="3" strokeLinecap="round" />
            <line x1="95" y1="155" x2="95" y2="175" stroke="#374151" strokeWidth="3" strokeLinecap="round" />

            {/* Right Paw */}
            <path
              d="M130 165 C130 145 145 145 145 160 C145 145 165 145 165 160 C165 145 185 145 185 160 C185 185 130 185 130 165 Z"
              fill="#FFFFFF"
              stroke="#374151"
              strokeWidth="5"
            />
            {/* Right Toe lines */}
            <line x1="145" y1="155" x2="145" y2="175" stroke="#374151" strokeWidth="3" strokeLinecap="round" />
            <line x1="165" y1="155" x2="165" y2="175" stroke="#374151" strokeWidth="3" strokeLinecap="round" />
          </g>
        )}
      </svg>
    </div>
  );
}
