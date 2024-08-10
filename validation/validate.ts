import { WAIT_FOR_KIND_ZERO_TIMEOUT_SECONDS } from "../common/constants.ts";
import { MINIMUM_TRUSTROOTS_USERNAME_LENGTH } from "../common/constants.ts";
import { MAP_NOTE_KIND } from "../common/constants.ts";
import { nostrify } from "../deps.ts";
import { Profile } from "../types.ts";

async function getKindZeroEvent(relayPool: nostrify.NPool, pubKey: string) {
  {
    const filter = [
      {
        authors: [pubKey],
        kinds: [0],
      },
    ];

    const controller = new AbortController();
    const signal = controller.signal;
    globalThis.setTimeout(
      () => controller.abort(),
      WAIT_FOR_KIND_ZERO_TIMEOUT_SECONDS * 1000
    );

    const kindZeroEvents = await relayPool.query(filter, { signal });
    if (kindZeroEvents.length > 0) return kindZeroEvents[0];
    return;
  }
}

function getProfileFromEvent(event: nostrTools.Event): Profile | undefined {
  console.log("kindZeroEvent", event);
  try {
    const profile = JSON.parse(event.content);

    const { trustrootsUsername } = profile;

    if (
      typeof trustrootsUsername !== "string" ||
      trustrootsUsername.length < MINIMUM_TRUSTROOTS_USERNAME_LENGTH
    ) {
      return;
    }

    return profile;
  } catch {
    return;
  }
}

async function getNip5PubKey(
  trustrootsUsername: string
): Promise<string | undefined> {
  try {
    const nip5Response = await fetch(
      `https://www.trustroots.org/.well-known/nostr.json?name=${trustrootsUsername}`
    );
    const nip5Json = (await nip5Response.json()) as {
      names: {
        [username: string]: string;
      };
    };

    const nip5PubKey = nip5Json.names[trustrootsUsername];

    return nip5PubKey;
  } catch (e: unknown) {
    console.warn(`Could not get nip5 key for ${trustrootsUsername}`, e);
    return;
  }
}

/**
 * Does this event meet our requirements for automated validation?
 *
 * Check things like, is the event signed by the pubkey which is linked to the
 * correct trustroots profile.
 */
export async function validateEvent(
  relayPool: nostrify.NPool,
  event: nostrTools.Event
) {
  if (event.kind !== MAP_NOTE_KIND) {
    return false;
  }

  const kindZeroEvent = await getKindZeroEvent(relayPool, event.pubkey);

  if (typeof kindZeroEvent === "undefined") {
    console.log("#Kmf59M Skipping event with no kind zero event", { event });
    return false;
  }

  const profile = getProfileFromEvent(kindZeroEvent);

  if (typeof profile === "undefined") {
    console.log("#pd4X7C Skipping event with invalid profile", { event });
    return false;
  }

  const { trustrootsUsername } = profile;

  console.log(`Checking username ${trustrootsUsername}`);

  const nip5PubKey = await getNip5PubKey(trustrootsUsername);

  if (typeof nip5PubKey !== "string") {
    console.log("#b0gWmE Failed to get string nip5 pubkey", { event });
    return false;
  }

  if (event.pubkey !== nip5PubKey) {
    console.log("#dtKr5H Event failed nip5 validation", { event });
    return false;
  }

  console.log("#lpglLu Event passed validation", event);
  return true;
}
