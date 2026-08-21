# Require Sandboxed Browser Rebuilds

`rrweb-snapshot.rebuild()` will reject unprotected browser documents by default. Browser replay security is enforced by iframe sandboxing, not by trying to sanitize every executable DOM, URL, CSS, SVG, or event-handler vector. Callers that intentionally rebuild into an unprotected browser document must use an explicit unsafe opt-out, while untrusted replay data should use a sandboxed iframe target or the safe helper API.
