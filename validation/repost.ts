import { nostrToolsRelay } from "../deps.ts";
const { Relay } = nostrToolsRelay;

import { nostrTools } from "../deps.ts";
type Event = nostrTools.Event;

import { RELAY, OFFER_KIND } from "../common/constants.ts";

console.log(`connecting to ${RELAY}…`);
const relay = await Relay.connect("wss://nos.lol");
console.log(`connected to ${relay.url}`);

const sub = relay.subscribe(
  [
    {
      kinds: [OFFER_KIND],
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
  return true;
}

function generateRepostedEvent(event: Event) {
  const content = JSON.stringify(event);
  const eventTemplate = {
    kind: 450,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      [
        "a",
        "34550:<Community event author pubkey>:<d-identifier of the community>",
        "<Optional relay url>",
      ],
      ["e", "<Post Request ID>", "<Optional relay url>"],
      ["p", "<Post Request Author ID>", "<Optional relay url>"],
      ["k", "<New Post Request kind>"],
    ],
    content: content,
  };
}
