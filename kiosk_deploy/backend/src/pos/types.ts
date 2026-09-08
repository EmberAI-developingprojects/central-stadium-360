export interface SaleInput {
  /** Our order reference — becomes the terminal requestID for reconciliation. */
  orderRef: string;
  /** Amount in whole tögrög (the driver converts to minor units itself). */
  amount: number;
  description?: string;
}

export interface SaleResult {
  status: "approved" | "declined";
  orderRef: string;
  amount: number;
  authCode?: string;
  rrn?: string;
  cardMasked?: string;
  terminalId?: string;
  merchantId?: string;
  receipt?: string;
  errorText?: string;
  raw?: unknown;
}

export interface CancelResult {
  status: "cancelled" | "error";
  orderRef: string;
  amount: number;
  authCode?: string;
  rrn?: string;
  errorText?: string;
  raw?: unknown;
}

export interface PaymentTerminal {
  name: string;
  startSale(input: SaleInput): Promise<SaleResult>;
  cancel(orderRef: string): Promise<CancelResult>;
  lastSettlement(date?: string): Promise<unknown[]>;
}
