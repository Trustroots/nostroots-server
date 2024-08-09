import { nostrToolsRelay } from "../deps.ts";
const { Relay } = nostrToolsRelay;

import { nostrTools } from "../deps.ts";
const { finalizeEvent, generateSecretKey, getPublicKey } = nostrTools;
type Event = nostrTools.Event;
type EventTemplate = nostrTools.EventTemplate;
type VerifiedEvent = nostrTools.VerifiedEvent;
type Tags = string[][];

import {
  DEV_RELAYS,
  MAP_NOTE_KIND,
  MAP_NOTE_REPOST_KIND,
} from "../common/constants.ts";

// should be fixed, not generated new every time
let SECRET_KEY = generateSecretKey();
let PUBLIC_KEY = getPublicKey(SECRET_KEY);

const RELAY = DEV_RELAYS[0];

console.log(`connecting to ${RELAY}…`);
const relay = await Relay.connect(RELAY);
console.log(`connected to ${relay.url}`);

async function handleEvent(event: Event) {
  if (!validateEvent(event)) {
    console.info(`Discarding event…`);
    return;
  }
  const repostedEvent = generateRepostedEvent(event);
  await publishEvent(repostedEvent);
}

const sub = relay.subscribe(
  [
    {
      kinds: [MAP_NOTE_KIND],
    },
  ],
  {
    onevent: handleEvent,
    oneose() {
      sub.close();
    },
  }
);

function validateEvent(event: Event) {
  if (!event.kind == MAP_NOTE_KIND) {
    return false;
  }
  return true;
}

async function publishEvent(event: VerifiedEvent) {
  await relay.publish(event);
}

function generateRepostedEvent(originalEvent: Event) {
  const derivedTags = deriveTags(originalEvent);
  const derivedContent = deriveContent(originalEvent);
  const dTag = ["d", `${originalEvent.pubkey}:${originalEvent.id}`];
  const eTag = ["e", originalEvent.id];

  const eventTemplate: EventTemplate = {
    kind: MAP_NOTE_REPOST_KIND,
    created_at: Math.floor(Date.now() / 1000),
    tags: [eTag, dTag, ...derivedTags],
    content: derivedContent,
  };
  const signedEvent = finalizeEvent(eventTemplate, SECRET_KEY);
  return signedEvent;
}

function deriveTags(event: Event): Tags {
  return event.tags;
}

function deriveContent(event: Event): string {
  return event.content;
}
