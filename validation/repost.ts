import { nostrToolsRelay } from "../deps.ts";
const { Relay } = nostrToolsRelay;

import { nostrTools } from "../deps.ts";
const { finalizeEvent } = nostrTools;
type Event = nostrTools.Event;
type EventTemplate = nostrTools.EventTemplate;
type VerifiedEvent = nostrTools.VerifiedEvent;
type Tags = string[][];

import {
  DEFAULT_RELAYS,
  DEV_RELAYS,
  MAP_NOTE_KIND,
  MAP_NOTE_REPOST_KIND,
} from "../common/constants.ts";
import { DEV_PUBKEY } from "../common/constants.ts";
import { validateEvent } from "./validate.ts";

async function getRelay(
  isDev: true | undefined
): Promise<nostrToolsRelay.Relay> {
  const relayUrl = isDev ? DEV_RELAYS[0] : DEFAULT_RELAYS[0];

  console.log(`#nadQka Connecting to ${relayUrl}`);
  const relay = await Relay.connect(relayUrl);
  console.log(`#CmJWu4 Connected to ${relay.url}`);
  return relay;
}

async function publishEvent(
  relay: nostrToolsRelay.Relay,
  event: VerifiedEvent
) {
  await relay.publish(event);
}

/**
 * Take a nostr event that was signed by a user and generate the repost event.
 */
function generateRepostedEvent(originalEvent: Event, privateKey: Uint8Array) {
  const derivedTags = deriveTags(originalEvent);
  const derivedContent = deriveContent(originalEvent);
  const dTag = ["d", `${originalEvent.pubkey}:${originalEvent.id}`];
  const eTag = ["e", originalEvent.id];
  const pTag = ["p", originalEvent.pubkey];

  const eventTemplate: EventTemplate = {
    kind: MAP_NOTE_REPOST_KIND,
    created_at: Math.floor(Date.now() / 1000),
    tags: [eTag, pTag, dTag, ...derivedTags],
    content: derivedContent,
  };
  const signedEvent = finalizeEvent(eventTemplate, privateKey);
  return signedEvent;
}

function deriveTags(event: Event): Tags {
  return event.tags;
}

function deriveContent(event: Event): string {
  return event.content;
}

/**
 * Create the filters to listen for events that we want to repost
 */
function createFilter(
  isDev: true | undefined,
  maxAgeMinutes: number | undefined
): nostrTools.Filter {
  const maxAgeSeconds =
    typeof maxAgeMinutes === "undefined" ? 60 * 60 : maxAgeMinutes * 60;

  const baseFilter: nostrTools.Filter = {
    kinds: [MAP_NOTE_KIND],
    since: Math.floor(Date.now() / 1e3) - maxAgeSeconds,
  };

  if (isDev) {
    return { ...baseFilter, authors: [DEV_PUBKEY] };
  }

  return baseFilter;
}

export async function repost(
  privateKey: Uint8Array,
  isDev: true | undefined,
  maxAgeMinutes: number | undefined
) {
  const relay = await getRelay(isDev);

  const filter = createFilter(isDev, maxAgeMinutes);

  const oneose = isDev
    ? () => {
        globalThis.setTimeout(() => {
          relay.close();
        }, 10e3);
      }
    : () => {};

  const sub = relay.subscribe([filter], {
    onevent: async (event) => {
      console.log("#9wKiBL Got event", event);

      const isEventValid = await validateEvent(relay, event);
      if (!isEventValid) {
        console.info(`Discarding event…`);
        return;
      }
      const repostedEvent = generateRepostedEvent(event, privateKey);
      publishEvent(relay, repostedEvent);
    },
    oneose,
  });
}
