# rrweb Replay Security Context

This context defines language for rrweb's replay and snapshot rebuild security model.

## Language

**Untrusted Replay Data**:
Serialized rrweb event or snapshot data whose contents may include attacker-controlled DOM, attributes, URLs, or media state.
_Avoid_: trusted content

**Unsandboxed Rebuild**:
Rebuilding serialized DOM into a browser document that is not protected by an iframe sandbox.
_Avoid_: safe direct rebuild

**Sandboxed Rebuild**:
Rebuilding serialized DOM into a browser document owned by an iframe whose sandbox policy is exactly the direct-DOM-access policy rrweb supports: `allow-same-origin` without `allow-scripts`.
_Avoid_: sanitized rebuild

**Unsafe Rebuild Opt-Out**:
An explicit caller permission to rebuild into an unprotected browser document.
_Avoid_: trusted mode

**Unprotected Rebuild**:
Rebuilding serialized DOM into a browser document that does not satisfy the **Sandboxed Rebuild** policy.
_Avoid_: trusted rebuild

## Relationships

- **Untrusted Replay Data** must use a **Sandboxed Rebuild** in browser environments.
- An **Unprotected Rebuild** is an explicit unsafe operation.
- An **Unsandboxed Rebuild** is one kind of **Unprotected Rebuild**.
- An **Unsafe Rebuild Opt-Out** can allow an **Unprotected Rebuild** in top-level or non-top-level browser documents.
- A **Sandboxed Rebuild** requires iframe ownership and the supported sandbox token policy.
- The rebuild target document boundary owns the sandbox guarantee; nested iframe sandbox attributes do not define whether the target rebuild is sandboxed.
- `rebuild()` is the public security boundary for full snapshot reconstruction; lower-level node builders do not own the browser sandbox policy.

## Example dialogue

> **Dev:** "These events came from our own app. Can we rebuild them directly into `document`?"
> **Domain expert:** "No. They are still **Untrusted Replay Data** if they include user-controlled DOM, so browser replay needs a **Sandboxed Rebuild**."

## Flagged ambiguities

- "trusted content" was too broad. Resolved: use **Untrusted Replay Data** for input data and **Unprotected Rebuild** for the unsafe operation.
