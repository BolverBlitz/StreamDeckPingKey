declare module "net-ping" {
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