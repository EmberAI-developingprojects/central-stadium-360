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
  /** On-box card POS terminal service/SDK base URL. */
  posServiceUrl: process.env.POS_SERVICE_URL ?? 'http://localhost:7081',
  /** Which PaymentTerminal driver to use: 'mock' (default, no hardware),
   *  'verifone' (Verifone ECR terminal over serial/USB — see posSerial*), or
   *  'golomt' (Golomt IPPOS via the on-box GLMTPOS REST service — see golomt*). */
  posDriver: process.env.POS_DRIVER ?? 'mock',

  // --- Golomt IPPOS (GLMTPOS REST service, PobRestService.exe) ---
  /** Base URL of the on-box GLMTPOS WCF/REST service. The single operation is
   *  GET {golomtPosUrl}/message?data=<url-encoded, RSA-OAEP+base64 Request XML>.
   *  Default matches PobRestService.exe.config's baseAddress. */
  golomtPosUrl: process.env.GOLOMT_POS_URL ?? 'http://localhost:8500/requestToPos',
  /** Golomt-assigned terminal id (TID) provisioned for this kiosk, e.g. 13133707. */
  golomtTerminalId: process.env.GOLOMT_TERMINAL_ID ?? '',
  /** ISO-4217 numeric currency; 496 = MNT. */
  golomtCurrencyCode: process.env.GOLOMT_CURRENCY_CODE ?? '496',
  /** COM port + line speed the DualConnector uses to reach the terminal. Usually
   *  owned by the service's own DualConnector.xml; sent only if set here. */
  golomtPortNo: process.env.GOLOMT_POS_PORT ?? '',
  golomtBandwidth: process.env.GOLOMT_POS_BAUD ?? '115200',
  /** Terminal-side transaction timeout in ms (cardholder tap/PIN), sent to the
   *  service as Request.timeout. DualConnector default is 540000. */
  golomtTerminalTimeoutMs: Number(process.env.GOLOMT_POS_TIMEOUT_MS ?? 540000),
  /** HTTP client timeout for the REST call; must exceed golomtTerminalTimeoutMs. */
  golomtHttpTimeoutMs: Number(process.env.GOLOMT_POS_HTTP_TIMEOUT_MS ?? 560000),
  /** DualConnector command modes + card-entry mode. Pos() dereferences these
   *  (request.cMode.Equals("") …), so they MUST be present/non-null — but EMPTY
   *  string is the correct value: it makes the terminal apply its default mode and
   *  wait for a card (verified live — "0" makes the terminal cancel immediately,
   *  and empty cardEntryMode accepts all methods incl. contactless). Override only
   *  per Golomt's ECR field spec. */
  golomtCmode: process.env.GOLOMT_CMODE ?? '',
  golomtCmode2: process.env.GOLOMT_CMODE2 ?? '',
  golomtCardEntryMode: process.env.GOLOMT_CARD_ENTRY_MODE ?? '',
  /** Serial/USB port the Verifone ECR terminal is wired to (Windows: COMn). */
  posSerialPort: process.env.POS_SERIAL_PORT ?? 'COM3',
  /** Line speed. Nominal over USB-CDC; honoured on a true RS-232 link. */
  posSerialBaud: Number(process.env.POS_SERIAL_BAUD ?? 9600),
  /** Timeout for a single ACK/control byte from the terminal (ms). */
  posAckTimeoutMs: Number(process.env.POS_ACK_TIMEOUT_MS ?? 4000),
  /** Timeout for a full sale response — includes cardholder tap/PIN (ms). */
  posResponseTimeoutMs: Number(process.env.POS_RESPONSE_TIMEOUT_MS ?? 120000),

  /** Resend API key for emailing the digital ticket + И-Баримт. Empty → the
   *  email route runs in simulate mode (no mail sent), so dev works keyless. */
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  /** Verified "from" address shown on the ticket email. */
  emailFrom: process.env.EMAIL_FROM ?? 'Tsengeldekh Stadium <tickets@stadium.mn>',
  /** Optional Reply-To (e.g. a support inbox). Empty → omitted. */
  emailReplyTo: process.env.EMAIL_REPLY_TO ?? '',
} as const;
