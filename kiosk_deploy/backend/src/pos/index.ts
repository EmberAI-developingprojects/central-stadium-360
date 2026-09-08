import { config } from '../config.js';
import { MockTerminal } from './mock.js';
import { GolomtTerminal } from './golomt.js';
import type { PaymentTerminal } from './types.js';

export function makeTerminal(): PaymentTerminal {
    switch (config.posDriver) {
        case 'golomt':
            return new GolomtTerminal();
        case 'mock':
            return new MockTerminal();
        default:
            throw new Error(`unknown POS_DRIVER: ${config.posDriver} (expected "mock" | "golomt")`);
    }
}
/** Process-wide terminal singleton. */
export const terminal: PaymentTerminal = makeTerminal();
