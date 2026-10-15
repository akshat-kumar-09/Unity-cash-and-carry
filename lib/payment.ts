// How an order with a balance gets paid:
// - delivery: bank transfer, before dispatch
// - click & collect: cash or card at the depot counter, when collecting
// Orders fully covered by wallet credits are recorded as "wallet" by the server. Older
// orders may hold "card" from when online card payment was offered.
export const PAYMENT_METHODS = ["bank_transfer", "cash", "card"] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const COUNTER_PAYMENT_METHODS = ["cash", "card"] as const
export type CounterPaymentMethod = (typeof COUNTER_PAYMENT_METHODS)[number]

export const PAYMENT_STATUSES = ["unpaid", "paid"] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

/** No 0/O or 1/I — people retype these into banking apps and read them out at the
 *  counter. 32 characters, so a random byte maps without bias. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

function randomCode(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("")
}

/** e.g. UCC7K4M2QXP — 11 characters, inside the 18 a UK bank transfer reference allows
 *  (order numbers are 24, so they can't be used as the reference). */
export function generatePaymentReference(): string {
  return "UCC" + randomCode(8)
}

/** e.g. K7M2QX — shown big on the collection pass and carried by its QR code. */
export function generateCollectionCode(): string {
  return randomCode(6)
}

/** The payment method an order is expected to use, from its fulfilment method. */
export function defaultPaymentMethod(fulfillmentMethod: string): PaymentMethod {
  return fulfillmentMethod === "click_and_collect" ? "cash" : "bank_transfer"
}

/** Whether a payment method is allowed for a fulfilment method. */
export function isPaymentMethodAllowed(method: string, fulfillmentMethod: string): boolean {
  return fulfillmentMethod === "click_and_collect"
    ? (COUNTER_PAYMENT_METHODS as readonly string[]).includes(method)
    : method === "bank_transfer"
}

/** How an unpaid order still gets settled: click & collect at the counter, delivery by
 *  bank transfer (including delivery orders left unpaid from the card era). */
export function payableMethod(order: { fulfillmentMethod: string }): "bank_transfer" | "counter" {
  return order.fulfillmentMethod === "click_and_collect" ? "counter" : "bank_transfer"
}

export function paymentMethodLabel(method: string | null): string {
  switch (method) {
    case "bank_transfer":
      return "Bank transfer"
    case "cash":
      return "Cash"
    case "card":
      return "Card"
    case "wallet":
      return "Wallet credits"
    default:
      return "Not recorded"
  }
}
