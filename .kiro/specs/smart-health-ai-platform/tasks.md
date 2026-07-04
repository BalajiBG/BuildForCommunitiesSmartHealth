# Implementation Plan: Smart Health AI Platform

## Overview

This plan implements a multilingual, AI-driven health centre management platform using Next.js 15 (App Router), Firebase Realtime Database, Google Gemini API, and Google Cloud Run. Tasks are organized incrementally: project scaffolding → core services → data modules → AI features → deployment, ensuring no orphaned code.

## Tasks

- [x] 1. Project scaffolding and core infrastructure
  - [x] 1.1 Initialize Next.js 15 project with TypeScript, Tailwind CSS, and dependencies
    - Create Next.js 15 app with App Router, TypeScript strict mode, Tailwind CSS
    - Install dependencies: `firebase`, `firebase-admin`, `@google/generative-ai`, `next-intl`, `react-chartjs-2`, `chart.js`, `@react-google-maps/api`
    - Install dev dependencies: `vitest`, `fast-check`, `@testing-library/react`, `msw`
    - Configure `tsconfig.json` path aliases (`@/lib`, `@/components`, `@/app`)
    - _Requirements: 11.1, 11.2_

  - [x] 1.2 Create core TypeScript interfaces and data models
    - Create `/lib/types/index.ts` with all interfaces: `HealthCentre`, `MedicineStock`, `PatientFootfall`, `DoctorAttendance`, `StockPrediction`, `RedistributionRecommendation`, `UserProfile`, `APIErrorResponse`
    - _Requirements: 3.1, 4.1, 5.1, 6.1, 7.2, 8.2_

  - [x] 1.3 Set up Firebase client SDK configuration and admin SDK initialization
    - Create `/lib/firebase/client.ts` — initialize Firebase app, Auth, and RTDB from env vars
    - Create `/lib/firebase/admin.ts` — initialize Firebase Admin SDK for server-side API routes
    - Create `/lib/firebase/types.ts` — RTDB path constants matching the schema
    - _Requirements: 1.1, 11.2_

  - [x] 1.4 Set up environment variable validation and startup check
    - Create `/lib/config/env.ts` — validate required env vars (`FIREBASE_API_KEY`, `FIREBASE_PROJECT_ID`, `FIREBASE_DATABASE_URL`, `GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY`, `PORT`) at startup
    - Exit with non-zero status and log missing variable names if any are absent
    - _Requirements: 11.2, 11.3_

  - [x]* 1.5 Write property test for environment variable validation
    - **Property 19: Missing environment variable reporting**
    - **Validates: Requirements 11.3**

  - [x] 1.6 Set up internationalization with next-intl
    - Create `/messages/en.json` and `/messages/hi.json` with all UI labels
    - Create `/lib/i18n/config.ts` with locale configuration (default: English)
    - Create `/components/LanguageSwitcher.tsx` dropdown component
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 2. Authentication and authorization module
  - [x] 2.1 Implement Firebase Auth with Google Sign-In
    - Create `/app/(auth)/login/page.tsx` with Google Sign-In button
    - Create `/lib/contexts/AuthProvider.tsx` — React context providing auth state, user profile, role, loading
    - On successful auth, read `/users/{uid}/role` from RTDB and store in context
    - Display specific error messages on failure (network unavailable, account not authorized)
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 2.2 Implement route guards and role-based access
    - Create `/lib/guards/AuthGuard.tsx` — redirect unauthenticated users to login
    - Create `/lib/guards/RoleGuard.tsx` — restrict pages by role (District_Admin, Centre_Staff)
    - If user has no role defined, deny access and display "account not authorized" message
    - _Requirements: 1.4, 1.5, 1.6_

  - [x]* 2.3 Write unit tests for authentication flow
    - Test login success redirect, failure error display, no-role denial, unauthenticated redirect
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6_

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Validation service and alert service
  - [x] 4.1 Implement ValidationService with all range validators
    - Create `/lib/services/validation.ts`
    - Implement `validateMedicineQuantity(value): boolean` — integer in [0, 999999]
    - Implement `validateFootfallCount(value): boolean` — integer in [0, 10000]
    - Implement `validateBedAvailability(available, total): boolean` — integer in [0, totalBeds]
    - Implement `validateDoctorAttendance(present, assigned): boolean` — integer in [0, assignedDoctors]
    - _Requirements: 3.2, 4.4, 5.3, 6.4_

  - [x]* 4.2 Write property tests for ValidationService
    - **Property 2: Medicine quantity range validation**
    - **Property 5: Patient footfall range validation**
    - **Property 9: Bed availability range validation**
    - **Property 11: Doctor attendance range validation**
    - **Validates: Requirements 3.2, 4.4, 5.3, 6.4**

  - [x] 4.3 Implement StockAnalysisService with colour-coding and filtering
    - Create `/lib/services/stock-analysis.ts`
    - Implement `getStockColour(quantity, reorderLevel): 'green' | 'yellow' | 'red'`
    - Implement `filterMedicinesForPrediction(medicines): MedicineStock[]` — selects medicines with quantity < reorderLevel * 0.3
    - Implement `hasInsufficientData(consumptionDays): boolean` — true if fewer than 7 days in last 30
    - _Requirements: 3.5, 7.2, 7.4_

  - [x]* 4.4 Write property tests for StockAnalysisService
    - **Property 3: Stock colour-coding threshold correctness**
    - **Property 13: Stock-out prediction filter**
    - **Property 15: Insufficient consumption data flag**
    - **Validates: Requirements 3.5, 7.2, 7.4**

  - [x] 4.5 Implement AlertService with stock-low, full-capacity, and understaffed alerts
    - Create `/lib/services/alert.ts`
    - Implement `isStockLow(quantity, reorderLevel): boolean` — quantity < reorderLevel
    - Implement `isFullCapacity(availableBeds): boolean` — availableBeds === 0
    - Implement `isUnderstaffed(presentCount, assignedDoctors): boolean` — presentCount < assignedDoctors * 0.5
    - _Requirements: 3.4, 5.4, 5.5, 6.3_

  - [x]* 4.6 Write property tests for AlertService
    - **Property 4: Stock-low alert trigger**
    - **Property 10: Full-capacity alert bidirectional**
    - **Property 12: Understaffed alert threshold**
    - **Validates: Requirements 3.4, 5.4, 5.5, 6.3**

