# E15 — Server-sent event stream

**Status:** elaborating · **Owner:** ngkit

**Source:** owner request, 2026-10-21, revised 2026-10-23: an application rewrite on the current published release keeps one `EventSource` open for live status and builds the wrapper in the application first, so it can be swapped for this one later. Revised to keep the reconnection behaviour the standard defines.

One thin wrapper over the browser's `EventSource` ([WHATWG HTML, server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html)) for applications that keep a live channel open: named event handlers, a `connected` signal, teardown through `DestroyRef`, handler errors routed to Angular's `ErrorHandler`, an inert mode where there is no `EventSource`, and a jittered backoff that applies only when the standard gives up.

It is its own epic, not a feature of [E14](../E14-problem-client/index.md): E14 is about failed `HttpClient` calls, and this is a long-lived stream with no `HttpClient` involved; either can be scheduled without the other. It lives in `@rn-forge/ng/core` for the reasons E14 gives (no new peer, no new entry point).

[Back to the board](../../index.md)

| Feature                                              | Status      | Scope                                                                                          |
| ---------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------- |
| [F15.1 — `createEventStream`](F15.1-event-stream.md) | elaborating | The factory, named handlers, `connected`, backoff after a failed connection, teardown and SSR. |

## Design

**The standard reconnects; the wrapper does not replace it.** While `readyState` is `CONNECTING`, the browser re-establishes the connection itself, waits the server's `retry:` interval, and sends `Last-Event-ID`, so the server can resume. The wrapper never closes a source that the browser is still retrying. It acts only when `readyState` becomes `CLOSED`, which the standard does when it fails the connection (a non-200 response, or a media type other than `text/event-stream`, for example a proxy's 502 while the backend is down). Then it opens a new source after a jittered exponential delay.

Consequence, accepted: when the backend is unreachable outright, the browser keeps retrying at the `retry:` interval (or its own default) rather than backing off. A backend that wants slower retries sends `retry:`.

**Health is the standard's events.** `connected` follows `open` and `error`. An application-specific heartbeat that proves the backend is healthy is the application's handler, not an option here.

**Prior art.** Angular ships no `EventSource` wrapper, and `httpResource` is request-response ([ADR-0001](../../../adr/ADR-0001.md) principle 1). `reconnecting-eventsource` exists on npm; check it, and any other candidate, before building, and record the result and the ADR-0001 exemption in the doc comment. A candidate that closes and reopens on every error loses `Last-Event-ID` and does not qualify.
