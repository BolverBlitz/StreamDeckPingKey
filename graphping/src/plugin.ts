import streamDeck, { LogLevel } from "@elgato/streamdeck";

import { SimplePing } from "./actions/simple-ping-key";
import { GraphPing } from "./actions/graph-ping-key";


// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information
streamDeck.logger.setLevel(LogLevel.TRACE);

// Register the increment action.
streamDeck.actions.registerAction(new SimplePing());
streamDeck.actions.registerAction(new GraphPing());

// Finally, connect to the Stream Deck.
streamDeck.connect();