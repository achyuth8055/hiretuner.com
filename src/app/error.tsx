"use client"

import { useEffect } from "react"
import Link from "next/link"

export default function RouteError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error("Route error boundary:", error)
  }, [error])

  return (
    <section className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <h1 className="font-headline-md text-headline-md text-primary mb-2">
        Something went wrong
      </h1>
      <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md mb-6">
        We hit an unexpected error while loading this page. Try again, or head back to your
        dashboard.
      </p>
      {error.digest && (
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-6 opacity-60">
          Error ID: {error.digest}
        </p>
      )}
      <div className="flex gap-3 flex-wrap justify-center">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="bg-secondary text-on-secondary font-label-uppercase text-label-uppercase px-4 py-3 rounded-lg hover:bg-secondary-container transition-colors"
        >
          Try again
        </button>
        <Link
          href="/"
          className="border border-outline-variant text-primary font-label-uppercase text-label-uppercase px-4 py-3 rounded-lg hover:bg-surface-variant transition-colors"
        >
          Go home
        </Link>
      </div>
    </section>
  )
}
