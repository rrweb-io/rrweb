# Cross origin iframes

By default browsers make it difficult to access the contents of an iframe that is hosted on a different domain. This is a security feature to prevent malicious sites from accessing sensitive information on other sites. It is possible to work around this security feature, but it is not recommended unless you [are very strict](https://stackoverflow.com/a/21629575) about allowing only the sites you trust to embed your website inside of an iframe.
Since if you allow recording cross origin iframes, any malicious website can embed your website and as long as they have rrweb running they can record all the contents of your website.

Enable recording Cross Origin Iframes in your parent page:

```js
rrweb.record({
  emit(event) {}, // all events will be emitted here, including events from cross origin iframes
  recordCrossOriginIframes: true,
});
```

Enable replaying Cross Origin Iframes in your child page:

```js
rrweb.record({
  emit(event) {}, // this is required for rrweb, but the child page will not emit any events
  recordCrossOriginIframes: true,
});
```
