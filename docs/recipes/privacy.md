# Privacy

Privacy is a critical concern when recording user sessions. rrweb provides comprehensive privacy controls to help you protect sensitive user information while still capturing meaningful session data. This guide covers all privacy-related configuration options and best practices for implementing privacy-conscious session recording.

## Table of Contents

- [Quick Start](#quick-start)
- [Privacy Options Reference](#privacy-options-reference)
- [Understanding the Differences](#understanding-the-differences)
- [Common Patterns](#common-patterns)
- [Best Practices](#best-practices)
- [Performance Considerations](#performance-considerations)

## Quick Start

Here are the most common privacy configurations to get you started:

### Basic Privacy Setup

```typescript
import { record } from 'rrweb';

record({
  emit(event) {
    // send event to your backend
  },
  // Mask all input fields by default
  maskAllInputs: true,
  // Block elements with sensitive content
  blockClass: 'rr-block',
  // Mask text content
  maskTextClass: 'rr-mask',
});
```

### Recommended Privacy Configuration

```typescript
record({
  emit(event) {
    // send event to your backend
  },
  // Masking
  maskAllInputs: true,
  maskInputOptions: {
    password: true, // Always mask passwords (default behavior)
  },
  maskTextClass: 'rr-mask',
  maskTextSelector: '[data-sensitive]',

  // Blocking
  blockClass: 'rr-block',
  blockSelector: '[data-private]',

  // Ignoring
  ignoreClass: 'rr-ignore',

  // Slim DOM to reduce payload
  slimDOMOptions: {
    script: true,
    comment: true,
    headFavicon: true,
    headWhitespace: true,
    headMetaDescKeywords: true,
    headMetaSocial: true,
  },
});
```

## Privacy Options Reference

### blockClass

**Type:** `string | RegExp`  
**Default:** `'rr-block'`

Elements with this class name will not be recorded. Instead, they will replay as a placeholder with the same dimensions, maintaining the layout without exposing the content.

**Example:**

```typescript
// Using default class name
record({
  emit(event) {
    /* ... */
  },
  blockClass: 'rr-block', // default value
});
```

```html
<!-- In your HTML -->
<div class="rr-block">
  This content will be blocked and shown as a placeholder
</div>
```

**Using RegExp:**

```typescript
record({
  emit(event) {
    /* ... */
  },
  blockClass: /^(private|secret|confidential)$/,
});
```

```html
<div class="private">Blocked</div>
<div class="secret">Blocked</div>
<div class="confidential">Blocked</div>
```

**Use Cases:**

- Hiding entire sections containing sensitive information (e.g., financial data, personal details)
- Blocking third-party widgets or ads
- Hiding user-generated content that may contain PII

**Type Definition:** See [`blockClass`](../../packages/types/src/index.ts) in `@rrweb/types`

---

### blockSelector

**Type:** `string`  
**Default:** `undefined`

A CSS selector to identify elements that should be blocked. This provides more flexibility than class-based blocking.

**Example:**

```typescript
record({
  emit(event) {
    /* ... */
  },
  blockSelector: '[data-private], .sensitive-info, #user-details',
});
```

```html
<div data-private>This will be blocked</div>
<section class="sensitive-info">This will be blocked</section>
<div id="user-details">This will be blocked</div>
```

**Use Cases:**

- Blocking elements based on data attributes
- Blocking multiple element types with a single selector
- More precise control than class-based blocking

---

### ignoreClass

**Type:** `string`  
**Default:** `'rr-ignore'`

Elements with this class name will not record input value changes for `input`, `textarea`, and `select`. The element itself is still recorded.

**Example:**

```typescript
record({
  emit(event) {
    /* ... */
  },
  ignoreClass: 'rr-ignore',
});
```

```html
<input type="text" class="rr-ignore" placeholder="Input events ignored" />
```

**Use Cases:**

- Ignoring input events for search fields that may contain sensitive queries
- Preventing recording of temporary or draft content
- Ignoring input value changes on specific form fields

**Type Definition:** See [`recordOptions`](../../packages/rrweb/src/types.ts) in `packages/rrweb/src/types.ts`

---

### ignoreSelector

**Type:** `string`  
**Default:** `undefined`

A CSS selector to identify elements whose input events should be ignored.

**Example:**

```typescript
record({
  emit(event) {
    /* ... */
  },
  ignoreSelector: '[data-no-record], .no-track',
});
```

```html
<input type="text" data-no-record placeholder="Not recorded" />
<textarea class="no-track">Interactions ignored</textarea>
```

**Use Cases:**

- Ignoring input events based on data attributes
- More flexible than class-based ignoring
- Combining multiple selectors for complex scenarios

---

### ignoreCSSAttributes

**Type:** `Set<string>`  
**Default:** `undefined`

A set of CSS property names to ignore for style declaration mutations (`setProperty` / `removeProperty`). This can reduce payload size and improve performance.

**Example:**

```typescript
record({
  emit(event) {
    /* ... */
  },
  ignoreCSSAttributes: new Set([
    'background-color',
    'color',
    'border-color',
  ]),
});
```

**Use Cases:**

- Ignoring high-frequency CSS property updates
- Reducing payload size by excluding non-critical style mutations
- Filtering style changes that are not useful for debugging

**Type Definition:** See [`recordOptions`](../../packages/rrweb/src/types.ts) in `packages/rrweb/src/types.ts`

---

### maskTextClass

**Type:** `string | RegExp`  
**Default:** `'rr-mask'`

All text content of elements with this class name and their children will be masked with asterisks (`*`).

**Example:**

```typescript
record({
  emit(event) {
    /* ... */
  },
  maskTextClass: 'rr-mask',
});
```

```html
<div class="rr-mask">
  This text will be masked
  <span>Child text is also masked</span>
</div>
```

**Using RegExp:**

```typescript
record({
  emit(event) {
    /* ... */
  },
  maskTextClass: /^mask-/,
});
```

```html
<div class="mask-pii">Masked</div>
<div class="mask-sensitive">Masked</div>
```

**Use Cases:**

- Masking user names, email addresses, or other PII
- Hiding sensitive text content while preserving layout
- Protecting confidential business information

**Type Definition:** See [`maskTextClass`](../../packages/types/src/index.ts) in `@rrweb/types`

---

### maskTextSelector

**Type:** `string`  
**Default:** `undefined`

A CSS selector to identify elements whose text content should be masked.

**Example:**

```typescript
record({
  emit(event) {
    /* ... */
  },
  maskTextSelector: '[data-mask], .user-name, .email',
});
```

```html
<span data-mask>john.doe@example.com</span>
<div class="user-name">John Doe</div>
<p class="email">contact@example.com</p>
```

**Use Cases:**

- Masking text based on semantic data attributes
- More precise control than class-based masking
- Combining multiple selectors for comprehensive masking

---

### maskAllInputs

**Type:** `boolean`  
**Default:** `false`

When set to `true`, all input values will be masked by default. This is the most secure option for protecting user input.

**Example:**

```typescript
record({
  emit(event) {
    /* ... */
  },
  maskAllInputs: true,
});
```

**Use Cases:**

- Maximum privacy protection for all user inputs
- Compliance with strict data protection regulations
- When you only need to track interactions, not actual input values

**Note:** The default behavior masks password inputs (`{ password: true }`) unless you override `maskInputOptions`.

**Type Definition:** See [`recordOptions`](../../packages/rrweb/src/types.ts) in `packages/rrweb/src/types.ts`

---

### maskInputOptions

**Type:** `MaskInputOptions`  
**Default:** `{ password: true }`

Fine-grained control over which input types should be masked. This allows you to selectively mask specific input types while recording others.

**Type Definition:**

```typescript
type MaskInputOptions = Partial<{
  color: boolean;
  date: boolean;
  'datetime-local': boolean;
  email: boolean;
  month: boolean;
  number: boolean;
  range: boolean;
  search: boolean;
  tel: boolean;
  text: boolean;
  time: boolean;
  url: boolean;
  week: boolean;
  textarea: boolean;
  select: boolean;
  password: boolean;
}>;
```

**Example:**

```typescript
record({
  emit(event) {
    /* ... */
  },
  maskInputOptions: {
    // Always mask these
    password: true,
    email: true,
    tel: true,

    // Record these
    text: false,
    textarea: false,
    select: false,

    // Mask numeric inputs
    number: true,
    range: true,
  },
});
```

**Use Cases:**

- Masking PII fields (email, phone) while recording other inputs
- Compliance with specific privacy requirements
- Balancing privacy and debugging needs

**Type Definition:** See [`MaskInputOptions`](../../packages/rrweb-snapshot/src/types.ts) in `packages/rrweb-snapshot/src/types.ts`

---

### maskInputFn

**Type:** `(text: string, element: HTMLElement) => string`  
**Default:** `undefined`

A custom function to mask input values. This provides complete control over how input values are masked.

`maskInputFn` runs only for input types enabled in `maskInputOptions` (or when `maskAllInputs: true`).

**Example:**

```typescript
record({
  emit(event) {
    /* ... */
  },
  maskInputOptions: {
    email: true,
    tel: true,
    text: true,
    password: true,
  },
  maskInputFn: (text, element) => {
    // Mask email addresses
    if (element.type === 'email') {
      return text.replace(/./g, '*');
    }

    // Mask credit card numbers but show last 4 digits
    if (element.getAttribute('data-type') === 'credit-card') {
      return text.slice(0, -4).replace(/./g, '*') + text.slice(-4);
    }

    // Mask phone numbers but show area code
    if (element.type === 'tel') {
      return text.slice(0, 3) + text.slice(3).replace(/./g, '*');
    }

    // Default masking
    return text.replace(/./g, '*');
  },
});
```

**Advanced Example - Partial Masking:**

```typescript
record({
  emit(event) {
    /* ... */
  },
  maskAllInputs: true,
  maskInputFn: (text, element) => {
    const maskLevel = element.getAttribute('data-mask-level');

    switch (maskLevel) {
      case 'full':
        return '*'.repeat(text.length);
      case 'partial':
        // Show first and last character
        if (text.length <= 2) return '*'.repeat(text.length);
        return text[0] + '*'.repeat(text.length - 2) + text[text.length - 1];
      case 'none':
        return text;
      default:
        return text.replace(/./g, '*');
    }
  },
});
```

**Use Cases:**

- Custom masking logic for specific input types
- Partial masking (e.g., showing last 4 digits of credit card)
- Context-aware masking based on element attributes
- Implementing business-specific privacy rules

**Type Definition:** See [`MaskInputFn`](../../packages/rrweb-snapshot/src/types.ts) in `packages/rrweb-snapshot/src/types.ts`

---

### maskTextFn

**Type:** `(text: string, element: HTMLElement | null) => string`  
**Default:** `undefined`

A custom function to mask text content. Similar to `maskInputFn`, but for text nodes.

`maskTextFn` runs only when `maskTextClass` / `maskTextSelector` matches the text node context.

**Example:**

```typescript
record({
  emit(event) {
    /* ... */
  },
  maskTextSelector: '.email, .phone, .username',
  maskTextFn: (text, element) => {
    if (!element) return text;

    // Mask email addresses in text
    if (element.classList.contains('email')) {
      return text.replace(/[a-zA-Z0-9]/g, '*');
    }

    // Mask phone numbers
    if (element.classList.contains('phone')) {
      return text.replace(/\d/g, '*');
    }

    // Mask user names but preserve length
    if (element.classList.contains('username')) {
      return '*'.repeat(text.length);
    }

    return text;
  },
});
```

**Advanced Example - Pattern-Based Masking:**

```typescript
record({
  emit(event) {
    /* ... */
  },
  maskTextSelector: '*',
  maskTextFn: (text, element) => {
    // Mask email patterns
    text = text.replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      '***@***.***',
    );

    // Mask phone patterns
    text = text.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '***-***-****');

    // Mask credit card patterns
    text = text.replace(
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
      '**** **** **** ****',
    );

    // Mask SSN patterns
    text = text.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '***-**-****');

    return text;
  },
});
```

**Use Cases:**

- Masking PII in text content (emails, phone numbers, addresses)
- Pattern-based masking (credit cards, SSNs)
- Context-aware text masking
- Preserving text structure while hiding content

**Type Definition:** See [`MaskTextFn`](../../packages/rrweb-snapshot/src/types.ts) in `packages/rrweb-snapshot/src/types.ts`

---

### slimDOMOptions

**Type:** `SlimDOMOptions | 'all' | true`  
**Default:** `undefined`

Options to reduce the size of the recorded DOM by excluding non-essential elements. This improves performance and reduces storage requirements.

**Type Definition:**

```typescript
type SlimDOMOptions = Partial<{
  script: boolean; // Remove script tags
  comment: boolean; // Remove comment nodes
  headFavicon: boolean; // Remove favicon links
  headWhitespace: boolean; // Remove whitespace in head
  headMetaDescKeywords: boolean; // Remove meta description/keywords
  headMetaSocial: boolean; // Remove social meta tags (og:, twitter:)
  headMetaRobots: boolean; // Remove robots meta tags
  headMetaHttpEquiv: boolean; // Remove http-equiv meta tags
  headMetaAuthorship: boolean; // Remove authorship meta tags
  headMetaVerification: boolean; // Remove verification meta tags
  headTitleMutations: boolean; // Block title tag mutations
}>;
```

**Example:**

```typescript
// Use all slim options
record({
  emit(event) {
    /* ... */
  },
  slimDOMOptions: 'all', // most aggressive preset
});

// `true` is a less aggressive preset than 'all'
record({
  emit(event) {
    /* ... */
  },
  slimDOMOptions: true,
});

// Custom slim options
record({
  emit(event) {
    /* ... */
  },
  slimDOMOptions: {
    script: true,
    comment: true,
    headFavicon: true,
    headWhitespace: true,
    headMetaDescKeywords: true,
    headMetaSocial: true,
    headMetaRobots: true,
    headMetaHttpEquiv: true,
    headMetaAuthorship: true,
    headMetaVerification: true,
  },
});
```

**Recommended Configuration:**

```typescript
record({
  emit(event) {
    /* ... */
  },
  slimDOMOptions: {
    script: true, // Scripts aren't needed for replay
    comment: true, // Comments aren't visible
    headFavicon: true, // Favicon doesn't affect replay
    headWhitespace: true, // Whitespace in head is unnecessary
    headMetaDescKeywords: true, // SEO meta tags aren't needed
    headMetaSocial: true, // Social meta tags aren't needed
    headTitleMutations: true, // Prevent excessive title changes
  },
});
```

**Use Cases:**

- Reducing payload size for better performance
- Removing non-visual elements that don't affect replay
- Excluding metadata that may contain sensitive information
- Optimizing storage and bandwidth usage

**Type Definition:** See [`SlimDOMOptions`](../../packages/rrweb-snapshot/src/types.ts) in `packages/rrweb-snapshot/src/types.ts`

---

### keepIframeSrcFn

**Type:** `(src: string) => boolean`  
**Default:** `() => false`

A function to determine whether to keep the `src` attribute of an iframe. By default, iframe `src` attributes are removed for privacy. This function allows you to selectively keep certain iframe sources.

**Example:**

```typescript
record({
  emit(event) {
    /* ... */
  },
  keepIframeSrcFn: (src) => {
    // Keep iframes from trusted domains
    const trustedDomains = [
      'https://www.youtube.com',
      'https://player.vimeo.com',
      'https://trusted-widget.example.com',
    ];

    return trustedDomains.some((domain) => src.startsWith(domain));
  },
});
```

**Advanced Example:**

```typescript
record({
  emit(event) {
    /* ... */
  },
  keepIframeSrcFn: (src) => {
    // Keep same-origin iframes
    if (src.startsWith(window.location.origin)) {
      return true;
    }

    // Keep relative URLs
    if (!src.startsWith('http')) {
      return true;
    }

    // Keep specific third-party services
    const allowedPatterns = [
      /^https:\/\/www\.youtube\.com\/embed\//,
      /^https:\/\/player\.vimeo\.com\/video\//,
      /^https:\/\/[^/]*\.example\.com\//,
    ];

    return allowedPatterns.some((pattern) => pattern.test(src));
  },
});
```

**Use Cases:**

- Keeping trusted third-party iframe sources
- Preserving same-origin iframes
- Allowing specific embed services (YouTube, Vimeo, etc.)
- Implementing domain-based iframe policies

**Type Definition:** See [`KeepIframeSrcFn`](../../packages/rrweb-snapshot/src/types.ts) in `packages/rrweb-snapshot/src/types.ts`

---

## Understanding the Differences

Understanding when to use blocking, ignoring, or masking is crucial for implementing effective privacy controls.

### Blocking vs. Ignoring vs. Masking

| Feature                   | Blocking                  | Ignoring            | Masking                      |
| ------------------------- | ------------------------- | ------------------- | ---------------------------- |
| **Element Recorded**      | ❌ No (placeholder shown) | ✅ Yes              | ✅ Yes                       |
| **Content Visible**       | ❌ No                     | ✅ Yes              | ⚠️ Masked (asterisks)        |
| **Interactions Recorded** | ❌ No                     | ❌ No               | ✅ Yes                       |
| **Layout Preserved**      | ✅ Yes (dimensions)       | ✅ Yes              | ✅ Yes                       |
| **Use Case**              | Hide entire sections      | Ignore input events | Hide content, keep structure |

### When to Use Each Approach

#### Use **Blocking** when:

- You want to completely hide a section of the page
- The content is highly sensitive (financial data, medical records)
- You don't need to see the layout or structure
- You want to hide third-party widgets or ads

```typescript
// Example: Block sensitive sections
blockClass: 'rr-block',
blockSelector: '[data-sensitive], .financial-info, .medical-records',
```

#### Use **Ignoring** when:

- You want to see the element but not record user interactions
- You need to preserve the visual appearance
- You want to prevent recording of input events only
- You're tracking UI behavior but not input values

```typescript
// Example: Ignore input events for search fields
ignoreClass: 'rr-ignore',
ignoreSelector: '[data-no-track], .search-input, .draft-content',
```

#### Use **Masking** when:

- You want to hide content but preserve structure
- You need to see that content exists without revealing it
- You want to maintain layout and element dimensions
- You're debugging UI issues but need to protect PII

```typescript
// Example: Mask PII while preserving layout
maskTextClass: 'rr-mask',
maskTextSelector: '.user-name, .email, .phone',
maskAllInputs: true,
maskInputOptions: {
  email: true,
  tel: true,
  password: true,
},
```

### Visual Comparison

```html
<!-- Original Content -->
<div class="user-profile">
  <h2>John Doe</h2>
  <p class="email">john.doe@example.com</p>
  <input type="text" value="123 Main St" />
</div>

<!-- With Blocking (blockClass="user-profile") -->
<!-- Replays as a gray placeholder box with same dimensions -->

<!-- With Ignoring (ignoreClass on input) -->
<div class="user-profile">
  <h2>John Doe</h2>
  <p class="email">john.doe@example.com</p>
  <input type="text" value="123 Main St" />
  <!-- Input events not recorded -->
</div>

<!-- With Masking (maskTextClass="user-profile", maskAllInputs=true) -->
<div class="user-profile">
  <h2>********</h2>
  <p class="email">*********************</p>
  <input type="text" value="***********" />
</div>
```

---

## Common Patterns

### Pattern 1: Masking All PII

Comprehensive PII protection while maintaining usability for debugging:

```typescript
record({
  emit(event) {
    /* ... */
  },

  // Mask all inputs by default
  maskAllInputs: true,

  // Explicitly mask PII input types
  maskInputOptions: {
    email: true,
    tel: true,
    password: true,
    text: true, // May contain names, addresses, etc.
  },

  // Mask text content with PII
  maskTextClass: 'rr-mask',
  maskTextSelector: '.user-name, .email, .phone, .address, [data-pii]',

  // Custom masking for specific patterns
  maskTextFn: (text, element) => {
    // Mask email patterns
    text = text.replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      '***@***.***',
    );
    // Mask phone patterns
    text = text.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '***-***-****');
    return text;
  },
});
```

### Pattern 2: Blocking Sensitive Sections

Hide entire sections containing sensitive information:

```typescript
record({
  emit(event) {
    /* ... */
  },

  // Block sensitive sections
  blockClass: /^(private|secret|confidential|sensitive)$/,
  blockSelector: [
    '[data-private]',
    '.financial-info',
    '.medical-records',
    '.payment-details',
    '#user-settings',
    '.admin-panel',
  ].join(', '),

  // Also mask any text that might leak through
  maskTextClass: 'rr-mask',
});
```

### Pattern 3: Custom Masking Functions

Implement business-specific masking logic:

```typescript
record({
  emit(event) {
    /* ... */
  },

  maskInputFn: (text, element) => {
    const fieldType = element.getAttribute('data-field-type');

    switch (fieldType) {
      case 'credit-card':
        // Show last 4 digits only
        return text.slice(0, -4).replace(/./g, '*') + text.slice(-4);

      case 'ssn':
        // Show last 4 digits only
        return '***-**-' + text.slice(-4);

      case 'account-number':
        // Show first 2 and last 2 digits
        if (text.length <= 4) return '*'.repeat(text.length);
        return text.slice(0, 2) + '*'.repeat(text.length - 4) + text.slice(-2);

      case 'email':
        // Show domain only
        const [, domain] = text.split('@');
        return '***@' + (domain || '***');

      default:
        return text.replace(/./g, '*');
    }
  },

  maskTextFn: (text, element) => {
    if (!element) return text;

    const maskLevel = element.getAttribute('data-mask-level');

    if (maskLevel === 'full') {
      return '*'.repeat(text.length);
    }

    if (maskLevel === 'partial') {
      // Mask middle portion
      if (text.length <= 4) return '*'.repeat(text.length);
      const visibleChars = Math.ceil(text.length * 0.2);
      return (
        text.slice(0, visibleChars) +
        '*'.repeat(text.length - visibleChars * 2) +
        text.slice(-visibleChars)
      );
    }

    return text;
  },
});
```

### Pattern 4: Combining Multiple Privacy Options

Comprehensive privacy configuration for maximum protection:

```typescript
record({
  emit(event) {
    /* ... */
  },

  // Blocking
  blockClass: 'rr-block',
  blockSelector: '[data-private], .sensitive-section',

  // Ignoring
  ignoreClass: 'rr-ignore',
  ignoreSelector: '[data-no-track]',
  ignoreCSSAttributes: new Set([
    'data-user-id',
    'data-session-id',
    'data-analytics',
  ]),

  // Masking
  maskAllInputs: true,
  maskInputOptions: {
    email: true,
    tel: true,
    password: true,
  },
  maskTextClass: 'rr-mask',
  maskTextSelector: '[data-pii]',

  // Custom functions
  maskInputFn: (text, element) => {
    // Custom masking logic
    return text.replace(/./g, '*');
  },

  // Slim DOM
  slimDOMOptions: {
    script: true,
    comment: true,
    headFavicon: true,
    headMetaSocial: true,
  },

  // Iframe control
  keepIframeSrcFn: (src) => {
    return src.startsWith(window.location.origin);
  },
});
```

### Pattern 5: Development vs. Production

Different configurations for different environments:

```typescript
const isDevelopment = process.env.NODE_ENV === 'development';

record({
  emit(event) {
    /* ... */
  },

  // Less restrictive in development for debugging
  maskAllInputs: !isDevelopment,

  maskInputOptions: isDevelopment
    ? {
        password: true, // Only mask passwords in dev
      }
    : {
        // Mask everything in production
        email: true,
        tel: true,
        password: true,
        text: true,
        textarea: true,
      },

  // Block sensitive sections in production only
  blockSelector: isDevelopment
    ? undefined
    : '[data-private], .sensitive-section',

  // Slim DOM in production for performance
  slimDOMOptions: isDevelopment ? undefined : 'all',
});
```

---

## Best Practices

### 1. Start with Maximum Privacy

Begin with the most restrictive settings and selectively relax them as needed:

```typescript
record({
  emit(event) {
    /* ... */
  },
  maskAllInputs: true,
  blockClass: 'rr-block',
  maskTextClass: 'rr-mask',
  slimDOMOptions: 'all',
});
```

### 2. Use Data Attributes for Semantic Marking

Use data attributes to semantically mark elements for privacy controls:

```html
<div data-private>Blocked content</div>
<span data-pii>Masked content</span>
<input data-no-track type="text" />
```

```typescript
record({
  emit(event) {
    /* ... */
  },
  blockSelector: '[data-private]',
  maskTextSelector: '[data-pii]',
  ignoreSelector: '[data-no-track]',
});
```

### 3. Document Your Privacy Decisions

Add comments explaining why certain elements are blocked, masked, or ignored:

```typescript
record({
  emit(event) {
    /* ... */
  },

  // Block financial information per compliance requirements
  blockSelector: '.financial-info, .payment-details',

  // Mask PII for privacy compliance requirements
  maskTextSelector: '[data-pii]',

  // Ignore search inputs to protect user privacy
  ignoreSelector: '.search-input',
});
```

### 4. Test Your Privacy Configuration

Always test your privacy configuration to ensure it works as expected:

```typescript
// Test in development
const testPrivacy = () => {
  // Check that sensitive elements are blocked
  const blockedElements = document.querySelectorAll('.rr-block');
  console.log('Blocked elements:', blockedElements.length);

  // Check that PII is masked
  const maskedElements = document.querySelectorAll('.rr-mask');
  console.log('Masked elements:', maskedElements.length);

  // Verify masking targets are marked as expected
  const maskTargets = document.querySelectorAll('[data-pii], .rr-mask');
  console.log('Mask-targeted elements:', maskTargets.length);
};
```

### 5. Use Progressive Enhancement

Apply privacy controls progressively based on element sensitivity:

```typescript
record({
  emit(event) {
    /* ... */
  },

  // Level 1: Block highly sensitive content
  blockSelector: '.top-secret, .confidential',

  // Level 2: Mask moderately sensitive content
  maskTextSelector: '.sensitive, [data-pii]',

  // Level 3: Ignore interactions with less sensitive content
  ignoreSelector: '.draft, .temporary',
});
```

### 6. Consider User Consent

Adjust privacy settings based on user consent:

```typescript
const userConsent = getUserConsentLevel(); // 'minimal', 'standard', 'full'

const privacyConfig = {
  minimal: {
    maskAllInputs: true,
    blockSelector: '[data-private]',
    maskTextSelector: '[data-pii]',
  },
  standard: {
    maskAllInputs: true,
    maskInputOptions: { password: true, email: true },
    maskTextSelector: '[data-pii]',
  },
  full: {
    maskAllInputs: false,
    maskInputOptions: { password: true },
  },
};

record({
  emit(event) {
    /* ... */
  },
  ...privacyConfig[userConsent],
});
```

### 7. Regular Privacy Audits

Periodically review and update your privacy configuration:

```typescript
// Create a privacy audit function
const auditPrivacy = () => {
  const report = {
    blockedElements: document.querySelectorAll('[class*="rr-block"]').length,
    maskedElements: document.querySelectorAll('[class*="rr-mask"]').length,
    ignoredElements: document.querySelectorAll('[class*="rr-ignore"]').length,
    sensitiveInputs: document.querySelectorAll(
      'input[type="password"], input[type="email"]',
    ).length,
  };

  console.log('Privacy Audit Report:', report);
  return report;
};

// Run audit in development
if (process.env.NODE_ENV === 'development') {
  auditPrivacy();
}
```

### 8. Balance Privacy and Debugging

Find the right balance between privacy and debugging capabilities:

```typescript
record({
  emit(event) {
    /* ... */
  },

  // Mask sensitive inputs
  maskInputOptions: {
    password: true,
    email: true,
    tel: true,
  },

  // But allow non-sensitive inputs for debugging
  maskInputFn: (text, element) => {
    // Allow debugging-friendly inputs
    if (element.getAttribute('data-debug-friendly') === 'true') {
      return text;
    }

    // Mask everything else
    return text.replace(/./g, '*');
  },
});
```

### 9. Use TypeScript for Type Safety

Leverage TypeScript to ensure correct privacy configuration:

```typescript
import type { recordOptions } from 'rrweb';

const privacyConfig: Partial<recordOptions<Event>> = {
  maskAllInputs: true,
  maskInputOptions: {
    email: true,
    tel: true,
    password: true,
  },
  blockClass: 'rr-block',
  maskTextClass: 'rr-mask',
};

record({
  emit(event) {
    /* ... */
  },
  ...privacyConfig,
});
```

### 10. Document Privacy Policies

Maintain clear documentation of your privacy implementation:

```typescript
/**
 * Privacy Configuration
 *
 * This configuration implements our privacy policy:
 * - All password inputs are masked (compliance requirement)
 * - Email and phone inputs are masked (GDPR requirement)
 * - Financial information is blocked (PCI-DSS requirement)
 * - User-generated content is masked (privacy policy)
 *
 * Last reviewed: 2024-01-15
 * Next review: 2024-07-15
 */
const privacyConfig = {
  maskAllInputs: true,
  blockSelector: '.financial-info',
  maskTextSelector: '[data-pii]',
};
```

---

## Performance Considerations

Privacy options can impact recording performance. Here's what you need to know:

### Performance Impact by Feature

| Feature               | Performance Impact | Notes                     |
| --------------------- | ------------------ | ------------------------- |
| `blockClass`          | ⚡ Low             | Simple class check        |
| `blockSelector`       | ⚡⚡ Medium        | CSS selector matching     |
| `maskAllInputs`       | ⚡ Low             | Simple boolean check      |
| `maskInputOptions`    | ⚡ Low             | Type-based lookup         |
| `maskInputFn`         | ⚡⚡⚡ High        | Custom function execution |
| `maskTextFn`          | ⚡⚡⚡ High        | Custom function execution |
| `slimDOMOptions`      | ✅ Positive        | Reduces payload size      |
| `ignoreCSSAttributes` | ✅ Positive        | Reduces payload size      |

### Optimization Tips

#### 1. Prefer Built-in Options Over Custom Functions

```typescript
// ❌ Slower - custom function for every input
maskInputFn: (text) => text.replace(/./g, '*'),

// ✅ Faster - use built-in option
maskAllInputs: true,
```

#### 2. Use Specific Selectors

```typescript
// ❌ Slower - complex selector
blockSelector: 'div[data-private] > span.sensitive, div[data-secret] > p.confidential',

// ✅ Faster - simple class
blockClass: 'rr-block',
```

#### 3. Optimize Custom Functions

```typescript
// ❌ Slower - complex regex on every call
maskTextFn: (text) => {
  text = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '***');
  text = text.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '***');
  return text;
},

// ✅ Faster - early return for non-matching elements
maskTextFn: (text, element) => {
  if (!element || !element.classList.contains('may-contain-pii')) {
    return text;
  }
  // Only run expensive regex when needed
  return text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '***');
},
```

#### 4. Use slimDOMOptions to Reduce Payload

```typescript
// Reduces initial snapshot size significantly
slimDOMOptions: {
  script: true,        // Scripts can be large
  comment: true,       // Comments add no value
  headMetaSocial: true, // Social meta tags can be large
},
```

#### 5. Cache Expensive Computations

```typescript
// Cache regex patterns
const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;

maskTextFn: (text) => {
  return text
    .replace(emailRegex, '***@***.***')
    .replace(phoneRegex, '***-***-****');
},
```

#### 6. Monitor Performance

```typescript
const startTime = performance.now();

record({
  emit(event) {
    const endTime = performance.now();
    console.log(`Event processing time: ${endTime - startTime}ms`);
  },
  maskAllInputs: true,
  // ... other options
});
```

### Payload Size Comparison

Payload impact depends on your page structure and recording options. Measure this in your own app instead of relying on fixed numbers.

---

## Additional Resources

- [Type Definitions](../../packages/rrweb/src/types.ts) - Complete TypeScript type definitions
- [rrweb-snapshot Types](../../packages/rrweb-snapshot/src/types.ts) - Snapshot-related type definitions
- [@rrweb/types](../../packages/types/src/index.ts) - Core type definitions
- [Main Guide](../guide.md) - General rrweb documentation

---

## Summary

Privacy is a critical aspect of session recording. rrweb provides comprehensive privacy controls through:

1. **Blocking** - Hide entire sections with placeholders
2. **Ignoring** - Prevent recording of input events
3. **Masking** - Hide content while preserving structure
4. **Custom Functions** - Implement business-specific privacy logic
5. **Slim DOM** - Reduce payload size and remove metadata

**Key Takeaways:**

- Start with maximum privacy and relax as needed
- Use semantic data attributes for clear intent
- Test your privacy configuration thoroughly
- Balance privacy with debugging needs
- Monitor performance impact of custom functions
- Document your privacy decisions
- Regularly audit and update your configuration

By following the patterns and best practices in this guide, you can implement robust privacy controls that protect user data while maintaining the debugging capabilities you need.
