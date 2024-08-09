import { nostrToolsRelay } from "../deps.ts";
const { Relay } = nostrToolsRelay;

import { nostrTools } from "../deps.ts";
const { finalizeEvent } = nostrTools;
type Event = nostrTools.Event;

import {
  DEV_RELAYS,
  MAP_NOTE_KIND,
  MAP_NOTE_REPOST_KIND,
} from "../common/constants.ts";

const RELAY = DEV_RELAYS[0];

console.log(`connecting to ${RELAY}…`);
const relay = await Relay.connect(RELAY);
console.log(`connected to ${relay.url}`);

const sub = relay.subscribe(
  [
    {
      kinds: [MAP_NOTE_KIND],
    },
  ],
  {
    onevent(event: nostrTools.Event) {
      console.log("we got the event we wanted:", event);
    },
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

function generateRepostedEvent(originalEvent: Event) {
  const originalContent = JSON.stringify(originalEvent);
  const eventTemplate = {
    kind: MAP_NOTE_REPOST_KIND,
    created_at: Math.floor(Date.now() / 1000),
    tags: [["e", originalEvent.id], ...originalEvent.tags],
    content: originalContent,
  };
  const signedEvent = finalizeEvent(eventTemplate, sk);
  return signedEvent;
}
