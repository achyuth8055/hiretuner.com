"use client"

import { useState } from "react"
import Link from "next/link"
import { PricingCTA } from "@/components/app/PricingCTA"

type Interval = "monthly" | "yearly"

const FEATURE_CHECK =
  "material-symbols-outlined text-[18px]"

function Feature({ children, tone }: { children: React.ReactNode; tone: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className={`${FEATURE_CHECK} ${tone}`}>check</span>
      {children}
    </li>
  )
}

/**
 * Marketing pricing grid: Basic (free), Starter, and Pro. Starter and Pro each
 * switch between monthly and yearly via a shared toggle. Pro's yearly variant is
 * marketed as "Max" ($120/yr). Ad-free + unlimited usage is Pro-only; Starter
 * (monthly or yearly) is capped and ad-supported.
 */
export function PricingPlans() {
  const [interval, setInterval] = useState<Interval>("monthly")
  const yearly = interval === "yearly"

  return (
    <div className="flex flex-col items-center">
      {/* Billing toggle */}
      <div
        className="inline-flex items-center gap-1 p-1 mb-stack-lg rounded-full border border-outline-variant bg-surface-container-lowest"
        role="group"
        aria-label="Billing interval"
      >
        <button
          type="button"
          onClick={() => setInterval("monthly")}
          aria-pressed={!yearly}
          className={`px-5 py-2 rounded-full font-label-uppercase text-label-uppercase transition-colors ${
            !yearly
              ? "bg-primary text-on-primary"
              : "text-on-surface-variant hover:text-primary"
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setInterval("yearly")}
          aria-pressed={yearly}
          className={`px-5 py-2 rounded-full font-label-uppercase text-label-uppercase transition-colors flex items-center gap-2 ${
            yearly
              ? "bg-primary text-on-primary"
              : "text-on-surface-variant hover:text-primary"
          }`}
        >
          Yearly
          <span className="bg-tertiary-container text-on-tertiary-container text-[10px] px-2 py-0.5 rounded-full">
            Save up to 24%
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter max-w-5xl mx-auto items-stretch w-full">
        {/* Basic (Free) Card */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg flex flex-col hover:border-secondary transition-colors">
          <h3 className="font-headline-md text-headline-md text-primary">Basic</h3>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="font-display-lg text-display-lg text-primary">$0</span>
            <span className="text-on-surface-variant font-body-sm text-body-sm">/ forever</span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 border-b border-outline-variant/30 pb-4">
            Test the waters and see the AI in action.
          </p>
          <ul className="mt-4 space-y-3 flex-grow font-body-sm text-body-sm text-primary">
            <Feature tone="text-tertiary-container">5 Resume Matches per month</Feature>
            <Feature tone="text-tertiary-container">Basic ATS Keyword Gap Analysis</Feature>
            <Feature tone="text-tertiary-container">Standard PDF Export</Feature>
          </ul>
          <Link
            className="mt-8 w-full block text-center bg-surface-container border border-outline-variant text-primary font-label-uppercase text-label-uppercase px-4 py-3 rounded-lg hover:bg-surface-variant transition-colors"
            href="/signup"
          >
            Start Free
          </Link>
        </div>

        {/* Starter Card */}
        <div className="bg-primary text-on-primary border border-primary rounded-xl p-stack-lg flex flex-col relative shadow-lg transform md:-translate-y-2">
          <div className="absolute top-0 right-6 transform -translate-y-1/2">
            <span className="bg-secondary text-on-secondary font-label-uppercase text-[10px] px-3 py-1 rounded-full shadow-sm">
              Most Popular
            </span>
          </div>
          <h3 className="font-headline-md text-headline-md">Starter</h3>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="font-display-lg text-display-lg">{yearly ? "$49.99" : "$5.49"}</span>
            <span className="text-inverse-primary font-body-sm text-body-sm">
              {yearly ? "/ year" : "/ month"}
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-inverse-primary mt-2 border-b border-outline-variant/30 pb-4">
            {yearly
              ? "Just $4.16 / month, billed annually — nearly 3 months free."
              : "Everything you need for an active job hunt."}
          </p>
          <ul className="mt-4 space-y-3 flex-grow font-body-sm text-body-sm">
            <Feature tone="text-tertiary-fixed-dim">Up to 100 tailored resumes / month</Feature>
            <Feature tone="text-tertiary-fixed-dim">Resume Tailoring Engine</Feature>
            <Feature tone="text-tertiary-fixed-dim">Master Resume Management</Feature>
            <Feature tone="text-tertiary-fixed-dim">Application Tracker Dashboard</Feature>
          </ul>
          <PricingCTA
            plan="starter"
            interval={interval}
            className="w-full block text-center bg-secondary text-on-secondary font-label-uppercase text-label-uppercase px-4 py-3 rounded-lg hover:bg-secondary-container transition-colors disabled:opacity-60 disabled:pointer-events-none"
          >
            {yearly ? "Get Starter Yearly" : "Get Starter Monthly"}
          </PricingCTA>
        </div>

        {/* Pro Card (yearly = "Max") */}
        <div className="bg-surface-container-lowest border border-secondary rounded-xl p-stack-lg flex flex-col relative shadow-md hover:border-secondary transition-colors">
          <div className="absolute top-0 right-6 transform -translate-y-1/2">
            <span className="bg-tertiary-container text-on-tertiary-container font-label-uppercase text-[10px] px-3 py-1 rounded-full shadow-sm">
              {yearly ? "Max — Best Value" : "Unlimited"}
            </span>
          </div>
          <h3 className="font-headline-md text-headline-md text-primary">
            {yearly ? "Pro · Max" : "Pro"}
          </h3>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="font-display-lg text-display-lg text-primary">
              {yearly ? "$120" : "$9.99"}
            </span>
            <span className="text-on-surface-variant font-body-sm text-body-sm">
              {yearly ? "/ year" : "/ month"}
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 border-b border-outline-variant/30 pb-4">
            {yearly
              ? "Just $10 / month, billed annually. Unlimited, ad-free, forever-fast."
              : "Unlimited usage and a completely ad-free experience."}
          </p>
          <ul className="mt-4 space-y-3 flex-grow font-body-sm text-body-sm text-primary">
            <Feature tone="text-tertiary-container">Unlimited tailored resumes</Feature>
            <Feature tone="text-tertiary-container">Unlimited ATS &amp; match checks</Feature>
            <Feature tone="text-tertiary-container">Completely ad-free</Feature>
            <Feature tone="text-tertiary-container">Priority support</Feature>
            <Feature tone="text-tertiary-container">1-year version history</Feature>
          </ul>
          <PricingCTA
            plan="pro"
            interval={interval}
            className="w-full block text-center bg-primary text-on-primary font-label-uppercase text-label-uppercase px-4 py-3 rounded-lg hover:bg-inverse-surface transition-colors disabled:opacity-60 disabled:pointer-events-none"
          >
            {yearly ? "Get Max (Yearly)" : "Get Pro Monthly"}
          </PricingCTA>
        </div>
      </div>
    </div>
  )
}
