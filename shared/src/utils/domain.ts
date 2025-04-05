import { parse as tldtsParse } from "tldts";

export type ParseResult = {
  subdomain: string | undefined;
  domain: string | null;
};

export function parse(url: string, serverDomain: string): ParseResult {
  const strippedServerDomain = serverDomain.split(":")[0]!; // Remove port if present
  const { domain, hostname } = tldtsParse(url);
  const subdomain = hostname?.includes(strippedServerDomain)
    ? hostname.replace(strippedServerDomain, "").replace(".", "")
    : undefined;

  return { subdomain, domain };
}
