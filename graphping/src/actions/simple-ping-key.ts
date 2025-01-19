import * as netPing from "net-ping";
import { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";

@action({ UUID: "com.bolverblitz.graphping.simpleping" })
export class SimplePing extends SingletonAction<SinglePingSettings> {
  override onWillAppear(ev: WillAppearEvent<SinglePingSettings>): Promise<void> {
    const { ipAddress } = ev.payload.settings;
    if (ipAddress) {
      return ev.action.setTitle(`Ping\n${ipAddress}`);
    } else {
      return ev.action.setTitle("Set IP");
    }
  }

  override async onKeyDown(ev: KeyDownEvent<SinglePingSettings>): Promise<void> {
    const { ipAddress, pingCount = 5, timeout = 500, pingInterval = 25 } = ev.payload.settings;

    if (!ipAddress) {
      console.error("IP Address not set in action settings.");
      await ev.action.showAlert();
      return;
    }

    await ev.action.setTitle(`Pinging...`);

    const session = netPing.createSession({
      packetSize: 16,
      retries: 1,
      timeout: timeout,
    });

    let successfulPings = 0;
    let totalPingTime = 0;
    let packetLoss = 0;

    session.on("error", (error) => {
      console.trace(error.toString());
      ev.action.showAlert();
    });

    const pingPromises = [];
    for (let i = 0; i < pingCount; i++) {
      pingPromises.push(
        new Promise<number>((resolve) => {
          setTimeout(() => {
            session.pingHost(ipAddress, (error, target, sent, rcvd) => {
              if (error) {
                packetLoss++;
                if (error.name === "RequestTimedOutError") resolve(-1);
                else if (error.name === "DestinationUnreachableError") resolve(-2);
                else resolve(-3);
              } else if (rcvd) {
                const ms = rcvd - (sent ?? 0);
                successfulPings++;
                totalPingTime += ms;
                resolve(ms);
              } else {
                resolve(-1);
              }
            });
          }, i * pingInterval);
        })
      );
    }

    const updadteDuringTest = setInterval(async () => {
      await ev.action.setTitle(`Pinging...\n${successfulPings}/${pingCount}`);
    }, 500);

    Promise.all(pingPromises).then(async () => {
      clearInterval(updadteDuringTest); // Stop updating the title

      const averagePing = successfulPings > 0 ? totalPingTime / successfulPings : 0;
      const lossPercentage = (packetLoss / pingCount) * 100;
    
      await ev.action.setTitle(`Ping avg:\n${averagePing.toFixed(2)}ms\nLoss:\n${lossPercentage.toFixed(2)}%`);
      setTimeout(() => {
        ev.action.setTitle(`Ping\n${ipAddress}`);
      }, 5000);
    });

    session.close();
  }
}

type SinglePingSettings = {
  ipAddress?: string;
  pingCount?: number;
  timeout?: number;
  pingInterval?: number;
};
