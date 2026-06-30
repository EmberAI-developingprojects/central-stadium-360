import { SerialPort } from 'serialport';

/**
 * SerialTransport — the byte-level link to a Verifone ECR terminal over the
 * on-box serial/USB-CDC port (COM3 here). This layer is acquirer-INDEPENDENT:
 * it only does the framing every Verifone ECR variant shares, so the
 * bank-specific message layout lives entirely in ./protocol.ts.
 *
 * Wire format (classic ECR async framing):
 *   ENQ ──►            sender asks to send
 *      ◄── ACK         receiver ready
 *   STX <payload> ETX <LRC> ──►   one framed message
 *      ◄── ACK | NAK    receiver checked the LRC (NAK ⇒ retransmit)
 * The terminal then drives the same handshake the other way to return its
 * response frame. LRC = XOR of every byte after STX through ETX (inclusive).
 *
 * Card data never crosses this link — the kiosk sends an amount, the terminal
 * does tap/insert/PIN itself and returns only an approved/declined result, so
 * the box stays out of PCI scope.
 */

// ASCII control bytes used by the ECR link layer.
export const STX = 0x02;
export const ETX = 0x03;
export const EOT = 0x04;
export const ENQ = 0x05;
export const ACK = 0x06;
export const NAK = 0x15;

/** XOR-LRC over `data` (the bytes between STX and ETX) plus the trailing ETX. */
export function lrc(payload: Buffer): number {
  let acc = 0;
  for (const b of payload) acc ^= b;
  acc ^= ETX; // the ETX is part of the checksum coverage
  return acc & 0xff;
}

/** Wrap a payload as STX <payload> ETX <LRC>. */
export function frame(payload: Buffer): Buffer {
  return Buffer.concat([Buffer.from([STX]), payload, Buffer.from([ETX, lrc(payload)])]);
}

export interface TransportOptions {
  path: string; // e.g. "COM3"
  baudRate: number; // nominal over USB-CDC, honoured on a true RS-232 link
  dataBits?: 7 | 8;
  parity?: 'none' | 'even' | 'odd';
  stopBits?: 1 | 2;
  /** How long to wait for a single ACK/byte before giving up (ms). */
  ackTimeoutMs?: number;
  /** How long to wait for a full response frame, incl. cardholder action (ms). */
  responseTimeoutMs?: number;
  /** Retransmits on NAK / framing error before failing. */
  maxRetries?: number;
}

export class TransportError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = 'TransportError';
  }
}

export class SerialTransport {
  private port?: SerialPort;
  private rxBuf: Buffer = Buffer.alloc(0);
  private readonly waiters: Array<(b: Buffer) => void> = [];

  constructor(private readonly opts: TransportOptions) {}

  private get ackTimeout() {
    return this.opts.ackTimeoutMs ?? 4_000;
  }
  private get responseTimeout() {
    return this.opts.responseTimeoutMs ?? 120_000; // a sale waits on the cardholder
  }
  private get maxRetries() {
    return this.opts.maxRetries ?? 2;
  }

  /** Open the port. Idempotent — a second call on an open port is a no-op. */
  async open(): Promise<void> {
    if (this.port?.isOpen) return;
    this.port = new SerialPort({
      path: this.opts.path,
      baudRate: this.opts.baudRate,
      dataBits: this.opts.dataBits ?? 8,
      parity: this.opts.parity ?? 'none',
      stopBits: this.opts.stopBits ?? 1,
      autoOpen: false,
    });
    this.port.on('data', (chunk: Buffer) => {
      this.rxBuf = Buffer.concat([this.rxBuf, chunk]);
      this.drainWaiters();
    });
    await new Promise<void>((resolve, reject) => {
      this.port!.open((err) => (err ? reject(new TransportError(String(err), 'open_failed')) : resolve()));
    });
  }

  async close(): Promise<void> {
    if (!this.port?.isOpen) return;
    await new Promise<void>((resolve) => this.port!.close(() => resolve()));
    this.port = undefined;
    this.rxBuf = Buffer.alloc(0);
  }

  get isOpen(): boolean {
    return !!this.port?.isOpen;
  }

  // --- low-level rx helpers --------------------------------------------------

