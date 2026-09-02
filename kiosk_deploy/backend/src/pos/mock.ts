import type { CancelResult, PaymentTerminal, SaleInput, SaleResult } from './types.js';

/** Results from the mock carry `simulated: true` on top of the shared shapes. */
type MockSaleResult = SaleResult & { simulated: true };
type MockCancelResult = CancelResult & { simulated: true };

/** One row of the fake settlement report, replayed from in-memory sales. */
interface MockSettlementRow {
  rrn: string | undefined;
  orderRef: string;
  amount: number;
  authCode: string | undefined;
  cardMasked: string | undefined;
  settledAt: string;
}

/**
 * MockTerminal — always approves, no hardware. Lets the kiosk run end-to-end
 * (ticket + И-Баримт + email) on a dev box with no acquirer connected. Every
 * result carries `simulated: true` so nothing downstream mistakes it for a real
 * charge. This is the default driver until the Golomt terminal is provisioned.
 */
export class MockTerminal implements PaymentTerminal {
  name = 'mock';

  /** In-memory record of approved sales, so settlement can replay them. */
  sales = new Map<string, MockSaleResult>();

  async startSale(input: SaleInput): Promise<MockSaleResult> {
    const result: MockSaleResult = {
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

  async cancel(orderRef: string): Promise<MockCancelResult> {
    this.sales.delete(orderRef);
    return {
      status: 'cancelled',
      orderRef,
      amount: 0,
      simulated: true,
    };
  }

  async lastSettlement(): Promise<MockSettlementRow[]> {
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
