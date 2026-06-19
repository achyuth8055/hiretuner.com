"use client"

import { useEffect, useMemo, useState } from "react"

type Step = {
  id: string
  label: string
  detail: string
  icon: string
}

const TAILOR_STEPS: Step[] = [
  {
    id: "analyze",
    label: "Reading the job description",
    detail: "Extracting required skills, responsibilities, and ATS keywords.",
    icon: "search",
  },
  {
    id: "match",
    label: "Matching against your master resume",
    detail: "Mapping proven skills, scoring keyword coverage.",
    icon: "compare_arrows",
  },
  {
    id: "rewrite",
    label: "Rewriting with AI to surface JD keywords",
    detail: "Rewording summary + bullets while preserving structure and tone.",
    icon: "auto_awesome",
  },
  {
    id: "score",
    label: "Recalculating ATS match score",
    detail: "Logging every safe rewrite for your review.",
    icon: "trending_up",
  },
]

const ANALYZE_STEPS: Step[] = [
  {
    id: "parse",
    label: "Parsing job description",
    detail: "Pulling job title, responsibilities, and required skills.",
    icon: "search",
  },
  {
    id: "keywords",
    label: "Building keyword coverage map",
    detail: "Comparing against your master resume.",
    icon: "list_alt",
  },
  {
    id: "score",
    label: "Estimating original match score",
    detail: "Telling you where the gap is.",
    icon: "analytics",
  },
]

/** Step advance cadence. Chosen so the bar fills smoothly across a 3-10s call. */
const STEP_INTERVAL_MS = 1_400

export function TailoringProgressOverlay({
  open,
  mode = "tailor",
  title,
}: {
  open: boolean
  mode?: "tailor" | "analyze"
  title?: string
}) {
  const steps = useMemo(() => (mode === "analyze" ? ANALYZE_STEPS : TAILOR_STEPS), [mode])
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (!open) return
    // Advance through steps but never past the last one — the actual API
    // response will close the overlay when it's done. We linger on the last
    // step so slow LLM calls (DeepSeek ~3s, OpenAI ~5s) still feel honest.
    // Reset is handled via the `key` change the parent passes when re-opening.
    const id = setInterval(() => {
      setActiveIndex((current) => Math.min(current + 1, steps.length - 1))
    }, STEP_INTERVAL_MS)
    return () => clearInterval(id)
  }, [open, steps.length])

  if (!open) return null

  const ringPercent = Math.round(((activeIndex + 1) / steps.length) * 100)
  const heading =
    title ?? (mode === "analyze" ? "Analyzing the job description…" : "Tailoring your resume…")

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="status"
      aria-live="polite"
      aria-label={heading}
    >
      <div className="bg-surface dark:bg-surface-container-high rounded-2xl max-w-[520px] w-full shadow-xl border border-outline-variant/20 overflow-hidden">
        {/* Top progress ring + heading */}
        <div className="p-stack-lg flex items-center gap-stack-md border-b border-outline-variant/30">
          <ProgressRing percent={ringPercent} />
          <div className="flex-1">
            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">{heading}</h3>
            <p className="text-body-sm text-on-surface-variant mt-1">
              This takes 3-15 seconds. Don&apos;t close the tab.
            </p>
          </div>
        </div>

        {/* Steps */}
        <ol className="p-stack-md flex flex-col gap-stack-sm">
          {steps.map((step, index) => {
            const state: "done" | "active" | "pending" =
              index < activeIndex ? "done" : index === activeIndex ? "active" : "pending"
            return (
              <li key={step.id} className="flex items-start gap-3">
                <StepIcon icon={step.icon} state={state} />
                <div className="flex-1 min-w-0">
                  <div
                    className={`font-medium ${
                      state === "pending" ? "text-on-surface-variant" : "text-on-surface"
                    }`}
                  >
                    {step.label}
                  </div>
                  <div className="text-body-sm text-on-surface-variant truncate">{step.detail}</div>
                </div>
                {state === "active" && (
                  <span className="material-symbols-outlined text-secondary text-sm animate-spin">
                    progress_activity
                  </span>
                )}
                {state === "done" && (
                  <span className="material-symbols-outlined text-[#10B981] text-sm">check</span>
                )}
              </li>
            )
          })}
        </ol>

        {/* Bottom shimmer bar to reassure during the last step linger */}
        <div className="px-stack-md pb-stack-md">
          <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
            <div
              className="h-full bg-secondary rounded-full transition-all duration-500"
              style={{ width: `${Math.max(8, ringPercent)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function ProgressRing({ percent }: { percent: number }) {
  const size = 56
  const stroke = 5
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference - (percent / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-surface-container-high"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-secondary transition-[stroke-dashoffset] duration-700 ease-out"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center text-xs font-bold text-secondary"
        aria-hidden
      >
        {percent}%
      </div>
    </div>
  )
}

function StepIcon({
  icon,
  state,
}: {
  icon: string
  state: "done" | "active" | "pending"
}) {
  const base =
    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-[2px] transition-colors"
  if (state === "done") {
    return (
      <div className={`${base} bg-[#10B981]/15 text-[#10B981]`}>
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      </div>
    )
  }
  if (state === "active") {
    return (
      <div className={`${base} bg-secondary/15 text-secondary ring-2 ring-secondary/30 animate-pulse`}>
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      </div>
    )
  }
  return (
    <div className={`${base} bg-surface-container-high text-on-surface-variant/60`}>
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
    </div>
  )
}
