import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { tunnel } from "./tunnel.js";
import { DEFAULT_DOMAIN } from "@mikkel-ol/shared";

yargs(hideBin(process.argv))
  .command(
    "$0 [port]",
    "Start a tunnel to a local port",
    (yargs) =>
      yargs
        .positional("port", {
          type: "number",
          describe: "Local port to expose",
          demandOption: true,
        })
        .option("subdomain", {
          type: "string",
          describe: "Desired subdomain for the tunnel",
        })
        .option("domain", {
          type: "string",
          describe: "Domain server to use for the tunnel",
          default: DEFAULT_DOMAIN,
        })
        .option("token", {
          type: "string",
          describe: "API key for the tunnel server",
          demandOption: true,
          alias: "apiKey",
        }),
    async ({ domain, subdomain, token, port }) => {
      const { url } = await tunnel.start({ domain, subdomain, token, port });
      console.log(`Tunnel ready at: ${url}`);
    },
  )
  .help()
  .strict()
  .parse();
