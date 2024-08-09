import { nostrToolsRelay } from "../deps.ts";
const { Relay } = nostrToolsRelay;

import { nostrTools } from "../deps.ts";
const { finalizeEvent } = nostrTools;
type Event = nostrTools.Event;
type EventTemplate = nostrTools.EventTemplate;
type VerifiedEvent = nostrTools.VerifiedEvent;
type Tags = string[][];

import {
  DEV_RELAYS,
  MAP_NOTE_KIND,
  MAP_NOTE_REPOST_KIND,
} from "../common/constants.ts";
import { DEV_PUBKEY } from "../common/constants.ts";

const RELAY = DEV_RELAYS[0];

console.log(`connecting to ${RELAY}…`);
const relay = await Relay.connect(RELAY);
console.log(`connected to ${relay.url}`);

/**
 * Does this event meet our requirements for automated validation?
 *
 * Check things like, is the event signed by the pubkey which is linked to the
 * correct trustroots profile.
 */
function validateEvent(event: Event) {
  if (!event.kind == MAP_NOTE_KIND) {
    return false;
  }
  return true;
}

async function publishEvent(event: VerifiedEvent) {
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
function createFilter(isDev: true | undefined): nostrTools.Filter {
  const baseFilter: nostrTools.Filter = {
    kinds: [MAP_NOTE_KIND],
    // since: Math.floor(Date.now() / 1e3),
  };

  if (isDev) {
    return { ...baseFilter, authors: [DEV_PUBKEY] };
  }

  return baseFilter;
}

export async function repost(privateKey: Uint8Array, isDev: true | undefined) {
  const filter = createFilter(isDev);

  const oneose = isDev
    ? () => {
        globalThis.setTimeout(() => {
          relay.close();
        }, 10e3);
      }
    : () => {};

  const sub = relay.subscribe([filter], {
    onevent: (event) => {
      console.log("#9wKiBL Got event", event);

      if (!validateEvent(event)) {
        console.info(`Discarding event…`);
        return;
      }
      const repostedEvent = generateRepostedEvent(event, privateKey);
      publishEvent(repostedEvent);
    },
    oneose,
  });
}
