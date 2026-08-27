// Bridge configuration, read from the environment (see .env.example).
export const config = {
    port: Number(process.env.PORT ?? 7070),
    /** Kiosk web UI origin allowed to call the bridge (CORS). */
    kioskOrigin: process.env.KIOSK_ORIGIN ?? 'http://localhost:7070',
    /** On-box E-Barimt POSAPI 3.0 base URL. */
    ebarimtPosApiUrl: process.env.EBARIMT_POSAPI_URL ?? 'http://localhost:7080',
    /** E-Barimt location/branch identity for issued receipts. districtCode is the
     *  tax district code (сум/дүүрэг); branchNo must be numeric. merchantTin/posNo
     *  are auto-read from POSAPI /rest/info when left blank. */
    ebarimtDistrictCode: process.env.EBARIMT_DISTRICT_CODE ?? '3420',
    ebarimtBranchNo: process.env.EBARIMT_BRANCH_NO ?? '1',
    /** Goods/services classification code (ТАВ ангилал) applied to each line when
     *  an item doesn't carry its own. Default: admission/entertainment. */
    ebarimtClassificationCode: process.env.EBARIMT_CLASSIFICATION_CODE ?? '9329900',
    /** Whether sold items are VAT-able (10% inclusive). Stadium tickets: yes. */
    ebarimtVatable: (process.env.EBARIMT_VATABLE ?? 'true') !== 'false',
    /** Windows printer name for the on-box POS80 thermal printer. */
    printerName: process.env.PRINTER_NAME ?? 'POS80',
    /** Printable width of the thermal paper in mm (80mm roll ≈ 72mm printable). */
    printWidthMm: Number(process.env.PRINT_WIDTH_MM ?? 72),
    /** On-box card POS terminal service/SDK base URL. Golomt default: 8500. */
    posServiceUrl: process.env.POS_SERVICE_URL ?? 'http://localhost:8500/requestToPos/',
    /** Which PaymentTerminal driver to use: 'mock' (default, no hardware) or
     *  'golomt' (Golomt Integrated POS — once provisioned & spec'd). */
    posDriver: process.env.POS_DRIVER ?? 'mock',
    /** When on, the Golomt driver logs every request/response envelope to the
     *  bridge console. Helps diagnose codes/keys on first field deployment.
     *  Turn off in normal operation to keep the log clean. */
    posDebug: (process.env.POS_DEBUG ?? '').toLowerCase() === 'on'
        || process.env.POS_DEBUG === '1',
    /** Resend API key for emailing the digital ticket + И-Баримт. Empty → the
     *  email route runs in simulate mode (no mail sent), so dev works keyless. */
    resendApiKey: process.env.RESEND_API_KEY ?? '',
    /** Verified "from" address shown on the ticket email. */
    emailFrom: process.env.EMAIL_FROM ?? 'Tsengeldekh Stadium <tickets@stadium.mn>',
    /** Optional Reply-To (e.g. a support inbox). Empty → omitted. */
    emailReplyTo: process.env.EMAIL_REPLY_TO ?? '',
};
//# sourceMappingURL=config.js.map