- [x] 5. Data modules — Medicine Stock, Footfall, Beds, Attendance
  - [x] 5.1 Implement Medicine Stock components and data layer
    - Create `/app/(dashboard)/centre/[id]/components/StockTable.tsx` — displays medicine list sorted alphabetically, colour-coded
    - Create `/app/(dashboard)/centre/[id]/components/StockEditForm.tsx` — inline quantity editing with validation
    - Wire RTDB subscription to `/medicines/{centreId}/` for real-time updates
    - On write failure, rollback UI and display error message
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [x]* 5.2 Write property test for medicine alphabetical sort
    - **Property 1: Medicine list alphabetical sort invariant**
    - **Validates: Requirements 3.1**

  - [x] 5.3 Implement Patient Footfall components and data layer
    - Create `/app/(dashboard)/centre/[id]/components/FootfallInputForm.tsx` — date + count input with validation
    - Create `/app/(dashboard)/centre/[id]/components/FootfallChart.tsx` — 7-day bar chart using react-chartjs-2
    - Create `/lib/services/chart-data.ts` — transforms sparse footfall data into 7-entry array with zero-fill
    - Create `/lib/services/aggregation.ts` — aggregates footfall across centres for district total
    - Implement upsert logic: overwrite existing record for same (date, centreId)
    - Display confirmation message within 2 seconds on successful save
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x]* 5.4 Write property tests for footfall data transformations
    - **Property 6: Footfall upsert idempotency**
    - **Property 7: Seven-day footfall zero-fill**
    - **Property 8: Aggregate footfall sum**
    - **Validates: Requirements 4.2, 4.5, 4.6**

  - [x] 5.5 Implement Bed Availability components and data layer
    - Create `/app/(dashboard)/centre/[id]/components/BedAvailabilityPanel.tsx` — total/available beds display and update
    - Validate bed availability within [0, totalBeds] before write
    - Display full-capacity alert on district dashboard when availableBeds === 0
    - Remove alert when availableBeds increases above zero
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 5.6 Implement Doctor Attendance components and data layer
    - Create `/app/(dashboard)/centre/[id]/components/DoctorAttendancePanel.tsx` — present/assigned display and update
    - Validate attendance within [0, assignedDoctors] before write
    - Display understaffed flag on district dashboard when presentCount < 50% of assigned
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. District Dashboard and Centre Detail pages
  - [x] 7.1 Implement District Dashboard page
    - Create `/app/(dashboard)/page.tsx` — render summary cards for each centre in the admin's district
    - Each `CentreCard` shows: colour-coded stock indicator, bed availability, doctor attendance, footfall count
    - Subscribe to RTDB for real-time updates (within 5 seconds)
    - Display `AlertBanner` for stock-low, full-capacity, understaffed, and underperforming alerts
    - Show "no data available" message if district has no centres
    - _Requirements: 2.1, 2.2, 2.5_

  - [x] 7.2 Implement District Map with Google Maps
    - Create `/app/(dashboard)/components/DistrictMap.tsx` — Google Maps integration showing centre markers
    - Load Google Maps API key from environment variables
    - _Requirements: 2.4_

  - [x] 7.3 Implement Centre Detail page
    - Create `/app/(dashboard)/centre/[id]/page.tsx` — compose StockTable, FootfallChart, BedAvailabilityPanel, DoctorAttendancePanel
    - Navigate from dashboard CentreCard click
    - _Requirements: 2.3_

  - [x]* 7.4 Write unit tests for Dashboard and Centre Detail rendering
    - Test centre cards display, empty state message, alert banner rendering
    - _Requirements: 2.1, 2.5, 3.4, 5.4, 6.3_

