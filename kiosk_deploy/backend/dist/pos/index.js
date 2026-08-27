import { config } from '../config.js';
import { MockTerminal } from './mock.js';
import { GolomtTerminal } from './golomt.js';
/**
 * Pick the card-payment driver from config.posDriver (env POS_DRIVER).
 * Defaults to the mock so a dev box runs with no terminal attached; set
 * POS_DRIVER=golomt on the kiosk once the Golomt terminal is provisioned.
 */
export function makeTerminal() {
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
export const terminal = makeTerminal();
//# sourceMappingURL=index.js.map