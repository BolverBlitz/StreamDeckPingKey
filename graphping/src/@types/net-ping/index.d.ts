declare module "net-ping" {
  class DestinationUnreachableError extends Error {
    name: "DestinationUnreachableError";
  }
  class PacketTooBigError extends Error {
    name: "PacketTooBigError";
  }
  class ParameterProblemError extends Error {
    name: "ParameterProblemError";
  }
  class RedirectReceivedError extends Error {
    name: "RedirectReceivedError";
  }
  class SourceQuenchError extends Error {
    name: "SourceQuenchError";
  }
  class TimeExceededError extends Error {
    name: "TimeExceededError";
  }
  class RequestTimedOutError extends Error {
    name: "RequestTimedOutError";
  }
  export interface SessionOptions {
    networkProtocol?: number;
    packetSize?: number;
    retries?: number;
    sessionId?: number;
    timeout?: number;
    ttl?: number;
  }

  export class Session {
    constructor(options?: SessionOptions);
    pingHost(
      target: string,
      callback: (
        error: Error | null,
        target: string,
        sent?: number,
        rcvd?: number // Now explicitly optional
      ) => void
    ): void;
    close(): void;
    on(event: "error", listener: (error: Error) => void): this;
  }

  export function createSession(options?: SessionOptions): Session;

  export const NetworkProtocol: {
    IPv4: number;
    IPv6: number;
  };
}
