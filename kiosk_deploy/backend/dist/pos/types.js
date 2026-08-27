/**
 * PaymentTerminal — the one interface the bridge talks to for card payments.
 *
 * The kiosk never touches card data: it asks a terminal to take a payment and
 * gets back an approved/declined result. Every acquirer (Golomt, a mock, a
 * future bank) implements this same shape, so the route + ticket/И-Баримт flow
 * never change when we swap drivers.
 *
 * Two integration models exist behind this interface, and we don't yet know
 * which one Golomt's Integrated POS uses (see ../pos/golomt.ts):
 *   - ECR: a standalone certified terminal we drive over serial/USB/TCP.
 *           We send "charge ₮X", it does tap/PIN, returns the result.
 *   - SDK/local-API: an HTTP/SDK service running on the box.
 * Both collapse to startSale()/cancel()/lastSettlement() below.
 */
export {};
//# sourceMappingURL=types.js.map