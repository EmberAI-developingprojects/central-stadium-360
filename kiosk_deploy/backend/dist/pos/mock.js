/**
 * MockTerminal — always approves, no hardware. Lets the kiosk run end-to-end
 * (ticket + И-Баримт + email) on a dev box with no acquirer connected. Every
 * result carries `simulated: true` so nothing downstream mistakes it for a real
 * charge. This is the default driver until the Golomt terminal is provisioned.
 */
export class MockTerminal {
    name = 'mock';
    /** In-memory record of approved sales, so settlement can replay them. */
    sales = new Map();
    async startSale(input) {
        const result = {
            status: 'approved',
            orderRef: input.orderRef,
            amount: input.amount,
            authCode: `MOCK${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}`,
            rrn: `MOCK-${input.orderRef}`,
            cardMasked: '****0000',
            terminalId: 'MOCK-TID',
            simulated: true,
        };
        this.sales.set(input.orderRef, result);
        return result;
    }
    async cancel(orderRef) {
        this.sales.delete(orderRef);
        return {
            status: 'cancelled',
            orderRef,
            amount: 0,
            simulated: true,
        };
    }
    async lastSettlement() {
        return [...this.sales.values()]
            .filter((s) => s.status === 'approved')
            .map((s) => ({
            rrn: s.rrn,
            orderRef: s.orderRef,
            amount: s.amount,
            authCode: s.authCode,
            cardMasked: s.cardMasked,
            settledAt: new Date().toISOString(),
        }));
    }
}
//# sourceMappingURL=mock.js.map