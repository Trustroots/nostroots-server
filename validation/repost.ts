import { nostrify } from "../deps.ts";
const { NPool, NRelay1, NSecSigner } = nostrify;
type Tags = string[][];

import {
  DEFAULT_RELAYS,
  DEV_RELAYS,
  MAP_NOTE_KIND,
  MAP_NOTE_REPOST_KIND,
} from "../common/constants.ts";
import { DEV_PUBKEY } from "../common/constants.ts";
import { validateEvent } from "./validate.ts";

async function getRelayPool(isDev: true | undefined) {
  const relays = isDev ? DEV_RELAYS : DEFAULT_RELAYS;

  // should be chosen according to outbox model
  // https://nostrify.dev/relay/outbox
  const pool = new NPool({
    open(url) {
      return new NRelay1(url);
    },
    async reqRouter(filter: nostrify.NostrFilter[]) {
      const map = new Map();
      relays.map((relay) => {
        map.set(relay, filter);
      });
      return map;
    },
    async eventRouter(_event) {
      return relays;
    },
  });

  return pool;
}

async function publishEvent(
  relayPool: nostrify.NPool,
  event: nostrify.NostrEvent
) {
  console.log("Publishing event…");
  await relayPool.event(event);
  console.log("Event published.");
}

/**
 * Take a nostr event that was signed by a user and generate the repost event.
 */
async function generateRepostedEvent(
  originalEvent: nostrify.NostrEvent,
  privateKey: Uint8Array
) {
  const derivedTags = deriveTags(originalEvent);
  const derivedContent = deriveContent(originalEvent);
  const dTag = ["d", `${originalEvent.pubkey}:${originalEvent.id}`];
  const eTag = ["e", originalEvent.id];
  const pTag = ["p", originalEvent.pubkey];
  const originalCreatedAtTag = [
    "original_created_at",
    `${originalEvent.created_at}`,
  ];

  const signer = new NSecSigner(privateKey);
  const eventTemplate = {
    kind: MAP_NOTE_REPOST_KIND,
    created_at: Math.floor(Date.now() / 1000),
    tags: [eTag, pTag, dTag, originalCreatedAtTag, ...derivedTags],
    content: derivedContent,
  };
  const signedEvent = await signer.signEvent(eventTemplate);
  return signedEvent;
}

function deriveTags(event: nostrify.NostrEvent): Tags {
  return event.tags;
}

function deriveContent(event: nostrify.NostrEvent): string {
  return event.content;
}

/**
 * Create the filters to listen for events that we want to repost
 */
function createFilter(
  isDev: true | undefined,
  maxAgeMinutes: number | undefined
): nostrify.NostrFilter[] {
  const maxAgeSeconds =
    typeof maxAgeMinutes === "undefined" ? 60 * 60 : maxAgeMinutes * 60;

  const baseFilter: nostrify.NostrFilter = {
    kinds: [MAP_NOTE_KIND],
    since: Math.floor(Date.now() / 1e3) - maxAgeSeconds,
  };

  if (isDev) {
    return [{ ...baseFilter, authors: [DEV_PUBKEY] }];
  }

  return [baseFilter];
}

export async function repost(
  privateKey: Uint8Array,
  isDev: true | undefined,
  maxAgeMinutes: number | undefined
) {
  const relayPool = await getRelayPool(isDev);

  const filter = createFilter(isDev, maxAgeMinutes);

  const controller = new AbortController();
  const signal = controller.signal;
  const subscription = relayPool.req(filter, { signal });

  for await (const msg of subscription) {
    if (msg[0] === "EVENT") {
      const event = msg[2];
      const isEventValid = await validateEvent(relayPool, event);
      if (!isEventValid) {
        console.info(`Discarding event…`);
        return;
      }
      const repostedEvent = await generateRepostedEvent(event, privateKey);
      publishEvent(relayPool, repostedEvent);
    } else if (msg[0] === "EOSE") {
      if (isDev) {
        globalThis.setTimeout(() => {
          controller.abort();
        }, 10e3);
      }
    }
  }
}
