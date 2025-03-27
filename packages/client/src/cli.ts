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
        }),
    async ({ port }) => {
      const { url } = await tunnel.start({ port });
      console.log(`Tunnel ready at: ${url}`);
    },
  )
  .help()
  .strict()
  .parse();
