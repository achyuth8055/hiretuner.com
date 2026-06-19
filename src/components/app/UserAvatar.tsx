"use client"

import { useState } from "react"

/**
 * Avatar that prefers the user's Google profile photo and gracefully falls back
 * to a colored initials disc if the image is missing or fails to load (Google
 * sometimes 403s their CDN URLs for non-Google clients).
 */
export function UserAvatar({
  name,
  email,
  photoUrl,
  size = 32,
  className = "",
}: {
  name: string
  email: string
  photoUrl?: string | null
  size?: number
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const initials = computeInitials(name || email)
  const hue = stringToHue(email || name)

  const ringStyle = `border border-outline-variant/50 rounded-full overflow-hidden`

  if (photoUrl && !failed) {
    return (
      <img
        src={photoUrl}
        alt={name || email}
        width={size}
        height={size}
        onError={() => setFailed(true)}
        referrerPolicy="no-referrer"
        className={`${ringStyle} object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      role="img"
      aria-label={name || email}
      title={name || email}
      className={`${ringStyle} flex items-center justify-center text-white font-medium ${className}`}
      style={{
        width: size,
        height: size,
        background: `hsl(${hue}deg 55% 42%)`,
        fontSize: Math.max(11, Math.round(size * 0.42)),
      }}
    >
      {initials}
    </div>
  )
}

function computeInitials(input: string): string {
  const trimmed = (input || "").trim()
  if (!trimmed) return "?"
  // If it looks like an email, use the local part.
  const atIndex = trimmed.indexOf("@")
  const source = atIndex > 0 ? trimmed.slice(0, atIndex) : trimmed
  const parts = source
    .replace(/[._-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return source[0]!.toUpperCase()
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
}

function stringToHue(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % 360
}
