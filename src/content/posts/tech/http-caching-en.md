---
title: "HTTP caching in practice"
description: "Cache-Control, ETag and revalidation, explained through what actually happens on the second visit to a static site."
pubDate: 2026-10-12
category: tech
tags: ["HTTP", "性能"]
lang: "en"
---

Caching is usually taught as a list of headers. It is easier to understand as a sequence of questions a browser asks, in order, before it fetches anything over the network.

## The four questions

1. Do I already have this resource, and is it still fresh?
2. If not fresh, can I ask the server whether it changed without downloading it again?
3. If it changed, what exactly do I need to download?
4. If the network fails, can I still show something?

Each header family answers exactly one of these.

## Freshness first

```http
Cache-Control: public, max-age=0, must-revalidate
```

`max-age` answers question one. Zero means "revalidate before reuse", which is not the same as "do not cache". A static site served from a CDN usually wants a long `max-age` on hashed assets and `must-revalidate` on the HTML entry point.

| Resource | Header | Why |
| --- | --- | --- |
| `/assets/main.a1b2c3.js` | `max-age=31536000, immutable` | Filename changes when content changes |
| `/index.html` | `max-age=0, must-revalidate` | Same URL, different content |
| `/rss.xml` | `max-age=600` | Ten minutes of staleness is acceptable |

## Revalidation is a 304

With `ETag` or `Last-Modified`, the browser sends a conditional request. If nothing changed, the server answers `304 Not Modified` with no body — the cost is one round trip, not one transfer.

```http
GET /index.html
If-None-Match: "8f1c2a"

HTTP/1.1 304 Not Modified
ETag: "8f1c2a"
```

> A 304 still costs a round trip. On a slow connection that is the part users notice, so put the long cache on the things that truly never change.

## What this means for a static site

- Fingerprinted assets can be cached for a year. Do not be shy about it.
- HTML should be revalidated, because its URL never changes.
- A `Service Worker` is a different tool for a different problem: it answers question four.

> [!WARNING]
> `Cache-Control: no-cache` does not mean "do not cache". It means "cache, but always revalidate". The header that actually disables caching is `no-store`.
