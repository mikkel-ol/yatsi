export interface TunnelReadyMessage {
  type: "tunnel-ready";
  timestamp: number;
  url: string;
}
