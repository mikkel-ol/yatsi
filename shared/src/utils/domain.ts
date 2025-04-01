import { parse as tldtsParse } from "tldts";

export type ParseResult = {
  subdomain: string | undefined;
  domain: string | null;
};

export function parse(url: string, serverDomain: string): ParseResult {
  const { domain, hostname } = tldtsParse(url);
  const subdomain = hostname?.includes(serverDomain) ? hostname.replace(serverDomain, "").replace(".", "") : undefined;

  return { subdomain, domain };
}
