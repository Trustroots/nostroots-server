import { nostrTools } from "../deps.ts";
type Kind = nostrTools.Kind;

export const PRIVATE_KEY_STORAGE_KEY = "__nostrPrivateKey" as const;
export const RELAYS_STORAGE_KEY = "__nostrRelays" as const;
export const PLUS_CODE_TAG_KEY = "l" as const;
export const LABEL_NAMESPACE_TAG = "L";
export const OPEN_LOCATION_CODE_NAMESPACE_TAG = "open-location-code";
export const MAP_NOTE_KIND = 397 as Kind;
export const MAP_NOTE_REPOST_KIND = 30627;
export const DEFAULT_RELAYS = [
  "wss://relay.primal.net",
  "wss://relay.damus.io",
  "wss://nostr.manasiwibi.com",
];
export const DEV_RELAYS = ["wss://nos.lol"];
export const PANEL_CONTAINER_ID = "panelID";
export const BADGE_CONTAINER_ID = "badge";
export const CONTENT_MINIMUM_LENGTH = 3;
export const CONTENT_MAXIMUM_LENGTH = 300;
export const EARLIEST_FILTER_SINCE = 1716736622;

export const DEV_PUBKEY =
  "80789235a71a388074abfa5c482e270456d2357425266270f82071cf2b1de74a";
