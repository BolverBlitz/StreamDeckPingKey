import * as netPing from "net-ping";
import { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { createCanvas, Canvas, CanvasRenderingContext2D } from "canvas";

@action({ UUID: "com.bolverblitz.graphping.graphping" })
export class GraphPing extends SingletonAction<GraphPingSettings> {
  private pingTimes: number[] = [];
  private maxPingTime: number = 0;
  private max_ping: number = 0;
  private isPinging: boolean = false;
  private pingIntervalId: NodeJS.Timeout | null = null; // Store the interval ID
  private readonly maxPingTimeDecreaseRate = 0.85; // 15% reduction per iteration
  private readonly maxPingTimeLowerBound = 50; // Minimum value for maxPingTime
  private session: netPing.Session | null = null;

  override onWillAppear(ev: WillAppearEvent<GraphPingSettings>): Promise<void> {
    const { ipAddress } = ev.payload.settings;
    if (ipAddress) {
      return ev.action.setTitle(`Ping\n${ipAddress}`);
    } else {
      return ev.action.setTitle("Set IP");
    }
  }

  override async onKeyDown(ev: KeyDownEvent<GraphPingSettings>): Promise<void> {
    const { ipAddress, timeout = 500, pingInterval = 25, chartColor = "#ff0000" } = ev.payload.settings;

    setTimeout(async () => {
        if(this.isPinging) return; // If not pinging, don't do anything
        const canvas: Canvas = createCanvas(72, 72);
        const ctx: CanvasRenderingContext2D = canvas.getContext("2d");
  
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
  
        const base64Image = canvas.toDataURL("image/png");
        await ev.action.setImage(base64Image);
        return ev.action.setTitle(`Ping\n${ipAddress}`);
    }, 100);

    if (!ipAddress) {
      console.error("IP Address not set in action settings.");
      await ev.action.showAlert();
      return;
    }

    if (this.isPinging) {
      // STOP PINGING
      this.isPinging = false;
      if (this.pingIntervalId) {
        clearInterval(this.pingIntervalId); // Clear the interval
        this.pingIntervalId = null;
      }

      const canvas: Canvas = createCanvas(72, 72);
      const ctx: CanvasRenderingContext2D = canvas.getContext("2d");

      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const base64Image = canvas.toDataURL("image/png");
      await ev.action.setImage(base64Image);
      return ev.action.setTitle(`Ping\n${ipAddress}`);
    }

    // START PINGING
    await ev.action.setTitle(``);

    this.isPinging = true;
    this.pingTimes = [];
    this.max_ping = 0;
    this.maxPingTime = 0;

    const session = netPing.createSession({
      packetSize: 16,
      retries: 1,
      timeout: timeout,
    });

    session.on("error", (error) => {
      console.trace(error); // Log errors for debugging
      // Don't close session here
    });

    const doPing = () => {
      if (!this.isPinging) {
        // Stop further pings if isPinging is false
        if (this.pingIntervalId) {
          clearInterval(this.pingIntervalId);
          this.pingIntervalId = null;
        }
        this.session?.close();
        this.session = null;
        const canvas: Canvas = createCanvas(72, 72);
        const ctx: CanvasRenderingContext2D = canvas.getContext("2d");

        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const base64Image = canvas.toDataURL("image/png");
        ev.action.setImage(base64Image);
        return ev.action.setTitle(`Ping\n${ipAddress}`);
      }

      this.session?.pingHost(ipAddress, (error, target, sent, rcvd) => {
        let pingResult: number;
        if (error) {
          switch (true) {
            case error instanceof netPing.RequestTimedOutError:
              pingResult = -1; // Timeout
              break;
            case error instanceof netPing.DestinationUnreachableError:
              pingResult = -2; // Destination unreachable
              break;
            default:
              pingResult = -3; // Other error
              console.error("Unhandled ping error:", error);

              // Dispose of the old session and create a new one
              if (this.pingIntervalId) {
                clearInterval(this.pingIntervalId);
                this.pingIntervalId = null;
              }
              this.session?.close();
              this.session = this.createSession(timeout);

              // Restart the interval with the new session
              this.pingIntervalId = setInterval(doPing, pingInterval);
              return; // Important: Stop processing this ping result
          }
        } else if (rcvd) {
          const ms = rcvd - (sent ?? 0);
          if (ms > this.maxPingTime) {
            this.maxPingTime = ms;
          } else {
            this.maxPingTime = Math.max(this.maxPingTimeLowerBound, this.maxPingTime * this.maxPingTimeDecreaseRate);
          }

          pingResult = ms;
        } else {
          pingResult = -1;
        }

        this.max_ping = this.max_ping < pingResult ? (this.max_ping = pingResult) : this.max_ping;

        this.pingTimes.push(pingResult);

        if (this.pingTimes.length > 50) {
          this.pingTimes.shift();
        }

        this.drawChart(ev, chartColor);
      });
    };

    // Clear any previous interval
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }

    // Create and store the session
    this.session = this.createSession(timeout);

    // Start the pinging interval
    this.pingIntervalId = setInterval(doPing, pingInterval);
  }

  private createSession(timeout: number = 500): netPing.Session {
    const session = netPing.createSession({
      packetSize: 16,
      retries: 1,
      timeout: timeout,
    });

    session.on("error", (error) => {
      console.trace(error); // Log errors
    });

    return session;
  }

  async drawChart(ev: KeyDownEvent<GraphPingSettings>, chartColor: string) {
    const canvas: Canvas = createCanvas(72, 72);
    const ctx: CanvasRenderingContext2D = canvas.getContext("2d");

    await ev.action.setTitle(`${this.pingTimes[this.pingTimes.length - 1]}\nMax:${this.max_ping}\n\n\n`);

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const chartWidth = canvas.width;
    const chartHeight = canvas.height;
    const barWidth = chartWidth / 50;

    for (let i = 0; i < this.pingTimes.length; i++) {
      const pingTime = this.pingTimes[i];
      let barHeight: number;
      let y: number;

      if (pingTime === -1 || pingTime === -2 || pingTime === -3) {
        // Timeout or error, draw red bar to the top
        barHeight = chartHeight;
        y = 0;
        ctx.fillStyle = "red";
      } else {
        barHeight = ((pingTime + 1) / (this.maxPingTime > 0 ? this.maxPingTime : 1)) * chartHeight;
        y = chartHeight - barHeight;
        ctx.fillStyle = chartColor;
      }

      const x = i * barWidth;
      ctx.fillRect(x, y, barWidth, barHeight); // -1 to add a small gap between bars
    }

    const base64Image = canvas.toDataURL("image/png");
    await ev.action.setImage(base64Image);
  }
}

type GraphPingSettings = {
  ipAddress?: string;
  timeout?: number;
  pingInterval?: number;
  chartColor?: string;
};
