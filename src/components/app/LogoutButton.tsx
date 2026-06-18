"use client"

import { useState } from "react"

export function LogoutButton({ className }: { className?: string }) {
  const [loading, setLoading] = useState(false)

  async function logout() {
    setLoading(true)
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = "/login"
  }

  return (
    <button className={className} onClick={logout} disabled={loading}>
      <span className="material-symbols-outlined">logout</span>
      {loading ? "Logging out..." : "Log Out"}
    </button>
  )
}