  private drainWaiters() {
    while (this.waiters.length && this.rxBuf.length) {
      const w = this.waiters.shift()!;
      const b = this.rxBuf;
      this.rxBuf = Buffer.alloc(0);
      w(b);
    }
  }

  /** Resolve with the next byte(s) received, or reject on timeout. */
  private nextBytes(timeoutMs: number): Promise<Buffer> {
    if (this.rxBuf.length) {
      const b = this.rxBuf;
      this.rxBuf = Buffer.alloc(0);
      return Promise.resolve(b);
    }
    return new Promise<Buffer>((resolve, reject) => {
      const timer = setTimeout(() => {
        const i = this.waiters.indexOf(onData);
        if (i >= 0) this.waiters.splice(i, 1);
        reject(new TransportError(`timeout after ${timeoutMs}ms`, 'timeout'));
      }, timeoutMs);
      const onData = (b: Buffer) => {
        clearTimeout(timer);
        resolve(b);
      };
      this.waiters.push(onData);
    });
  }

  private write(bytes: Buffer): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.port!.write(bytes, (err) => (err ? reject(new TransportError(String(err), 'write_failed')) : resolve()));
    });
  }

  /** Wait for a single control byte equal to one of `expected`. */
  private async expectByte(expected: number[], timeoutMs: number): Promise<number> {
    const b = await this.nextBytes(timeoutMs);
    const got = b[0];
    // Stash anything beyond the first byte for the next read.
    if (b.length > 1) this.rxBuf = Buffer.concat([b.subarray(1), this.rxBuf]);
    if (!expected.includes(got)) {
      throw new TransportError(`unexpected byte 0x${got.toString(16)}`, 'protocol');
    }
    return got;
  }

  // --- public link operations ------------------------------------------------

  /**
   * Liveness handshake: ENQ ⇒ expect ACK. Safe to call against a live terminal —
   * it starts no transaction. Used by the bridge's /pos/probe diagnostic.
   */
  async probe(): Promise<void> {
    await this.open();
    await this.write(Buffer.from([ENQ]));
    await this.expectByte([ACK], this.ackTimeout);
  }

  /**
   * Send one framed request and return the terminal's framed response payload
   * (STX/ETX/LRC stripped). Handles the ENQ/ACK handshake and NAK retransmit.
   */
  async transact(payload: Buffer): Promise<Buffer> {
    await this.open();

    // 1) Bid for the line and send the framed request, retrying on NAK.
    let attempt = 0;
    for (;;) {
      await this.write(Buffer.from([ENQ]));
      await this.expectByte([ACK], this.ackTimeout);
      await this.write(frame(payload));
      const ack = await this.expectByte([ACK, NAK], this.ackTimeout);
      if (ack === ACK) break;
      if (++attempt > this.maxRetries) {
        throw new TransportError('terminal NAKed request past retry limit', 'nak');
      }
    }

    // 2) Receive the response frame (the terminal now drives the link).
    const respPayload = await this.receiveFrame(this.responseTimeout);
    await this.write(Buffer.from([ACK]));
    return respPayload;
  }

  /** Read one STX..ETX LRC frame, verify the LRC, return the inner payload. */
  private async receiveFrame(timeoutMs: number): Promise<Buffer> {
    const deadline = Date.now() + timeoutMs;
    const acc: number[] = [];
    let started = false;

    const remaining = () => Math.max(0, deadline - Date.now());

    for (;;) {
      const chunk = await this.nextBytes(remaining() || 1);
      for (const b of chunk) {
        if (!started) {
          if (b === STX) started = true; // ignore line noise / stray ENQ before STX
          continue;
        }
        acc.push(b);
        // Frame complete once we have ETX followed by its LRC byte.
        const etxIdx = acc.length - 2;
        if (etxIdx >= 0 && acc[etxIdx] === ETX) {
          const payload = Buffer.from(acc.slice(0, etxIdx));
          const got = acc[acc.length - 1];
          if (lrc(payload) !== got) {
            await this.write(Buffer.from([NAK]));
            throw new TransportError('response LRC mismatch', 'lrc');
          }
          return payload;
        }
      }
      if (remaining() === 0) throw new TransportError('incomplete response frame', 'timeout');
    }
  }
}
