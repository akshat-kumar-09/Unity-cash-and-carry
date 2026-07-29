// Real business facts from the actual Unity Cash & Carry invoice template
// (features/Unity Cash & Carry — Invoice.pdf) — confirmed 2026-07-22. If Unity's
// registered details ever change, update here (a future pass should make these
// admin-editable via SystemSetting, per the "admin owns drifting business facts"
// principle — not built yet since these haven't needed changing). Shared by every
// screen that shows these facts (Retail Assist, admin inspector report, invoices)
// so there is exactly one place that can drift out of date.
export const UNITY_BUSINESS = {
  legalName: "Unity Cash and Carry Limited",
  addressLines: ["Unit 7 & 8, 85-87 Vermont Street", "Excelsior Industrial Estate", "Glasgow, UK, G41 1LU"],
  phone: "0141 737 1500",
  vatNumber: "GB 363 178 585",
  bank: {
    accountName: "Unity Cash & Carry Ltd",
    sortCode: "53-81-36",
    accountNumber: "93310129",
  },
}

/** Verbatim from the real paper invoice template (features/Unity Cash & Carry —
 *  Invoice.pdf) — these are real, enforceable terms, not filler copy. */
export const INVOICE_TERMS =
  "The title of each item or goods covered by this invoice is not legally transferred until complete payment has been made to Company, and if they are sold before they have been paid for, we have the right to proceeds of the sale. Overdue accounts are subject to interest of 3% per month. All goods are sold on no return basis. Shortage/Damage to be notified within 3 working days of goods receipt. Goods are supplied to our terms and conditions of the sale, available on request."

export const VPD_EFFECTIVE_DATE = new Date("2026-10-01T00:00:00Z")
export const SIGNAGE_DEADLINE = new Date("2027-01-01T00:00:00Z")
export const VDS_GRACE_END = new Date("2027-03-31T00:00:00Z")
