"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { ResumeDocument } from "./ResumeDocument"
import { resumeTemplates, templateTags } from "@/lib/resume-templates/registry"
import { sampleResume, sampleCv } from "@/lib/resume-templates/sample-data"
import type { ResumeTemplate, TemplateCategory } from "@/lib/resume-templates/types"

const THUMB_WIDTH = 300
const PAGE_WIDTH = 794
const PAGE_HEIGHT = 1123
const SCALE = THUMB_WIDTH / PAGE_WIDTH

type CategoryFilter = "all" | "resume" | "cv"

/** CV templates use the richer CV sample (publications); others use the resume sample. */
function dataFor(template: ResumeTemplate) {
  return template.category === "cv" ? sampleCv : sampleResume
}

function matchesCategory(template: ResumeTemplate, filter: CategoryFilter) {
  if (filter === "all") return true
  if (template.category === "both") return true
  return template.category === filter
}

function Thumbnail({ template, height }: { template: ResumeTemplate; height: number }) {
  return (
    <div
      aria-hidden
      style={{ width: THUMB_WIDTH, height, overflow: "hidden", position: "relative" }}
      className="bg-white"
    >
      <div style={{ transform: `scale(${SCALE})`, transformOrigin: "top left", width: PAGE_WIDTH }}>
        <ResumeDocument template={template} data={dataFor(template)} />
      </div>
    </div>
  )
}

export function TemplateGallery() {
  const [category, setCategory] = useState<CategoryFilter>("all")
  const [tag, setTag] = useState<string | null>(null)
  const [active, setActive] = useState<ResumeTemplate | null>(null)

  const thumbHeight = Math.round(PAGE_HEIGHT * SCALE * 0.62) // crop to the top ~62% for a clean card

  const visible = useMemo(
    () =>
      resumeTemplates.filter(
        (template) => matchesCategory(template, category) && (!tag || template.tags.includes(tag)),
      ),
    [category, tag],
  )

  return (
    <div className="w-full">
      {/* Filters */}
      <div className="flex flex-col gap-stack-md mb-stack-lg">
        <div className="flex flex-wrap gap-stack-xs">
          {(["all", "resume", "cv"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setCategory(value)}
              className={`px-4 py-2 rounded-full font-label-uppercase text-label-uppercase uppercase tracking-wide transition-colors ${
                category === value
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {value === "all" ? "All templates" : value === "resume" ? "Resumes" : "CVs"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-stack-xs">
          <button
            type="button"
            onClick={() => setTag(null)}
            className={`px-3 py-1 rounded-full text-body-sm transition-colors ${
              tag === null ? "bg-secondary-container text-on-secondary-container" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            Any style
          </button>
          {templateTags.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTag(value === tag ? null : value)}
              className={`px-3 py-1 rounded-full text-body-sm transition-colors ${
                tag === value ? "bg-secondary-container text-on-secondary-container" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
        <p className="text-body-sm text-on-surface-variant">
          Showing {visible.length} of {resumeTemplates.length} templates
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-stack-lg">
        {visible.map((template) => (
          <div
            key={template.id}
            className="group flex flex-col rounded-xl overflow-hidden border border-outline-variant/40 bg-surface-container-lowest dark:bg-surface-container-low shadow-sm hover:shadow-md transition-shadow"
          >
            <button
              type="button"
              onClick={() => setActive(template)}
              className="relative flex justify-center pt-stack-md bg-surface-container-low dark:bg-surface-container overflow-hidden"
              aria-label={`Preview ${template.name}`}
            >
              <div className="rounded-t-md shadow-sm ring-1 ring-black/5">
                <Thumbnail template={template} height={thumbHeight} />
              </div>
              <span className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-on-primary text-body-sm font-medium px-4 py-2 rounded-full shadow">
                  Preview
                </span>
              </span>
            </button>
            <div className="flex flex-col gap-1 p-stack-md">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">{template.name}</h3>
                <span className="text-label-uppercase font-label-uppercase uppercase tracking-wide text-secondary">
                  {template.category === "cv" ? "CV" : template.category === "both" ? "Resume / CV" : "Resume"}
                </span>
              </div>
              <p className="text-body-sm text-on-surface-variant line-clamp-2">{template.description}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {template.tags.map((value) => (
                  <span key={value} className="text-xs text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                    {value}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-stack-sm">
                <Button asChild className="flex-1">
                  <Link href={`/signup?template=${template.id}`}>Use this template</Link>
                </Button>
                <button
                  type="button"
                  onClick={() => setActive(template)}
                  className="px-3 py-2 rounded-full text-body-sm border border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition-colors"
                  aria-label={`Preview ${template.name}`}
                >
                  Preview
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Preview modal */}
      {active && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start md:items-center justify-center p-4 overflow-auto"
          role="dialog"
          aria-modal="true"
          aria-label={`${active.name} preview`}
          onClick={() => setActive(null)}
        >
          <div
            className="bg-surface dark:bg-surface-container-high rounded-2xl max-w-[860px] w-full my-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 p-stack-md border-b border-outline-variant/40">
              <div>
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface">{active.name}</h3>
                <p className="text-body-sm text-on-surface-variant">{active.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setActive(null)}
                className="text-on-surface-variant hover:text-on-surface"
                aria-label="Close preview"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-stack-lg flex justify-center bg-surface-container-low dark:bg-surface-container overflow-auto">
              <div className="shadow-lg ring-1 ring-black/10" style={{ width: PAGE_WIDTH * 0.74 }}>
                <div style={{ transform: "scale(0.74)", transformOrigin: "top left", width: PAGE_WIDTH }}>
                  <ResumeDocument template={active} data={dataFor(active)} />
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-stack-sm p-stack-md border-t border-outline-variant/40">
              <span className="text-body-sm text-on-surface-variant">
                Pick this template and fill it with your details in the builder.
              </span>
              <Button asChild>
                <Link href={`/signup?template=${active.id}`}>Use this template</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export type { TemplateCategory }
