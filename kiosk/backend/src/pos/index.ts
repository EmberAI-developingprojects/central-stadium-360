import { config } from '../config.js';
import type { PaymentTerminal } from './types.js';
import { MockTerminal } from './mock.js';
import { GolomtTerminal } from './golomt.js';
import { VerifoneTerminal } from './verifone.js';

export type { PaymentTerminal, SaleResult, SaleStatus, SettlementRow } from './types.js';

/**
 * Pick the card-payment driver from config.posDriver (env POS_DRIVER).
 * Defaults to the mock so a dev box runs with no terminal attached; set
 * POS_DRIVER=verifone on the kiosk box where the Verifone ECR terminal is wired
 * to the serial/USB port (config.posSerialPort, e.g. COM3).
 */
export function makeTerminal(): PaymentTerminal {
  switch (config.posDriver) {
    case 'verifone':
      return new VerifoneTerminal();
    case 'golomt':
      return new GolomtTerminal();
    case 'mock':
      return new MockTerminal();
    default:
      throw new Error(`unknown POS_DRIVER: ${config.posDriver} (expected "mock" | "verifone" | "golomt")`);
  }
}

/** Process-wide terminal singleton. */
export const terminal = makeTerminal();
