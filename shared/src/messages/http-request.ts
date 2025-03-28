import type { IncomingHttpHeaders } from "http";

export interface HttpRequestMessage {
  type: "http-request";
  timestamp: number;
  url: string;
  requestId: string;
  method: string;
  headers: IncomingHttpHeaders;
  body: any;
}
