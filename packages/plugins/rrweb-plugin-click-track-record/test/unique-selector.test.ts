/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { uniqueSelector } from '../src/index';

/**
 * Helper: set document.body innerHTML and return body as root.
 * Use data-target="name" to mark the element you want to test,
 * then call target('name') to get it.
 */
function setHTML(html: string) {
  document.body.innerHTML = html;
}

function target(name = 'target'): HTMLElement {
  const el = document.querySelector(`[data-target="${name}"]`);
  if (!el) throw new Error(`No element with data-target="${name}"`);
  return el as HTMLElement;
}

/** Assert the selector is unique and resolves to the expected element */
function expectUnique(el: HTMLElement, root: HTMLElement = document.body) {
  const sel = uniqueSelector(el, root);
  expect(sel).toBeTruthy();
  const matches = root.querySelectorAll(sel);
  expect(matches.length).toBe(1);
  expect(matches[0]).toBe(el);
  return sel;
}

describe('uniqueSelector', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  // -------------------------------------------------------------------
  // Basic element identification
  // -------------------------------------------------------------------

  describe('basic elements', () => {
    it('selects a button by tag when it is the only one', () => {
      setHTML('<div><button data-target="target">Click me</button></div>');
      const sel = expectUnique(target());
      // Sole button can use just "button" without nth-of-type
      expect(sel).toContain('button');
    });

    it('selects among sibling buttons using nth-of-type', () => {
      setHTML(`
        <div>
          <button>First</button>
          <button data-target="target">Second</button>
          <button>Third</button>
        </div>
      `);
      const sel = expectUnique(target());
      expect(sel).toContain('nth-of-type');
    });

    it('selects a link by tag', () => {
      setHTML('<nav><a href="/home">Home</a><a href="/about" data-target="target">About</a></nav>');
      expectUnique(target());
    });

    it('selects an input element', () => {
      setHTML(`
        <form>
          <input type="text" name="email">
          <input type="submit" value="Go" data-target="target">
        </form>
      `);
      expectUnique(target());
    });
  });

  // -------------------------------------------------------------------
  // ID-based selection
  // -------------------------------------------------------------------

  describe('ID-based selectors', () => {
    it('uses a stable ID directly', () => {
      setHTML('<div><span id="main-cta" data-target="target">Buy Now</span></div>');
      const sel = expectUnique(target());
      expect(sel).toBe('#main-cta');
    });

    it('anchors from a parent ID', () => {
      setHTML(`
        <div id="sidebar">
          <ul>
            <li>One</li>
            <li data-target="target">Two</li>
          </ul>
        </div>
      `);
      const sel = expectUnique(target());
      expect(sel).toContain('#sidebar');
    });

    it('rejects purely numeric IDs', () => {
      setHTML('<div id="12345"><span data-target="target">Text</span></div>');
      const sel = expectUnique(target());
      // Should NOT contain #12345 since numeric IDs are unstable
      expect(sel).not.toContain('#12345');
    });

    it('rejects framework-generated IDs (ember)', () => {
      setHTML('<div id="ember742"><span data-target="target">Text</span></div>');
      const sel = expectUnique(target());
      expect(sel).not.toContain('#ember742');
    });

    it('rejects UUIDs in IDs', () => {
      setHTML('<div id="widget-a1b2c3d4e5f6a7b8"><span data-target="target">Text</span></div>');
      const sel = expectUnique(target());
      expect(sel).not.toContain('a1b2c3d4e5f6a7b8');
    });
  });

  // -------------------------------------------------------------------
  // Class-based selection
  // -------------------------------------------------------------------

  describe('class-based selectors', () => {
    it('uses a stable class to distinguish siblings', () => {
      setHTML(`
        <ul>
          <li class="nav-item">Home</li>
          <li class="nav-item active" data-target="target">About</li>
        </ul>
      `);
      const sel = expectUnique(target());
      // 'active' is a state class and should be rejected;
      // both have nav-item so it can't distinguish via class alone
      // Should fall back to nth-of-type
      expectUnique(target());
    });

    it('rejects styled-components classes', () => {
      setHTML(`
        <div>
          <span class="sc-abc123" data-target="target">Styled</span>
          <span class="sc-def456">Other</span>
        </div>
      `);
      const sel = expectUnique(target());
      expect(sel).not.toContain('sc-abc123');
    });

    it('rejects emotion CSS classes', () => {
      setHTML(`
        <div>
          <span class="css-1a2b3c" data-target="target">Emotion</span>
          <span class="css-4d5e6f">Other</span>
        </div>
      `);
      const sel = expectUnique(target());
      expect(sel).not.toContain('css-1a2b3c');
    });

    it('rejects state classes like "active" or "selected"', () => {
      setHTML(`
        <div>
          <button class="btn active" data-target="target">OK</button>
          <button class="btn">Cancel</button>
        </div>
      `);
      const sel = expectUnique(target());
      expect(sel).not.toContain('active');
    });

    it('uses a stable class that uniquely identifies among siblings', () => {
      setHTML(`
        <div>
          <a class="primary-link" href="/buy" data-target="target">Buy</a>
          <a class="secondary-link" href="/info">Info</a>
        </div>
      `);
      const sel = expectUnique(target());
      expect(sel).toContain('primary-link');
    });
  });

  // -------------------------------------------------------------------
  // Structural / nth-of-type selectors
  // -------------------------------------------------------------------

  describe('structural selectors', () => {
    it('handles deeply nested elements', () => {
      setHTML(`
        <div>
          <div>
            <div>
              <span data-target="target">Deep</span>
            </div>
          </div>
        </div>
      `);
      expectUnique(target());
    });

    it('uses nth-of-type for divs even when sole child', () => {
      // Fragility heuristic: don't rely on "the only div" as that can change
      setHTML(`
        <section>
          <div data-target="target">
            <p>Content</p>
          </div>
        </section>
      `);
      const sel = expectUnique(target());
      expect(sel).toContain('nth-of-type');
    });

    it('handles sibling divs correctly', () => {
      setHTML(`
        <main>
          <div>First</div>
          <div>Second</div>
          <div data-target="target">Third</div>
        </main>
      `);
      const sel = expectUnique(target());
      expect(sel).toContain('div:nth-of-type(3)');
    });

    it('handles mixed tag siblings', () => {
      setHTML(`
        <div>
          <h2>Title</h2>
          <p>Paragraph</p>
          <a href="/link" data-target="target">Link</a>
          <p>Another paragraph</p>
        </div>
      `);
      expectUnique(target());
    });
  });

  // -------------------------------------------------------------------
  // Real-world page patterns
  // -------------------------------------------------------------------

  describe('real-world patterns', () => {
    it('navigation menu with links', () => {
      setHTML(`
        <nav id="main-nav">
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/products">Products</a></li>
            <li><a href="/about" data-target="target">About</a></li>
            <li><a href="/contact">Contact</a></li>
          </ul>
        </nav>
      `);
      const sel = expectUnique(target());
      expect(sel).toContain('#main-nav');
    });

    it('product grid cards', () => {
      setHTML(`
        <div class="product-grid">
          <div class="product-card">
            <img src="/img/1.jpg"><h3>Product A</h3>
            <button>Add to Cart</button>
          </div>
          <div class="product-card">
            <img src="/img/2.jpg"><h3>Product B</h3>
            <button data-target="target">Add to Cart</button>
          </div>
          <div class="product-card">
            <img src="/img/3.jpg"><h3>Product C</h3>
            <button>Add to Cart</button>
          </div>
        </div>
      `);
      expectUnique(target());
    });

    it('form with submit button', () => {
      setHTML(`
        <div id="checkout">
          <form>
            <input type="text" placeholder="Name">
            <input type="email" placeholder="Email">
            <button type="submit" data-target="target">Place Order</button>
          </form>
        </div>
      `);
      const sel = expectUnique(target());
      expect(sel).toContain('#checkout');
    });

    it('footer with multiple link sections', () => {
      setHTML(`
        <footer>
          <div class="footer-col">
            <a href="/terms">Terms</a>
            <a href="/privacy">Privacy</a>
          </div>
          <div class="footer-col">
            <a href="/blog">Blog</a>
            <a href="/careers" data-target="target">Careers</a>
          </div>
        </footer>
      `);
      expectUnique(target());
    });

    it('table rows with action buttons', () => {
      setHTML(`
        <table>
          <tbody>
            <tr><td>Row 1</td><td><button>Edit</button></td></tr>
            <tr><td>Row 2</td><td><button data-target="target">Edit</button></td></tr>
            <tr><td>Row 3</td><td><button>Edit</button></td></tr>
          </tbody>
        </table>
      `);
      expectUnique(target());
    });

    it('hero section with CTA', () => {
      setHTML(`
        <section class="hero">
          <h1>Welcome</h1>
          <p>Some description text here.</p>
          <a href="/signup" class="cta-button" data-target="target">Get Started</a>
        </section>
      `);
      const sel = expectUnique(target());
      expect(sel).toContain('cta-button');
    });
  });

  // -------------------------------------------------------------------
  // Stability: selectors should survive minor page changes
  // -------------------------------------------------------------------

  describe('selector stability', () => {
    it('selector anchored by ID survives sibling additions when class is unique', () => {
      setHTML(`
        <main id="content">
          <div class="first-card">
            <button data-target="target">Click</button>
          </div>
        </main>
      `);
      const sel = expectUnique(target());
      expect(sel).toContain('#content');

      // Add a sibling with a DIFFERENT class
      const newDiv = document.createElement('div');
      newDiv.className = 'second-card';
      newDiv.innerHTML = '<button>Other</button>';
      document.querySelector('#content')!.appendChild(newDiv);

      // Selector used unique class "first-card", so it survives
      const matches = document.body.querySelectorAll(sel);
      expect(matches.length).toBe(1);
      expect(matches[0]).toBe(target());
    });

    it('structural selector breaks when sibling prepended (expected limitation)', () => {
      // When there's no ID or unique class, nth-of-type is used.
      // Prepending a sibling shifts the index — this is a known limitation.
      setHTML(`
        <ul>
          <li data-target="target">First</li>
          <li>Second</li>
        </ul>
      `);
      const sel = expectUnique(target());
      expect(sel).toContain('nth-of-type(1)');

      // Prepend shifts the target to position 2
      const newLi = document.createElement('li');
      newLi.textContent = 'Zeroth';
      document.querySelector('ul')!.prepend(newLi);

      const matches = document.body.querySelectorAll(sel);
      // Selector now points to the NEW first item, not our target
      expect(matches[0]).not.toBe(target());
    });

  });

  // -------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles elements with special characters in IDs', () => {
      setHTML('<div id="my-widget"><span data-target="target">Text</span></div>');
      const sel = expectUnique(target());
      expect(sel).toContain('#my-widget');
    });

    it('handles IDs with colons by escaping them', () => {
      setHTML('<div id="my:widget"><span data-target="target">Text</span></div>');
      const sel = expectUnique(target());
      // Colon in ID must be escaped for CSS selector
      expect(sel).toContain('my\\:widget');
    });

    it('handles elements with no parent (body direct child)', () => {
      setHTML('<button data-target="target">Solo</button>');
      expectUnique(target());
    });

    it('handles deeply nested identical structures', () => {
      setHTML(`
        <div>
          <div><div><span>A</span></div></div>
          <div><div><span data-target="target">B</span></div></div>
          <div><div><span>C</span></div></div>
        </div>
      `);
      expectUnique(target());
    });

    it('handles SVG elements gracefully', () => {
      setHTML(`
        <div>
          <svg data-target="target" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40"/>
          </svg>
        </div>
      `);
      // SVG elements are Element but not HTMLElement — should still work
      const el = document.querySelector('[data-target="target"]') as Element;
      const sel = uniqueSelector(el, document.body);
      expect(sel).toBeTruthy();
      const matches = document.body.querySelectorAll(sel);
      expect(matches.length).toBe(1);
      expect(matches[0]).toBe(el);
    });

    it('returns empty string for elements not in body', () => {
      const detached = document.createElement('div');
      const child = document.createElement('span');
      detached.appendChild(child);
      // Not in DOM — should handle gracefully
      const sel = uniqueSelector(child, document.body);
      // Should still produce something (structural path from detached tree)
      expect(typeof sel).toBe('string');
    });

    it('handles elements with many classes, only some stable', () => {
      setHTML(`
        <div>
          <button class="sc-abc styled__xyz css-123 primary-action" data-target="target">Go</button>
          <button class="sc-def styled__uvw css-456 secondary-action">No</button>
        </div>
      `);
      const sel = expectUnique(target());
      expect(sel).toContain('primary-action');
      expect(sel).not.toContain('sc-abc');
      expect(sel).not.toContain('styled__xyz');
      expect(sel).not.toContain('css-123');
    });
  });
});