- [x] 8. AI features — Predictions, Redistribution, Underperformance
  - [x] 8.1 Implement GeminiService client
    - Create `/lib/services/gemini.ts` — initialize `@google/generative-ai` SDK
    - Implement `generateStockPredictions(stockData, language): Promise<StockPrediction[]>` — construct prompt, call Gemini, parse JSON response
    - Implement `generateRedistributionRecommendations(centreData, language): Promise<RedistributionRecommendation[]>`
    - Implement 30-second timeout with abort on exceeded
    - _Requirements: 7.1, 8.1, 10.4_

  - [x] 8.2 Implement Gemini response validator
    - Create `/lib/services/gemini-validator.ts`
    - Validate recommendations array length (1-10), explanation length (≤500 chars)
    - Validate prediction response structure
    - _Requirements: 8.2, 8.3_

  - [x]* 8.3 Write property test for Gemini response validation
    - **Property 16: Gemini response structure validation**
    - **Validates: Requirements 8.2, 8.3**

  - [x] 8.4 Implement AI API routes
    - Create `/app/api/ai/predictions/route.ts` — POST handler fetching stock data from RTDB, calling GeminiService, returning sorted predictions (nearest date first)
    - Create `/app/api/ai/redistribution/route.ts` — POST handler fetching multi-centre data, calling GeminiService, returning recommendations
    - Create `/app/api/ai/evaluate-centres/route.ts` — POST handler evaluating underperformance flags
    - Handle Gemini unavailability: return service unavailable message, retain previous results
    - _Requirements: 7.1, 7.3, 7.5, 8.1, 8.4, 9.1_

  - [x] 8.5 Implement Resource Optimizer data sufficiency check
    - Create `/lib/services/resource-optimizer.ts`
    - Implement `hasMinimumCentresForComparison(centres): boolean` — requires ≥ 2 centres with data
    - Return insufficient data message when check fails
    - _Requirements: 8.5_

  - [x]* 8.6 Write property test for data sufficiency check
    - **Property 17: Redistribution data sufficiency check**
    - **Validates: Requirements 8.5**

  - [x] 8.7 Implement Underperforming Centre evaluation logic
    - Create `/lib/services/evaluation.ts`
    - Implement `evaluateCentre(centre, metrics): { isUnderperforming: boolean, breachedMetrics: string[] }`
    - Flag centre if 2+ of: stock below reorder, attendance < 50%, beds at zero, footfall > max capacity
    - _Requirements: 9.2, 9.3_

  - [x]* 8.8 Write property test for underperforming flag logic
    - **Property 18: Underperforming centre flag logic**
    - **Validates: Requirements 9.2**

  - [x] 8.9 Implement AI Insights UI components
    - Create `/app/(dashboard)/insights/page.tsx` — PredictionsPanel + RedistributionPanel
    - Create `/app/(dashboard)/insights/components/PredictionsPanel.tsx` — ranked list sorted by urgency
    - Create `/app/(dashboard)/insights/components/RedistributionPanel.tsx` — recommendation cards with explanations
    - Create `/app/(dashboard)/insights/components/AILoadingState.tsx` — loading spinner (up to 30s)
    - Create `/app/(dashboard)/insights/components/AIErrorState.tsx` — error message with retry button
    - Display insufficient data messages inline per medicine
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 8.2, 8.3, 8.4, 8.5_

  - [x]* 8.10 Write property tests for prediction sorting
    - **Property 14: Predictions urgency sort**
    - **Validates: Requirements 7.3**

  - [x] 8.11 Integrate underperforming flags into Dashboard
    - Add `UnderperformingIndicator` component to centre cards on district dashboard
    - Display red indicator with breached metric summary
    - Show notification if evaluation is unavailable
    - _Requirements: 9.1, 9.3, 9.4_

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Deployment and final wiring
  - [x] 10.1 Create Dockerfile and Cloud Run configuration
    - Create `Dockerfile` — multi-stage build for Next.js standalone output
    - Configure `PORT` env var usage in Next.js server
    - Create `/app/api/health/route.ts` — GET health check endpoint
    - Ensure container responds to HTTP within 30 seconds of start
    - _Requirements: 11.1, 11.4_

  - [x] 10.2 Create Firebase RTDB security rules file
    - Create `database.rules.json` with role-based read/write rules matching the design
    - District_Admin: read all centres in their district
    - Centre_Staff: write only to their assigned centre
    - _Requirements: 1.4, 3.2, 4.1, 5.2, 6.2_

  - [x] 10.3 Wire language preference persistence and AI language parameter
    - Persist language preference to `/users/{uid}/languagePreference` on selection
    - Pass user language to Gemini API prompts for multilingual output
    - Fall back to English if AI cannot generate in selected language
    - _Requirements: 10.2, 10.4, 10.5_

  - [x]* 10.4 Write integration tests for end-to-end flows
    - Test auth flow → role lookup → dashboard access
    - Test data write → real-time listener → UI update
    - Test AI API route → Gemini call → structured response
    - _Requirements: 1.1, 2.2, 7.1, 8.1_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript throughout (Next.js 15 + App Router)
- All AI features gracefully degrade when Gemini API is unavailable
- Firebase RTDB provides real-time sync; the SDK handles reconnection automatically

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.6"] },
    { "id": 2, "tasks": ["1.4", "2.1"] },
    { "id": 3, "tasks": ["1.5", "2.2"] },
    { "id": 4, "tasks": ["2.3", "4.1"] },
    { "id": 5, "tasks": ["4.2", "4.3", "4.5"] },
    { "id": 6, "tasks": ["4.4", "4.6", "5.1", "5.3", "5.5", "5.6"] },
    { "id": 7, "tasks": ["5.2", "5.4", "7.1", "7.2", "7.3"] },
    { "id": 8, "tasks": ["7.4", "8.1", "8.5", "8.7"] },
    { "id": 9, "tasks": ["8.2", "8.4", "8.6", "8.8", "8.9"] },
    { "id": 10, "tasks": ["8.3", "8.10", "8.11"] },
    { "id": 11, "tasks": ["10.1", "10.2", "10.3"] },
    { "id": 12, "tasks": ["10.4"] }
  ]
}
```
