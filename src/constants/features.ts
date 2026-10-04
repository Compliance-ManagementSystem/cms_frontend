/**
 * Screen parts that are switched off because the Location Master data does not use them.
 * Nothing is deleted: set a flag to true to show that part again.
 * (Hidden sidebar screens are listed in constants/sidebar.ts and routes/AppRoutes.tsx.)
 */
export const FEATURES = {
  // ── On a unit (Locations) ──
  /** Contact person, email and phone */
  locationContact: false,
  /** Floor area, operating hours and parent location */
  locationSiteDetails: false,
  /** Leases & agreements */
  locationAgreements: false,
  /** Licences tab (compliance records carry the licence details instead) */
  locationLicences: false,

  // ── On a record (Compliance Records) ──
  /** Submit / review / approve / reject / correction steps and the approval trail */
  recordApprovalWorkflow: false,
  /** Assignee and due date */
  recordAssignment: false,
  /** "New Record" button, for adding one licence to one unit by hand */
  recordManualCreate: true,
  /** "Auto-Generate for Unit" button, which creates all of a unit's licence records at once */
  recordAutoGenerate: false,
  /** Verify / reject step on uploaded documents */
  documentVerification: false,
} as const;
