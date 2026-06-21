import type { IncomingHttpHeaders } from "http";

export interface HttpResponseStartMessage {
  type: "http-response-start";
  timestamp: number;
  requestId: string;
  status: number | undefined;
  headers: IncomingHttpHeaders;
}

export interface HttpResponseChunkMessage {
  type: "http-response-chunk";
  timestamp: number;
  requestId: string;
  body: string;
}

export interface HttpResponseEndMessage {
  type: "http-response-end";
  timestamp: number;
  requestId: string;
}

export interface HttpResponseErrorMessage {
  type: "http-response-error";
  timestamp: number;
  requestId: string;
  message: string;
}
