import type { IncomingHttpHeaders } from "http";

export interface HttpResponseMessage {
  type: "http-response";
  timestamp: number;
  requestId: string;
  status: number | undefined;
  headers: IncomingHttpHeaders;
  body: any;
}
