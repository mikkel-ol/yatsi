export const TUNNEL_ENDPOINT = "/request";
export const DEFAULT_DOMAIN = "tunnel.mikkel.software";

export interface TunnelRequest {
  port: number;
  type: "host" | "mf";
}

export interface TunnelResponse {
  slug: string;
  url: string;
}
