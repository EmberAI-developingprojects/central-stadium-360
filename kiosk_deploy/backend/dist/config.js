// Central place to read the bridge's env config (loaded by dotenv in server).
export const config = {
    // Port 1017 on purpose: Windows' WinNAT/Hyper-V dynamic port reservations
    // never touch ports below 1025, so the bridge survives reboots (7070 kept
    // getting captured after restarts and died with "listen EACCES").
    // `||` not `??`: an empty PORT= line must fall back too, not become 0.
    port: Number(process.env.PORT || 1017),
    kioskOrigin: process.env.KIOSK_ORIGIN ?? 'http://localhost:1017',
    ebarimtPosApiUrl: process.env.EBARIMT_POSAPI_URL ?? 'http://localhost:7080',
    ebarimtDistrictCode: process.env.EBARIMT_DISTRICT_CODE ?? '3420',
    ebarimtBranchNo: process.env.EBARIMT_BRANCH_NO ?? '1',
    ebarimtClassificationCode: process.env.EBARIMT_CLASSIFICATION_CODE ?? '9329900',
    ebarimtVatable: (process.env.EBARIMT_VATABLE ?? 'true') !== 'false',
    printerName: process.env.PRINTER_NAME ?? 'POS80',
    printWidthMm: Number(process.env.PRINT_WIDTH_MM ?? 72),
    posServiceUrl: process.env.POS_SERVICE_URL ?? 'http://localhost:8500/requestToPos/',
    posDriver: process.env.POS_DRIVER ?? 'mock',
    posDebug: (process.env.POS_DEBUG ?? '').toLowerCase() === 'on'
        || process.env.POS_DEBUG === '1',
    resendApiKey: process.env.RESEND_API_KEY ?? '',
    emailFrom: process.env.EMAIL_FROM ?? 'Tsengeldekh Stadium <tickets@stadium.mn>',
    emailReplyTo: process.env.EMAIL_REPLY_TO ?? '',
    cloudApiBase: (process.env.KIOSK_API_BASE ?? '').replace(/\/$/, ''),
    cloudKioskKey: process.env.KIOSK_KEY ?? '',
    cloudKioskId: process.env.KIOSK_ID ?? 'gate-1',
    venueName: process.env.VENUE_NAME ?? 'Үндэсний Төв Цэнгэлдэх',
    printPollMs: Math.max(500, Number(process.env.PRINT_POLL_MS ?? 1000) || 1000),
    ebarimtMerchantName: process.env.EBARIMT_MERCHANT_NAME ?? '',
    ebarimtMerchantTin: process.env.EBARIMT_MERCHANT_TIN ?? '',
    ebarimtPosNo: process.env.EBARIMT_POS_NO ?? '',
};
//# sourceMappingURL=config.js.map