import type { Slug } from "@mikkel-ol/shared";
import type { ClientInfo } from "../types/client-info.js";

// ? Should we persist this, clean it up, etc?
/**
 * Map of all connected clients to a slug.
 */
export const CLIENTS = new Map<Slug, ClientInfo[]>();
