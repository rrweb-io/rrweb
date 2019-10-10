(self.System =
  self.System ||
  (() => {
    const t = {},
      e = {},
      n = t => t.replace(/^.\/(\w+)-[a-f0-9]{8,}.js$/, './$1.js'),
      o = {
        register(r, i) {
          const s = n(
              `./${((document.currentScript || {}).src || '')
                .split('?')
                .shift()
                .split('/')
                .pop()}`,
            ),
            a = {},
            c = i((t, e) => (e ? (a[t] = e) : Object.assign(a, t)), o);
          (t[s] = Promise.all(r.map((t, e) => o.import(n(t)).then(c.setters[e])))
            .then(() => (c.execute(), a))
            .catch(t => {
              throw ((t.message = `evaluating module ${s}: ${t.message}`), t);
            })),
            e[s] && (e[s](t[s]), delete e[s]);
        },
        import: n =>
          t[n] ||
          (t[n] = new Promise((t, o) => {
            const r = setTimeout(() => {
              o(new Error(`could not resolve ${n}`));
            }, 1e4);
            e[n] = e => {
              clearTimeout(r), t(e);
            };
          })),
      };
    return o;
  })()),
  System.register([], function(t, e) {
    'use strict';
    return {
      execute: function() {
        function e(t) {
          return (e =
            'function' == typeof Symbol && 'symbol' == typeof Symbol.iterator
              ? function(t) {
                  return typeof t;
                }
              : function(t) {
                  return t &&
                    'function' == typeof Symbol &&
                    t.constructor === Symbol &&
                    t !== Symbol.prototype
                    ? 'symbol'
                    : typeof t;
                })(t);
        }
        function n(t, n) {
          return !n || ('object' !== e(n) && 'function' != typeof n)
            ? (function(t) {
                if (void 0 === t)
                  throw new ReferenceError(
                    "this hasn't been initialised - super() hasn't been called",
                  );
                return t;
              })(t)
            : n;
        }
        function o(t) {
          var e = 'function' == typeof Map ? new Map() : void 0;
          return (o = function(t) {
            if (null === t || ((n = t), -1 === Function.toString.call(n).indexOf('[native code]')))
              return t;
            var n;
            if ('function' != typeof t)
              throw new TypeError('Super expression must either be null or a function');
            if (void 0 !== e) {
              if (e.has(t)) return e.get(t);
              e.set(t, o);
            }
            function o() {
              return r(t, arguments, s(this).constructor);
            }
            return (
              (o.prototype = Object.create(t.prototype, {
                constructor: { value: o, enumerable: !1, writable: !0, configurable: !0 },
              })),
              i(o, t)
            );
          })(t);
        }
        function r(t, e, n) {
          return (r = (function() {
            if ('undefined' == typeof Reflect || !Reflect.construct) return !1;
            if (Reflect.construct.sham) return !1;
            if ('function' == typeof Proxy) return !0;
            try {
              return Date.prototype.toString.call(Reflect.construct(Date, [], function() {})), !0;
            } catch (t) {
              return !1;
            }
          })()
            ? Reflect.construct
            : function(t, e, n) {
                var o = [null];
                o.push.apply(o, e);
                var r = new (Function.bind.apply(t, o))();
                return n && i(r, n.prototype), r;
              }).apply(null, arguments);
        }
        function i(t, e) {
          return (i =
            Object.setPrototypeOf ||
            function(t, e) {
              return (t.__proto__ = e), t;
            })(t, e);
        }
        function s(t) {
          return (s = Object.setPrototypeOf
            ? Object.getPrototypeOf
            : function(t) {
                return t.__proto__ || Object.getPrototypeOf(t);
              })(t);
        }
        t({
          A: en,
          B: function(t, e, n) {
            return new Promise(function(o, r) {
              window.u2f.register(t, e, n, function(t) {
                t.registrationData ? o(t) : r(new an('Device registration failed', cn(t)));
              });
            });
          },
          C: ze,
          D: function(t) {
            const e = t;
            (e.publicKey.user.id = Ke(e.publicKey.user.id)),
              (e.publicKey.challenge = Ke(e.publicKey.challenge));
            for (const n of e.publicKey.excludeCredentials) n.id = Ke(n.id);
            return e;
          },
          E: function(t) {
            return {
              rawId: Ye(t.rawId),
              response: {
                attestationObject: Ye(t.response.attestationObject),
                clientDataJSON: Ye(t.response.clientDataJSON),
              },
            };
          },
          F: async function(t) {
            const e =
              ((n = t),
              'low' === n || 'medium' === n || 'high' === n || 'two_factor' === n ? n : null);
            var n;
            return (
              dt(e, 'app/assets/modules/github/sudo.js:94'),
              (await on(`/sessions/in_sudo.json?requested_access_level=${e}`)) ||
                (await (async function() {
                  if (rn) return !1;
                  rn = !0;
                  let t = !1;
                  const e = await (async function() {
                      const t = document.body;
                      dt(t, 'app/assets/modules/github/sudo.js:24');
                      const e = l(document, 'link[rel=sudo-modal]', HTMLLinkElement),
                        n = document.querySelector('.js-sudo-prompt');
                      if (n instanceof HTMLTemplateElement) return n;
                      if (e) {
                        const n = await ut(
                          document,
                          (function(t) {
                            const e = new URL(t, window.location.origin),
                              n = new URLSearchParams(e.search.slice(1));
                            return (
                              n.set('webauthn-support', tn()),
                              (e.search = n.toString()),
                              e.toString()
                            );
                          })(e.href),
                        );
                        return (
                          t.appendChild(n), l(document, '.js-sudo-prompt', HTMLTemplateElement)
                        );
                      }
                      throw new Error("couldn't load sudo prompt");
                    })(),
                    n = await Ce({ content: e.content.cloneNode(!0) });
                  return (
                    Te('.js-sudo-form', async function(e, n) {
                      try {
                        await n.text();
                      } catch (o) {
                        if (!o.response) throw o;
                        let t;
                        switch (o.response.status) {
                          case 401:
                            t = 'Incorrect password.';
                            break;
                          case 429:
                            t = 'Too many password attempts. Please wait and try again later.';
                            break;
                          default:
                            t = 'Failed to receive a response. Please try again later.';
                        }
                        return (
                          (l(e, '.js-sudo-error').textContent = t),
                          (l(e, '.js-sudo-error').hidden = !1),
                          void (l(e, '.js-sudo-password', HTMLInputElement).value = '')
                        );
                      }
                      (t = !0), c(e, 'details').removeAttribute('open');
                    }),
                    await new Promise(t => {
                      n.addEventListener(
                        'dialog:remove',
                        function() {
                          (rn = !1), t();
                        },
                        { once: !0 },
                      );
                    }),
                    t
                  );
                })())
            );
          },
          G: function(t, e, n) {
            var o = n || HTMLInputElement,
              r = t.elements.namedItem(e);
            if (r instanceof o) return r;
            throw new a('Element not found by name: <'.concat(o.name, '> ').concat(e));
          },
          H: on,
          I: function(t, e) {
            if ('boolean' == typeof e) {
              if (!(t instanceof HTMLInputElement))
                throw new TypeError('only checkboxes can be set to boolean value');
              t.checked = e;
            } else {
              if ('checkbox' === t.type)
                throw new TypeError("checkbox can't be set to string value");
              t.value = e;
            }
            fe(t, 'change', !1);
          },
          J: function(t, e) {
            return new Promise(function(n, o) {
              !(function r(i) {
                function s(t) {
                  switch (t.status) {
                    case 200:
                      n(t);
                      break;
                    case 202:
                      setTimeout(() => r(1.5 * i), i);
                      break;
                    default:
                      o(new rt(t));
                  }
                }
                lt(t, e).then(function s(r) {
                  switch (r.status) {
                    case 200:
                      n(r);
                      break;
                    case 202:
                      setTimeout(
                        () =>
                          (function r(i) {
                            function s(t) {
                              switch (t.status) {
                                case 200:
                                  n(t);
                                  break;
                                case 202:
                                  setTimeout(() => r(1.5 * i), i);
                                  break;
                                default:
                                  o(new rt(t));
                              }
                            }
                            lt(t, e).then(s, o);
                          })(1.5 * i),
                        i,
                      );
                      break;
                    default:
                      o(new rt(r));
                  }
                }, o);
              })(1e3);
            });
          },
          K: function(t, e) {
            const n = new URL(t, window.location.origin),
              o = e ? Object.assign({}, e) : {},
              r = n.hash.match(/^#csrf-token=([A-Za-z0-9+\/=]+)$/);
            if (!r)
              throw new TypeError('Expected csrfRequest(url) to have an associated #csrf-token');
            n.hash = '';
            const i = n.toString();
            o.mode = 'same-origin';
            const s = new Request(i, o);
            return s.headers.append('Scoped-CSRF-Token', r[1]), s;
          },
          L: fn,
          M: Ft,
          N: Ut,
          O: function(t, e) {
            0 === Object.keys(Yn.children).length && document.addEventListener('keydown', to);
            var n = ((o = e || t.getAttribute('data-hotkey') || ''),
            o.split(',').map(function(t) {
              return t.split(' ');
            })).map(function(e) {
              return Yn.insert(e).add(t);
            });
            var o;
            zn.set(t, n);
          },
          P: function(t) {
            var e = zn.get(t);
            if (e && e.length) {
              var n = !0,
                o = !1,
                r = void 0;
              try {
                for (var i, s = e[Symbol.iterator](); !(n = (i = s.next()).done); n = !0) {
                  var a = i.value;
                  a && a.delete(t);
                }
              } catch (c) {
                (o = !0), (r = c);
              } finally {
                try {
                  n || null == s.return || s.return();
                } finally {
                  if (o) throw r;
                }
              }
            }
            0 === Object.keys(Yn.children).length && document.removeEventListener('keydown', to);
          },
          Q: function(t, e) {
            return 1 === t ? e : e.endsWith('y') ? `${e.substring(0, e.length - 1)}ies` : `${e}s`;
          },
          R: function(t, e = 0, { start: n = !1, middle: o = !1, once: r = !1 } = {}) {
            return eo(t, e, { start: n, middle: o, once: r });
          },
          S: function(t, e) {
            t.removeEventListener('keydown', Be),
              t.removeEventListener('keyup', $e),
              t.removeEventListener('input', Ge);
            const n = We.get(t);
            n && (null != n.timer && n.listener === e && clearTimeout(n.timer), We.delete(t));
          },
          T: me,
          V: function() {
            return Promise.resolve();
          },
          W: ao,
          Y: async function(t, e) {
            const n = bo.get(t);
            n && n.abort();
            return wo(t, e);
          },
          Z: uo,
          _: function(t, e, n) {
            function o(e) {
              e.currentTarget.removeEventListener(t, n),
                e.currentTarget.removeEventListener('blur', o);
            }
            Jt(e, function(e) {
              e.addEventListener(t, n), e.addEventListener('blur', o);
            });
          },
          a$: function(t) {
            const e = t;
            e.publicKey.challenge = Ke(e.publicKey.challenge);
            for (const n of e.publicKey.allowCredentials) n.id = Ke(n.id);
            return e;
          },
          a0: function(t) {
            ye.push(t);
          },
          a1: co,
          a2: function(t, e) {
            const n = t.currentTarget;
            if (
              (dt(n instanceof HTMLAnchorElement, 'app/assets/modules/github/pjax.js:78'),
              0 !== t.button || t.metaKey || t.ctrlKey || t.shiftKey || t.altKey)
            )
              return;
            if (location.protocol !== n.protocol || location.hostname !== n.hostname) return;
            if (n.href.indexOf('#') > -1 && Fo(n) === Fo(location)) return;
            if (t.defaultPrevented) return;
            const o = { url: n.href, container: null, target: n };
            Object.assign(o, e),
              Do(n, 'pjax:click', { options: o, relatedEvent: t }) &&
                (Io(o), t.preventDefault(), Do(n, 'pjax:clicked', { options: o }));
          },
          a3: function(t, e) {
            const n = t.currentTarget;
            dt(n instanceof HTMLFormElement, 'app/assets/modules/github/pjax.js:128');
            const o = {
              type: (n.method || 'GET').toUpperCase(),
              url: n.action,
              container: null,
              target: n,
            };
            if ((Object.assign(o, e), 'GET' === o.type)) {
              if (n.querySelector('input[type=file]')) return;
              dt('string' == typeof o.url, 'app/assets/modules/github/pjax.js:144');
              const t = Uo(o.url);
              (t.search += (t.search ? '&' : '') + me(n)), (o.url = t.toString());
            } else o.data = new FormData(n);
            Io(o), t.preventDefault();
          },
          a4: Mo,
          a6: Kn,
          a7: _o,
          a8: To,
          a9: zo,
          aB: Er,
          aC: br,
          aD: pe,
          aE: async function() {
            (await (async function() {
              const t = document.querySelector('link[rel=sso-session]'),
                e = document.querySelector('meta[name=sso-expires-around]');
              if (!(t instanceof HTMLLinkElement)) return !0;
              if (
                !(function(t) {
                  if (!(t instanceof HTMLMetaElement)) return !0;
                  const e = parseInt(t.content);
                  return new Date().getTime() / 1e3 > e;
                })(e)
              )
                return !0;
              const n = t.href,
                o = await lt(n, { headers: { Accept: 'application/json' } });
              return await o.json();
            })()) ||
              (Ur ||
                (Ur = (async function() {
                  const t = l(document, 'link[rel=sso-modal]', HTMLLinkElement),
                    e = await Ce({ content: ut(document, t.href), dialogClass: 'sso-modal' });
                  let n = null;
                  if (
                    ((window.external.ssoComplete = function(t) {
                      t.error
                        ? Hr((n = !1))
                        : (Hr((n = !0)),
                          (function(t) {
                            const e = document.querySelector('meta[name=sso-expires-around]');
                            e && e.setAttribute('content', t);
                          })(t.expiresAround),
                          window.focus()),
                        (window.external.ssoComplete = null);
                    }),
                    await (function(t) {
                      return new Promise(e => {
                        t.addEventListener('dialog:remove', e, { once: !0 });
                      });
                    })(e),
                    !n)
                  )
                    throw new Error('sso prompt canceled');
                })()
                  .then(Fr)
                  .catch(Fr)),
              await Ur);
          },
          aF: lo,
          aG: go,
          aH: function(t, e) {
            Tr(t), Er(t, e);
          },
          aJ: xe,
          aK: function(t) {
            const e = We.get(t);
            e && e.listener.call(null, t);
          },
          aL: async function(t, e) {
            if (bo.get(t)) return;
            const n = new XMLHttpRequest(),
              o = d(t, 'data-url'),
              r = t.hasAttribute('data-retain-focus');
            n.open('GET', o),
              n.setRequestHeader('Accept', 'text/html'),
              n.setRequestHeader('X-Requested-With', 'XMLHttpRequest'),
              null != e && n.setRequestHeader('X-Request-Purpose', e);
            bo.set(t, n);
            try {
              const e = await (function(t, e) {
                return new Promise((n, o) => {
                  (t.onload = () => {
                    200 === t.status
                      ? n(t.responseText)
                      : o(new Error(`XMLHttpRequest ${t.statusText}`));
                  }),
                    (t.onerror = o),
                    t.send(e || null);
                });
              })(n);
              if (lo(t, r)) throw new Error('element had interactions');
              return wo(t, e, r);
            } catch (i) {
              'XMLHttpRequest abort' !== i.message &&
                console.warn('Failed to update content', t, i);
            } finally {
              bo.delete(t);
            }
          },
          aM: Rr,
          aN: function() {
            const t = Qt[oe() - 1];
            if (t) return t.url;
          },
          aO: function() {
            const t = Qt[oe() + 1];
            if (t) return t.url;
          },
          aP: function(t, e) {
            const n = t.closest('[data-pjax-container]');
            if (!n)
              throw new Error(
                `no pjax container for ${(function(t) {
                  const e = [];
                  let n = t;
                  for (; n && (e.push(xo(n)), 9 !== n.nodeType && !n.id); ) n = n.parentNode;
                  return e.reverse().join(' > ');
                })(t)}`,
              );
            const o = Vo(n),
              r = Uo(t.href);
            return (
              (r.search += `${r.search ? '&' : ''}_pjax=${encodeURIComponent(o)}`),
              lt(r.href, {
                headers: Object.assign(
                  { Accept: 'text/html', 'X-PJAX': 'true', 'X-PJAX-Container': o },
                  e && e.headers,
                ),
              })
            );
          },
          aQ: function(t, e) {
            ko.set(t, e), (n = e), n.catch(() => {});
            var n;
          },
          aR: se,
          aS: Wr,
          aT: function(t) {
            return $r.get(t);
          },
          aU: function(t) {
            const e = Sr();
            e && yr.push(e);
            br(t);
          },
          aV: function(t) {
            wr(t), Tr(t);
            const e = yr.pop();
            e && br(e);
          },
          aW: function(t) {
            const e = t.getAttribute('data-details-container') || '.js-details-container',
              n = c(t, e).classList;
            return n.contains('Details--on') || n.contains('open');
          },
          aX: tn,
          aY: function() {
            return (Je() && Qe()) || nn();
          },
          aZ: nn,
          a_: function(t, e, n) {
            return new Promise(function(o, r) {
              window.u2f.sign(t, e, n, function(t) {
                t.keyHandle ? o(t) : r(new an('Signing request failed', cn(t)));
              });
            });
          },
          aa: function() {
            return Co;
          },
          ab: no,
          ac: de,
          ad: function(t) {
            const e = t.split('‍');
            let n = 0;
            for (const o of e) {
              const t = Array.from(o.split(/[\ufe00-\ufe0f]/).join('')).length;
              n += t;
            }
            return n / e.length;
          },
          ae: vo,
          af: eo,
          ag: function(t) {
            return lt(t.action, { method: t.method, body: new FormData(t) });
          },
          ah: function(t, e) {
            for (const n in e) {
              const o = e[n],
                r = t.elements.namedItem(n);
              r instanceof HTMLInputElement
                ? (r.value = o)
                : r instanceof HTMLTextAreaElement && (r.value = o);
            }
          },
          ai: tr,
          aj: Eo,
          ak: ee,
          al: function(t, e) {
            const n = window[window.GoogleAnalyticsObject || 'ga'];
            'function' == typeof n && n('provide', t, e);
          },
          am: function(t) {
            window.ga('set', { location: t });
          },
          an: function(t) {
            window.ga('set', { title: t });
          },
          ao: function(t, e) {
            window.ga('set', t, e);
          },
          ap: function(t, e = {}) {
            (e.page = t), window.ga('send', 'pageview', e);
          },
          aq: function(t, e, n = {}) {
            window.ga('create', t, e, n),
              window.ga('set', 'transport', 'sendBeacon' in window.navigator ? 'beacon' : 'xhr');
          },
          ar: function(t, e = {}) {
            window.ga(() => {
              window.ga('require', t, e);
            });
          },
          as: function(t) {
            void 0 === t.interactive && (t.interactive = !0);
            window.ga('send', 'event', t.category, t.action, t.label, t.value, {
              nonInteraction: !t.interactive,
            });
          },
          au: Tr,
          av: Nr,
          aw: function(t) {
            let e = t;
            'string' == typeof e && (e = e.replace(/,/g, ''));
            return parseFloat(e);
          },
          ax: function(t) {
            return `${t}`.replace(
              /(^|[^\w.])(\d{4,})/g,
              (t, e, n) => e + n.replace(/\d(?=(?:\d\d\d)+(?!\d))/g, '$&,'),
            );
          },
          ay: function(t, e) {
            const n = 1 === t ? 'data-singular-string' : 'data-plural-string',
              o = e.getAttribute(n);
            if (null == o) return;
            e.textContent = o;
          },
          az: function(t, e) {
            const n = t.selectionEnd,
              o = t.value.substring(0, n),
              r = t.value.substring(n),
              i = '' === t.value || o.match(/\n$/) ? '' : '\n';
            (t.value = o + i + e + r),
              (t.selectionStart = n + e.length),
              (t.selectionEnd = n + e.length),
              Jo(t),
              t.focus();
          },
          b: l,
          b0: function(t) {
            return {
              id: Ye(t.rawId),
              response: {
                authenticatorData: Ye(t.response.authenticatorData),
                clientDataJSON: Ye(t.response.clientDataJSON),
                signature: Ye(t.response.signature),
                userHandle: Ye(t.response.userHandle),
              },
            };
          },
          b1: function(t, e, n) {
            let o = t.value.substring(0, t.selectionEnd),
              r = t.value.substring(t.selectionEnd);
            (o = o.replace(e, n)),
              (r = r.replace(e, n)),
              (t.value = o + r),
              (t.selectionStart = o.length),
              (t.selectionEnd = o.length),
              Jo(t);
          },
          b2: wr,
          b3: ue,
          b4: function(t) {
            Ee.push(t);
          },
          b5: oo,
          b6: ir,
          b7: un,
          b9: dn,
          ba: async function(t) {
            return (
              $r.get(t) ||
              Gr(
                await ((e = t),
                (n = 'codeEditor:ready'),
                new Promise(t => {
                  e.addEventListener(n, t, { once: !0 });
                })),
              )
            );
            var e, n;
          },
          bb: hn,
          bc: function(t) {
            const e = t.getBoundingClientRect();
            return { top: e.top + window.pageYOffset, left: e.left + window.pageXOffset };
          },
          bd: function() {
            return new Promise(window.requestAnimationFrame);
          },
          be: Kr,
          c: function(
            t,
            e,
            n = function(t) {
              let e = f.get(t.type);
              void 0 === e && ((e = new Map()), f.set(t.type, e));
              let n = e.get(t.strings);
              void 0 === n && ((n = new E(t, t.getTemplateElement())), e.set(t.strings, n));
              return n;
            },
          ) {
            const o = n(t);
            let r = e.__templateInstance;
            if (void 0 !== r && r.template === o && r._partCallback === t.partCallback)
              return void r.update(t.values);
            (r = new C(o, t.partCallback, n)), (e.__templateInstance = r);
            const i = r._clone();
            r.update(t.values), j(e, e.firstChild), e.appendChild(i);
          },
          d: tt,
          e: Ht,
          g: c,
          h: et,
          i: d,
          j: lt,
          k: Bt,
          l: function(t) {
            const e = t.getAttribute('data-hydro-view'),
              n = t.getAttribute('data-hydro-view-hmac'),
              o = t.getAttribute('data-hydro-client-context');
            Bt({ hydroEventPayload: e, hydroEventHmac: n, hydroClientContext: o }, !0);
          },
          m: ut,
          n: Jt,
          o: function(t, e) {
            function n(t) {
              t.currentTarget.removeEventListener('input', e),
                t.currentTarget.removeEventListener('blur', n);
            }
            Jt(t, function(t) {
              t.addEventListener('input', e), t.addEventListener('blur', n);
            });
          },
          p: he,
          q: ae,
          r: Te,
          s: function(t, e) {
            const n = {
              id: ke++,
              selector: t,
              in: e,
              out: null,
              elements: [],
              checkPending: !1,
              scrollHandler() {
                !(function(t) {
                  if (!document.hasFocus()) return;
                  if (window.scrollY === Le) return;
                  if (((Le = window.scrollY), t.checkPending)) return;
                  (t.checkPending = !0),
                    window.requestAnimationFrame(() => {
                      (t.checkPending = !1), Ae(t);
                    });
                })(n);
              },
            };
            Ht(t, {
              add(t) {
                !(async function(t, e) {
                  e.elements.push(t),
                    1 === e.elements.length &&
                      (window.addEventListener('scroll', e.scrollHandler, {
                        capture: !0,
                        passive: !0,
                      }),
                      await xe(document),
                      Ae(e));
                })(t, n);
              },
              remove(t) {
                !(function(t, e) {
                  const n = e.elements.indexOf(t);
                  -1 !== n && e.elements.splice(n, 1);
                  0 === e.elements.length &&
                    window.removeEventListener('scroll', e.scrollHandler, {
                      capture: !0,
                      passive: !0,
                    });
                })(t, n);
              },
            });
          },
          t: async function(t, e) {
            const n = at(t, e),
              o = await ct(n, e && e.signal),
              r = new rt(o);
            return st(o, r), o.text();
          },
          u: u,
          v: Ce,
          w: ot,
          y: function(t, e, n = {}) {
            We.set(t, {
              keypressed: !1,
              inputed: !1,
              timer: void 0,
              listener: e,
              wait: null != n.wait ? n.wait : 100,
            }),
              t.addEventListener('keydown', Be),
              t.addEventListener('keyup', $e),
              t.addEventListener('input', Ge);
          },
          z: function() {
            return (Je() && Qe()) || en();
          },
        });
        var a = (function(t) {
          function e(t) {
            var o;
            return (
              (function(t, e) {
                if (!(t instanceof e)) throw new TypeError('Cannot call a class as a function');
              })(this, e),
              ((o = n(this, s(e).call(this, t))).name = 'QueryError'),
              (o.framesToPop = 1),
              o
            );
          }
          return (
            (function(t, e) {
              if ('function' != typeof e && null !== e)
                throw new TypeError('Super expression must either be null or a function');
              (t.prototype = Object.create(e && e.prototype, {
                constructor: { value: t, writable: !0, configurable: !0 },
              })),
                e && i(t, e);
            })(e, o(Error)),
            e
          );
        })();
        function c(t, e, n) {
          var o = n || HTMLElement,
            r = t.closest(e);
          if (r instanceof o) return r;
          throw new a('Element not found: <'.concat(o.name, '> ').concat(e));
        }
        function l(t, e, n) {
          var o = n || HTMLElement,
            r = t.querySelector(e);
          if (r instanceof o) return r;
          throw new a('Element not found: <'.concat(o.name, '> ').concat(e));
        }
        function u(t, e, n) {
          var o = n || HTMLElement,
            r = [],
            i = !0,
            s = !1,
            a = void 0;
          try {
            for (
              var c, l = t.querySelectorAll(e)[Symbol.iterator]();
              !(i = (c = l.next()).done);
              i = !0
            ) {
              var u = c.value;
              u instanceof o && r.push(u);
            }
          } catch (d) {
            (s = !0), (a = d);
          } finally {
            try {
              i || null == l.return || l.return();
            } finally {
              if (s) throw a;
            }
          }
          return r;
        }
        function d(t, e) {
          var n = t.getAttribute(e);
          if (null != n) return n;
          throw new a('Attribute not found on element: '.concat(e));
        }
        const f = new Map();
        t('a', (t, ...e) => new h(t, e, 'html'));
        class h {
          constructor(t, e, n, o = A) {
            (this.strings = t), (this.values = e), (this.type = n), (this.partCallback = o);
          }
          getHTML() {
            const t = this.strings.length - 1;
            let e = '',
              n = !0;
            for (let o = 0; o < t; o++) {
              const t = this.strings[o];
              e += t;
              const r = b(t);
              e += (n = r > -1 ? r < t.length : n) ? m : p;
            }
            return (e += this.strings[t]);
          }
          getTemplateElement() {
            const t = document.createElement('template');
            return (t.innerHTML = this.getHTML()), t;
          }
        }
        const p = `{{lit-${String(Math.random()).slice(2)}}}`,
          m = `\x3c!--${p}--\x3e`,
          g = new RegExp(`${p}|${m}`),
          v = /[ \x09\x0a\x0c\x0d]([^\0-\x1F\x7F-\x9F \x09\x0a\x0c\x0d"'>=\/]+)[ \x09\x0a\x0c\x0d]*=[ \x09\x0a\x0c\x0d]*(?:[^ \x09\x0a\x0c\x0d"'`<>=]*|"[^"]*|'[^']*)$/;
        function b(t) {
          const e = t.lastIndexOf('>');
          return t.indexOf('<', e + 1) > -1 ? t.length : e;
        }
        class w {
          constructor(t, e, n, o, r) {
            (this.type = t),
              (this.index = e),
              (this.name = n),
              (this.rawName = o),
              (this.strings = r);
          }
        }
        const y = t => -1 !== t.index;
        class E {
          constructor(t, e) {
            (this.parts = []), (this.element = e);
            const n = this.element.content,
              o = document.createTreeWalker(n, 133, null, !1);
            let r = -1,
              i = 0;
            const s = [];
            let a, c;
            for (; o.nextNode(); ) {
              r++, (a = c);
              const e = (c = o.currentNode);
              if (1 === e.nodeType) {
                if (!e.hasAttributes()) continue;
                const n = e.attributes;
                let o = 0;
                for (let t = 0; t < n.length; t++) n[t].value.indexOf(p) >= 0 && o++;
                for (; o-- > 0; ) {
                  const o = t.strings[i],
                    s = v.exec(o)[1],
                    a = n.getNamedItem(s),
                    c = a.value.split(g);
                  this.parts.push(new w('attribute', r, a.name, s, c)),
                    e.removeAttribute(a.name),
                    (i += c.length - 1);
                }
              } else if (3 === e.nodeType) {
                const t = e.nodeValue;
                if (t.indexOf(p) < 0) continue;
                const n = e.parentNode,
                  o = t.split(g),
                  a = o.length - 1;
                i += a;
                for (let i = 0; i < a; i++)
                  n.insertBefore(
                    '' === o[i] ? document.createComment('') : document.createTextNode(o[i]),
                    e,
                  ),
                    this.parts.push(new w('node', r++));
                n.insertBefore(
                  '' === o[a] ? document.createComment('') : document.createTextNode(o[a]),
                  e,
                ),
                  s.push(e);
              } else if (8 === e.nodeType && e.nodeValue === p) {
                const t = e.parentNode,
                  n = e.previousSibling;
                null === n || n !== a || n.nodeType !== Node.TEXT_NODE
                  ? t.insertBefore(document.createComment(''), e)
                  : r--,
                  this.parts.push(new w('node', r++)),
                  s.push(e),
                  null === e.nextSibling ? t.insertBefore(document.createComment(''), e) : r--,
                  (c = a),
                  i++;
              }
            }
            for (const l of s) l.parentNode.removeChild(l);
          }
        }
        const T = (t, e) => (_(e) ? ((e = e(t)), x) : null === e ? void 0 : e),
          _ = t => 'function' == typeof t && !0 === t.__litDirective,
          x = {},
          k = t => null === t || !('object' == typeof t || 'function' == typeof t);
        class L {
          constructor(t, e, n, o) {
            (this.instance = t),
              (this.element = e),
              (this.name = n),
              (this.strings = o),
              (this.size = o.length - 1),
              (this._previousValues = []);
          }
          _interpolate(t, e) {
            const n = this.strings,
              o = n.length - 1;
            let r = '';
            for (let i = 0; i < o; i++) {
              r += n[i];
              const o = T(this, t[e + i]);
              if (
                o &&
                o !== x &&
                (Array.isArray(o) || ('string' != typeof o && o[Symbol.iterator]))
              )
                for (const t of o) r += t;
              else r += o;
            }
            return r + n[o];
          }
          _equalToPreviousValues(t, e) {
            for (let n = e; n < e + this.size; n++)
              if (this._previousValues[n] !== t[n] || !k(t[n])) return !1;
            return !0;
          }
          setValue(t, e) {
            if (this._equalToPreviousValues(t, e)) return;
            const n = this.strings;
            let o;
            2 === n.length && '' === n[0] && '' === n[1]
              ? ((o = T(this, t[e])), Array.isArray(o) && (o = o.join('')))
              : (o = this._interpolate(t, e)),
              o !== x && this.element.setAttribute(this.name, o),
              (this._previousValues = t);
          }
        }
        class S {
          constructor(t, e, n) {
            (this.instance = t),
              (this.startNode = e),
              (this.endNode = n),
              (this._previousValue = void 0);
          }
          setValue(t) {
            if ((t = T(this, t)) !== x)
              if (k(t)) {
                if (t === this._previousValue) return;
                this._setText(t);
              } else
                t instanceof h
                  ? this._setTemplateResult(t)
                  : Array.isArray(t) || t[Symbol.iterator]
                  ? this._setIterable(t)
                  : t instanceof Node
                  ? this._setNode(t)
                  : void 0 !== t.then
                  ? this._setPromise(t)
                  : this._setText(t);
          }
          _insert(t) {
            this.endNode.parentNode.insertBefore(t, this.endNode);
          }
          _setNode(t) {
            this._previousValue !== t && (this.clear(), this._insert(t), (this._previousValue = t));
          }
          _setText(t) {
            const e = this.startNode.nextSibling;
            (t = void 0 === t ? '' : t),
              e === this.endNode.previousSibling && e.nodeType === Node.TEXT_NODE
                ? (e.textContent = t)
                : this._setNode(document.createTextNode(t)),
              (this._previousValue = t);
          }
          _setTemplateResult(t) {
            const e = this.instance._getTemplate(t);
            let n;
            this._previousValue && this._previousValue.template === e
              ? (n = this._previousValue)
              : ((n = new C(e, this.instance._partCallback, this.instance._getTemplate)),
                this._setNode(n._clone()),
                (this._previousValue = n)),
              n.update(t.values);
          }
          _setIterable(t) {
            Array.isArray(this._previousValue) || (this.clear(), (this._previousValue = []));
            const e = this._previousValue;
            let n = 0;
            for (const o of t) {
              let t = e[n];
              if (void 0 === t) {
                let o = this.startNode;
                if (n > 0) {
                  (o = e[n - 1].endNode = document.createTextNode('')), this._insert(o);
                }
                (t = new S(this.instance, o, this.endNode)), e.push(t);
              }
              t.setValue(o), n++;
            }
            if (0 === n) this.clear(), (this._previousValue = void 0);
            else if (n < e.length) {
              const t = e[n - 1];
              (e.length = n), this.clear(t.endNode.previousSibling), (t.endNode = this.endNode);
            }
          }
          _setPromise(t) {
            (this._previousValue = t),
              t.then(e => {
                this._previousValue === t && this.setValue(e);
              });
          }
          clear(t = this.startNode) {
            j(this.startNode.parentNode, t.nextSibling, this.endNode);
          }
        }
        const A = (t, e, n) => {
          if ('attribute' === e.type) return new L(t, n, e.name, e.strings);
          if ('node' === e.type) return new S(t, n, n.nextSibling);
          throw new Error(`Unknown part type ${e.type}`);
        };
        class C {
          constructor(t, e, n) {
            (this._parts = []),
              (this.template = t),
              (this._partCallback = e),
              (this._getTemplate = n);
          }
          update(t) {
            let e = 0;
            for (const n of this._parts)
              n
                ? void 0 === n.size
                  ? (n.setValue(t[e]), e++)
                  : (n.setValue(t, e), (e += n.size))
                : e++;
          }
          _clone() {
            const t = this.template.element.content.cloneNode(!0),
              e = this.template.parts;
            if (e.length > 0) {
              const n = document.createTreeWalker(t, 133, null, !1);
              let o = -1;
              for (let t = 0; t < e.length; t++) {
                const r = e[t],
                  i = y(r);
                if (i) for (; o < r.index; ) o++, n.nextNode();
                this._parts.push(i ? this._partCallback(this, r, n.currentNode) : void 0);
              }
            }
            return t;
          }
        }
        const j = (t, e, n = null) => {
          let o = e;
          for (; o !== n; ) {
            const e = o.nextSibling;
            t.removeChild(o), (o = e);
          }
        };
        function D() {
          if (!(this instanceof D)) return new D();
          (this.size = 0),
            (this.uid = 0),
            (this.selectors = []),
            (this.indexes = Object.create(this.indexes)),
            (this.activeIndexes = []);
        }
        var M = window.document.documentElement,
          I =
            M.matches ||
            M.webkitMatchesSelector ||
            M.mozMatchesSelector ||
            M.oMatchesSelector ||
            M.msMatchesSelector;
        (D.prototype.matchesSelector = function(t, e) {
          return I.call(t, e);
        }),
          (D.prototype.querySelectorAll = function(t, e) {
            return e.querySelectorAll(t);
          }),
          (D.prototype.indexes = []);
        var O = /^#((?:[\w\u00c0-\uFFFF\-]|\\.)+)/g;
        D.prototype.indexes.push({
          name: 'ID',
          selector: function(t) {
            var e;
            if ((e = t.match(O))) return e[0].slice(1);
          },
          element: function(t) {
            if (t.id) return [t.id];
          },
        });
        var P = /^\.((?:[\w\u00c0-\uFFFF\-]|\\.)+)/g;
        D.prototype.indexes.push({
          name: 'CLASS',
          selector: function(t) {
            var e;
            if ((e = t.match(P))) return e[0].slice(1);
          },
          element: function(t) {
            var e = t.className;
            if (e) {
              if ('string' == typeof e) return e.split(/\s/);
              if ('object' == typeof e && 'baseVal' in e) return e.baseVal.split(/\s/);
            }
          },
        });
        var N,
          R = /^((?:[\w\u00c0-\uFFFF\-]|\\.)+)/g;
        D.prototype.indexes.push({
          name: 'TAG',
          selector: function(t) {
            var e;
            if ((e = t.match(R))) return e[0].toUpperCase();
          },
          element: function(t) {
            return [t.nodeName.toUpperCase()];
          },
        }),
          (D.prototype.indexes.default = {
            name: 'UNIVERSAL',
            selector: function() {
              return !0;
            },
            element: function() {
              return [!0];
            },
          }),
          (N =
            'function' == typeof window.Map
              ? window.Map
              : (function() {
                  function t() {
                    this.map = {};
                  }
                  return (
                    (t.prototype.get = function(t) {
                      return this.map[t + ' '];
                    }),
                    (t.prototype.set = function(t, e) {
                      this.map[t + ' '] = e;
                    }),
                    t
                  );
                })());
        var q = /((?:\((?:\([^()]+\)|[^()]+)+\)|\[(?:\[[^\[\]]*\]|['"][^'"]*['"]|[^\[\]'"]+)+\]|\\.|[^ >+~,(\[\\]+)+|[>+~])(\s*,\s*)?((?:.|\r|\n)*)/g;
        function H(t, e) {
          var n,
            o,
            r,
            i,
            s,
            a,
            c = (t = t.slice(0).concat(t.default)).length,
            l = e,
            u = [];
          do {
            if ((q.exec(''), (r = q.exec(l)) && ((l = r[3]), r[2] || !l)))
              for (n = 0; n < c; n++)
                if ((s = (a = t[n]).selector(r[1]))) {
                  for (o = u.length, i = !1; o--; )
                    if (u[o].index === a && u[o].key === s) {
                      i = !0;
                      break;
                    }
                  i || u.push({ index: a, key: s });
                  break;
                }
          } while (r);
          return u;
        }
        function U(t, e) {
          var n, o, r;
          for (n = 0, o = t.length; n < o; n++) if (((r = t[n]), e.isPrototypeOf(r))) return r;
        }
        function F(t, e) {
          return t.id - e.id;
        }
        (D.prototype.logDefaultIndexUsed = function() {}),
          (D.prototype.add = function(t, e) {
            var n,
              o,
              r,
              i,
              s,
              a,
              c,
              l,
              u = this.activeIndexes,
              d = this.selectors;
            if ('string' == typeof t) {
              for (
                n = { id: this.uid++, selector: t, data: e }, c = H(this.indexes, t), o = 0;
                o < c.length;
                o++
              )
                (i = (l = c[o]).key),
                  (s = U(u, (r = l.index))) || (((s = Object.create(r)).map = new N()), u.push(s)),
                  r === this.indexes.default && this.logDefaultIndexUsed(n),
                  (a = s.map.get(i)) || ((a = []), s.map.set(i, a)),
                  a.push(n);
              this.size++, d.push(t);
            }
          }),
          (D.prototype.remove = function(t, e) {
            if ('string' == typeof t) {
              var n,
                o,
                r,
                i,
                s,
                a,
                c,
                l,
                u = this.activeIndexes,
                d = {},
                f = 1 === arguments.length;
              for (n = H(this.indexes, t), r = 0; r < n.length; r++)
                for (o = n[r], i = u.length; i--; )
                  if (((a = u[i]), o.index.isPrototypeOf(a))) {
                    if ((c = a.map.get(o.key)))
                      for (s = c.length; s--; )
                        (l = c[s]).selector !== t ||
                          (!f && l.data !== e) ||
                          (c.splice(s, 1), (d[l.id] = !0));
                    break;
                  }
              this.size -= Object.keys(d).length;
            }
          }),
          (D.prototype.queryAll = function(t) {
            if (!this.selectors.length) return [];
            var e,
              n,
              o,
              r,
              i,
              s,
              a,
              c,
              l = {},
              u = [],
              d = this.querySelectorAll(this.selectors.join(', '), t);
            for (e = 0, o = d.length; e < o; e++)
              for (i = d[e], n = 0, r = (s = this.matches(i)).length; n < r; n++)
                l[(c = s[n]).id]
                  ? (a = l[c.id])
                  : ((a = { id: c.id, selector: c.selector, data: c.data, elements: [] }),
                    (l[c.id] = a),
                    u.push(a)),
                  a.elements.push(i);
            return u.sort(F);
          }),
          (D.prototype.matches = function(t) {
            if (!t) return [];
            var e,
              n,
              o,
              r,
              i,
              s,
              a,
              c,
              l,
              u,
              d,
              f = this.activeIndexes,
              h = {},
              p = [];
            for (e = 0, r = f.length; e < r; e++)
              if ((c = (a = f[e]).element(t)))
                for (n = 0, i = c.length; n < i; n++)
                  if ((l = a.map.get(c[n])))
                    for (o = 0, s = l.length; o < s; o++)
                      !h[(d = (u = l[o]).id)] &&
                        this.matchesSelector(t, u.selector) &&
                        ((h[d] = !0), p.push(u));
            return p.sort(F);
          });
        var V = {},
          W = {},
          X = new WeakMap(),
          B = new WeakMap(),
          $ = new WeakMap(),
          G = Object.getOwnPropertyDescriptor(Event.prototype, 'currentTarget');
        function K(t, e, n) {
          var o = t[e];
          return (
            (t[e] = function() {
              return n.apply(t, arguments), o.apply(t, arguments);
            }),
            t
          );
        }
        function Y() {
          X.set(this, !0);
        }
        function z() {
          X.set(this, !0), B.set(this, !0);
        }
        function J() {
          return $.get(this) || null;
        }
        function Q(t, e) {
          G &&
            Object.defineProperty(t, 'currentTarget', {
              configurable: !0,
              enumerable: !0,
              get: e || G.get,
            });
        }
        function Z(t) {
          var e = (1 === t.eventPhase ? W : V)[t.type];
          if (e) {
            var n = (function(t, e, n) {
              var o = [],
                r = e;
              do {
                if (1 !== r.nodeType) break;
                var i = t.matches(r);
                if (i.length) {
                  var s = { node: r, observers: i };
                  n ? o.unshift(s) : o.push(s);
                }
              } while ((r = r.parentElement));
              return o;
            })(e, t.target, 1 === t.eventPhase);
            if (n.length) {
              K(t, 'stopPropagation', Y), K(t, 'stopImmediatePropagation', z), Q(t, J);
              for (var o = 0, r = n.length; o < r && !X.get(t); o++) {
                var i = n[o];
                $.set(t, i.node);
                for (var s = 0, a = i.observers.length; s < a && !B.get(t); s++)
                  i.observers[s].data.call(i.node, t);
              }
              $.delete(t), Q(t);
            }
          }
        }
        function tt(t, e, n) {
          var o = !!(arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : {}).capture,
            r = o ? W : V,
            i = r[t];
          i || ((i = new D()), (r[t] = i), document.addEventListener(t, Z, o)), i.add(e, n);
        }
        function et(t, e, n) {
          return t.dispatchEvent(new CustomEvent(e, { bubbles: !0, cancelable: !0, detail: n }));
        }
        class nt extends Error {
          constructor(t, e) {
            super(`${t} for HTTP ${e.status}`), (this.response = e);
          }
        }
        function ot(t, e) {
          const n = t.createElement('template');
          return (n.innerHTML = e), t.importNode(n.content, !0);
        }
        class rt extends Error {
          constructor(t) {
            super(), (this.response = t), (this.framesToPop = 1);
          }
        }
        const it = window.AbortError || class extends Error {};
        function st(t, e) {
          if (t.status >= 200 && t.status < 300) return t;
          {
            const n = t.statusText ? ` ${t.statusText}` : '';
            throw ((e.message = `HTTP ${t.status}${n}`), e);
          }
        }
        function at(t, e) {
          const n = e ? Object.assign({}, e) : {};
          n.credentials || (n.credentials = 'same-origin');
          const o = new Request(t, n);
          if ((o.headers.append('X-Requested-With', 'XMLHttpRequest'), /#csrf-token=/.test(o.url)))
            throw new TypeError(
              'URL with encoded CSRF token was passed to fetch() without using the csrfRequest(url) helper',
            );
          return o;
        }
        async function ct(t, e) {
          const n = await self.fetch(t);
          if (e && e.aborted) throw new it('The operation was aborted');
          return n;
        }
        async function lt(t, e) {
          const n = at(t, e),
            o = await ct(n, e && e.signal);
          return st(o, new rt(o)), o;
        }
        async function ut(t, e, n) {
          const o = at(e, n),
            r = await ct(o, n && n.signal);
          return (
            st(r, new rt(r)),
            (function(t, e) {
              const n = e.headers.get('content-type') || '';
              if (!n.startsWith('text/html'))
                throw new nt(`expected response with text/html, but was ${n}`, e);
              const o = e.headers.get('x-html-safe');
              if (!o) throw new nt('missing X-HTML-Safe nonce', e);
              if (o !== t) throw new nt('response X-HTML-Safe nonce did not match', e);
            })(
              (function(t) {
                const e = t.querySelector('meta[name=html-safe-nonce]');
                if (null == e || !(e instanceof HTMLMetaElement))
                  throw new Error('could not find html-safe-nonce on document');
                const n = e.content;
                if (n) return n;
                throw new Error('could not find html-safe-nonce on document');
              })(t),
              r,
            ),
            ot(t, await r.text())
          );
        }
        var dt = function(t, e, n, o, r, i, s, a) {
          if (!t) {
            var c;
            if (void 0 === e)
              c = new Error(
                'Minified exception occurred; use the non-minified dev environment for the full error message and additional helpful warnings.',
              );
            else {
              var l = [n, o, r, i, s, a],
                u = 0;
              (c = new Error(
                e.replace(/%s/g, function() {
                  return l[u++];
                }),
              )).name = 'Invariant Violation';
            }
            throw ((c.framesToPop = 1), c);
          }
        };
        t('f', dt);
        var ft = null,
          ht = null,
          pt = [];
        function mt(t, e) {
          var n = [];
          function o() {
            var t = n;
            (n = []), e(t);
          }
          return function() {
            for (var e = arguments.length, r = Array(e), i = 0; i < e; i++) r[i] = arguments[i];
            n.push(r), 1 === n.length && gt(t, o);
          };
        }
        function gt(t, e) {
          ht || (ht = new MutationObserver(vt)),
            ft || ((ft = t.createElement('div')), ht.observe(ft, { attributes: !0 })),
            pt.push(e),
            ft.setAttribute('data-twiddle', '' + Date.now());
        }
        function vt() {
          var t = pt;
          pt = [];
          for (var e = 0; e < t.length; e++)
            try {
              t[e]();
            } catch (n) {
              setTimeout(function() {
                throw n;
              }, 0);
            }
        }
        var bt = new WeakMap(),
          wt = new WeakMap(),
          yt = new WeakMap(),
          Et = new WeakMap();
        function Tt(t, e) {
          for (var n = 0; n < e.length; n++) {
            var o = e[n],
              r = o[0],
              i = o[1],
              s = o[2];
            r === At ? (_t(s, i), xt(s, i)) : r === Ct ? kt(s, i) : r === jt && Lt(t.observers, i);
          }
        }
        function _t(t, e) {
          if (e instanceof t.elementConstructor) {
            var n = bt.get(e);
            if ((n || ((n = []), bt.set(e, n)), -1 === n.indexOf(t.id))) {
              var o = void 0;
              if ((t.initialize && (o = t.initialize.call(void 0, e)), o)) {
                var r = wt.get(e);
                r || ((r = {}), wt.set(e, r)), (r['' + t.id] = o);
              }
              n.push(t.id);
            }
          }
        }
        function xt(t, e) {
          if (e instanceof t.elementConstructor) {
            var n = Et.get(e);
            if ((n || ((n = []), Et.set(e, n)), -1 === n.indexOf(t.id))) {
              t.elements.push(e);
              var o = wt.get(e),
                r = o ? o['' + t.id] : null;
              if ((r && r.add && r.add.call(void 0, e), t.subscribe)) {
                var i = t.subscribe.call(void 0, e);
                if (i) {
                  var s = yt.get(e);
                  s || ((s = {}), yt.set(e, s)), (s['' + t.id] = i);
                }
              }
              t.add && t.add.call(void 0, e), n.push(t.id);
            }
          }
        }
        function kt(t, e) {
          if (e instanceof t.elementConstructor) {
            var n = Et.get(e);
            if (n) {
              var o = t.elements.indexOf(e);
              if ((-1 !== o && t.elements.splice(o, 1), -1 !== (o = n.indexOf(t.id)))) {
                var r = wt.get(e),
                  i = r ? r['' + t.id] : null;
                if ((i && i.remove && i.remove.call(void 0, e), t.subscribe)) {
                  var s = yt.get(e),
                    a = s ? s['' + t.id] : null;
                  a && a.unsubscribe && a.unsubscribe();
                }
                t.remove && t.remove.call(void 0, e), n.splice(o, 1);
              }
              0 === n.length && Et.delete(e);
            }
          }
        }
        function Lt(t, e) {
          var n = Et.get(e);
          if (n) {
            for (var o = n.slice(0), r = 0; r < o.length; r++) {
              var i = t[o[r]];
              if (i) {
                var s = i.elements.indexOf(e);
                -1 !== s && i.elements.splice(s, 1);
                var a = wt.get(e),
                  c = a ? a['' + i.id] : null;
                c && c.remove && c.remove.call(void 0, e);
                var l = yt.get(e),
                  u = l ? l['' + i.id] : null;
                u && u.unsubscribe && u.unsubscribe(), i.remove && i.remove.call(void 0, e);
              }
            }
            Et.delete(e);
          }
        }
        var St = null;
        var At = 1,
          Ct = 2,
          jt = 3;
        function Dt(t, e, n) {
          for (var o = 0; o < n.length; o++) {
            var r = n[o];
            'childList' === r.type
              ? (Mt(t, e, r.addedNodes), It(t, e, r.removedNodes))
              : 'attributes' === r.type && Ot(t, e, r.target);
          }
          (function(t) {
            if (null === St) {
              var e = t.createElement('div'),
                n = t.createElement('div'),
                o = t.createElement('div');
              e.appendChild(n), n.appendChild(o), (e.innerHTML = ''), (St = o.parentNode !== n);
            }
            return St;
          })(t.ownerDocument) &&
            (function(t, e) {
              for (var n = 0; n < t.observers.length; n++) {
                var o = t.observers[n];
                if (o)
                  for (var r = o.elements, i = 0; i < r.length; i++) {
                    var s = r[i];
                    s.parentNode || e.push([jt, s]);
                  }
              }
            })(t, e);
        }
        function Mt(t, e, n) {
          for (var o = 0; o < n.length; o++) {
            var r = n[o];
            if ('matches' in r)
              for (var i = t.selectorSet.matches(r), s = 0; s < i.length; s++) {
                var a = i[s].data;
                e.push([At, r, a]);
              }
            if ('querySelectorAll' in r)
              for (var c = t.selectorSet.queryAll(r), l = 0; l < c.length; l++)
                for (var u = c[l], d = u.data, f = u.elements, h = 0; h < f.length; h++)
                  e.push([At, f[h], d]);
          }
        }
        function It(t, e, n) {
          for (var o = 0; o < n.length; o++) {
            var r = n[o];
            if ('querySelectorAll' in r) {
              e.push([jt, r]);
              for (var i = r.querySelectorAll('*'), s = 0; s < i.length; s++) e.push([jt, i[s]]);
            }
          }
        }
        function Ot(t, e, n) {
          if ('matches' in n)
            for (var o = t.selectorSet.matches(n), r = 0; r < o.length; r++) {
              var i = o[r].data;
              e.push([At, n, i]);
            }
          if ('querySelectorAll' in n) {
            var s = Et.get(n);
            if (s)
              for (var a = 0; a < s.length; a++) {
                var c = t.observers[s[a]];
                c && (t.selectorSet.matchesSelector(n, c.selector) || e.push([Ct, n, c]));
              }
          }
        }
        var Pt =
            'function' == typeof Symbol && 'symbol' == typeof Symbol.iterator
              ? function(t) {
                  return typeof t;
                }
              : function(t) {
                  return t &&
                    'function' == typeof Symbol &&
                    t.constructor === Symbol &&
                    t !== Symbol.prototype
                    ? 'symbol'
                    : typeof t;
                },
          Nt = 0;
        function Rt(t) {
          var e, n, o;
          (this.rootNode = 9 === t.nodeType ? t.documentElement : t),
            (this.ownerDocument = 9 === t.nodeType ? t : t.ownerDocument),
            (this.observers = []),
            (this.selectorSet = new D()),
            (this.mutationObserver = new MutationObserver(
              function(t, e) {
                var n = [];
                Dt(t, n, e), Tt(t, n);
              }.bind(this, this),
            )),
            (this._scheduleAddRootNodes = mt(
              this.ownerDocument,
              function(t) {
                var e = [];
                Mt(t, e, [t.rootNode]), Tt(t, e);
              }.bind(this, this),
            )),
            (this._handleThrottledChangedTargets = mt(
              this.ownerDocument,
              function(t, e) {
                var n = [];
                (function(t, e, n) {
                  for (var o = 0; o < n.length; o++)
                    for (
                      var r = n[o],
                        i = r.form ? r.form.elements : t.rootNode.querySelectorAll('input'),
                        s = 0;
                      s < i.length;
                      s++
                    )
                      Ot(t, e, i[s]);
                })(t, n, e),
                  Tt(t, n);
              }.bind(this, this),
            )),
            this.rootNode.addEventListener(
              'change',
              function(t, e) {
                t._handleThrottledChangedTargets(e.target);
              }.bind(this, this),
              !1,
            ),
            (e = this.ownerDocument),
            (n = function(t) {
              t.mutationObserver.observe(t.rootNode, {
                childList: !0,
                attributes: !0,
                subtree: !0,
              }),
                t._scheduleAddRootNodes();
            }.bind(this, this)),
            'interactive' === (o = e.readyState) || 'complete' === o
              ? gt(e, n)
              : e.addEventListener('DOMContentLoaded', gt(e, n));
        }
        (Rt.prototype.disconnect = function() {
          this.mutationObserver.disconnect();
        }),
          (Rt.prototype.observe = function(t, e) {
            var n = void 0;
            'function' == typeof e
              ? (n = { selector: t, initialize: e })
              : 'object' === (void 0 === e ? 'undefined' : Pt(e))
              ? ((n = e).selector = t)
              : (n = t);
            var o = this,
              r = {
                id: Nt++,
                selector: n.selector,
                initialize: n.initialize,
                add: n.add,
                remove: n.remove,
                subscribe: n.subscribe,
                elements: [],
                elementConstructor: n.hasOwnProperty('constructor') ? n.constructor : Element,
                abort: function() {
                  o._abortObserving(r);
                },
              };
            return (
              this.selectorSet.add(r.selector, r),
              (this.observers[r.id] = r),
              this._scheduleAddRootNodes(),
              r
            );
          }),
          (Rt.prototype._abortObserving = function(t) {
            for (var e = t.elements, n = 0; n < e.length; n++) kt(t, e[n]);
            this.selectorSet.remove(t.selector, t), delete this.observers[t.id];
          }),
          (Rt.prototype.triggerObservers = function(t) {
            var e = [];
            !(function(t, e, n) {
              if ('querySelectorAll' in n) {
                Ot(t, e, n);
                for (var o = n.querySelectorAll('*'), r = 0; r < o.length; r++) Ot(t, e, o[r]);
              }
            })(this, e, t),
              Tt(this, e);
          });
        var qt = void 0;
        function Ht() {
          var t;
          return (qt || (qt = new Rt(window.document)), (t = qt)).observe.apply(t, arguments);
        }
        function Ut(t, e) {
          const n = t.head;
          if (!n) return '';
          for (const o of n.getElementsByTagName('meta')) if (o.name === e) return o.content;
          return '';
        }
        function Ft(t) {
          const e = Ut(t, 'expected-hostname');
          return (
            !!e &&
            e
              .replace(/\.$/, '')
              .split('.')
              .slice(-2)
              .join('.') !==
              t.location.hostname
                .replace(/\.$/, '')
                .split('.')
                .slice(-2)
                .join('.')
          );
        }
        const Vt = t(
            'a5',
            'interactive' === document.readyState || 'complete' === document.readyState
              ? Promise.resolve()
              : new Promise(t => {
                  document.addEventListener('DOMContentLoaded', () => {
                    t();
                  });
                }),
          ),
          Wt = t(
            'X',
            'complete' === document.readyState
              ? Promise.resolve()
              : new Promise(t => {
                  window.addEventListener('load', t);
                }),
          );
        let Xt = [];
        function Bt(t, e = !1) {
          void 0 === t.timestamp && (t.timestamp = new Date().getTime()),
            Xt.push(t),
            e
              ? Gt()
              : (async function() {
                  await Wt, null == $t && ($t = requestIdleCallback(Gt));
                })();
        }
        let $t = null;
        function Gt() {
          if ((($t = null), Ft(document))) return;
          const t = Ut(document, 'browser-stats-url');
          if (!t) return;
          const e = JSON.stringify({ stats: Xt });
          navigator.sendBeacon && navigator.sendBeacon(t, e), (Xt = []);
        }
        tt('click', '[data-hydro-click]', function(t) {
          const e = t.currentTarget;
          Bt(
            {
              hydroEventPayload: e.getAttribute('data-hydro-click'),
              hydroEventHmac: e.getAttribute('data-hydro-click-hmac'),
              hydroClientContext: e.getAttribute('data-hydro-client-context'),
            },
            !0,
          );
        });
        let Kt = !1;
        const Yt = new D();
        function zt(t) {
          const e = t.target;
          if (e instanceof HTMLElement && e.nodeType !== Node.DOCUMENT_NODE)
            for (const n of Yt.matches(e)) n.data.call(null, e);
        }
        function Jt(t, e) {
          Kt || ((Kt = !0), document.addEventListener('focus', zt, !0)),
            Yt.add(t, e),
            document.activeElement &&
              document.activeElement.matches(t) &&
              e(document.activeElement);
        }
        const Qt = [];
        let Zt,
          te = 0;
        function ee() {
          return Zt;
        }
        function ne() {
          try {
            return Math.min(Math.max(0, history.length) || 0, 9007199254740991);
          } catch (t) {
            return 0;
          }
        }
        function oe() {
          return ne() - 1 + te;
        }
        function re(t) {
          Zt = t;
          const e = location.href;
          (Qt[oe()] = { url: e, state: Zt }),
            (Qt.length = ne()),
            window.dispatchEvent(new CustomEvent('statechange', { bubbles: !1, cancelable: !1 }));
        }
        function ie() {
          return new Date().getTime();
        }
        function se(t, e, n) {
          te = 0;
          const o = Object.assign({}, { _id: ie() }, t);
          history.pushState(o, e, n), re(o);
        }
        function ae(t, e, n) {
          const o = Object.assign({}, { _id: ee()._id }, t);
          history.replaceState(o, e, n), re(o);
        }
        var ce;
        (Zt = (function() {
          const t = { _id: new Date().getTime() };
          return re(t), t;
        })()),
          window.addEventListener(
            'popstate',
            function(t) {
              if (!t.state || !t.state._id) return;
              t.state._id < ee()._id ? te-- : te++, re(t.state);
            },
            !0,
          ),
          window.addEventListener(
            'hashchange',
            function() {
              if (ne() > Qt.length) {
                const t = { _id: ie() };
                history.replaceState(t, '', location.href), re(t);
              }
            },
            !0,
          ),
          (ce =
            'function' == typeof FormData && 'entries' in FormData.prototype
              ? function(t) {
                  return Array.from(new FormData(t).entries());
                }
              : function(t) {
                  for (var e = [], n = t.elements, o = 0; o < n.length; o++) {
                    var r = n[o],
                      i = r.tagName.toUpperCase();
                    if ('SELECT' === i || 'TEXTAREA' === i || 'INPUT' === i) {
                      var s = r.type,
                        a = r.name;
                      if (
                        a &&
                        !r.disabled &&
                        'submit' !== s &&
                        'reset' !== s &&
                        'button' !== s &&
                        (('radio' !== s && 'checkbox' !== s) || r.checked)
                      )
                        if ('SELECT' === i)
                          for (var c = r.getElementsByTagName('option'), l = 0; l < c.length; l++) {
                            var u = c[l];
                            u.selected && e.push([a, u.value]);
                          }
                        else
                          'file' === s
                            ? (console.warn(
                                'form-data-entries could not serialize <input type=file>',
                                r,
                              ),
                              e.push([a, '']))
                            : e.push([a, r.value]);
                    }
                  }
                  return e;
                });
        var le = t('aA', ce);
        function ue(t) {
          const e = t.querySelector('input.is-submit-button-value');
          return e instanceof HTMLInputElement ? e : null;
        }
        function de(t) {
          const e = t.closest('form');
          if (!(e instanceof HTMLFormElement)) return;
          let n = ue(e);
          if (t.name) {
            const o = t.matches('input[type=submit]') ? 'Submit' : '',
              r = t.value || o;
            n ||
              (((n = document.createElement('input')).type = 'hidden'),
              n.classList.add('is-submit-button-value'),
              e.prepend(n)),
              (n.name = t.name),
              (n.value = r);
          } else n && n.remove();
        }
        function fe(t, e, n) {
          return t.dispatchEvent(new CustomEvent(e, { bubbles: !0, cancelable: n }));
        }
        function he(t, e) {
          e && de(e), fe(t, 'submit', !0) && t.submit();
        }
        function pe(t) {
          if (!(t instanceof HTMLElement)) return !1;
          const e = t.nodeName.toLowerCase(),
            n = (t.getAttribute('type') || '').toLowerCase();
          return (
            'select' === e ||
            'textarea' === e ||
            ('input' === e && 'submit' !== n && 'reset' !== n) ||
            t.isContentEditable
          );
        }
        function me(t) {
          const e = new URLSearchParams();
          for (const [n, o] of le(t)) e.append(n, o);
          return e.toString();
        }
        function ge(t, e) {
          return (
            (function(t) {
              if (Array.isArray(t)) return t;
            })(t) ||
            (function(t, e) {
              var n = [],
                o = !0,
                r = !1,
                i = void 0;
              try {
                for (
                  var s, a = t[Symbol.iterator]();
                  !(o = (s = a.next()).done) && (n.push(s.value), !e || n.length !== e);
                  o = !0
                );
              } catch (c) {
                (r = !0), (i = c);
              } finally {
                try {
                  o || null == a.return || a.return();
                } finally {
                  if (r) throw i;
                }
              }
              return n;
            })(t, e) ||
            (function() {
              throw new TypeError('Invalid attempt to destructure non-iterable instance');
            })()
          );
        }
        class ve extends Error {
          constructor(t, e) {
            super(t), (this.response = e);
          }
        }
        function be() {
          let t, e;
          return [
            new Promise(function(n, o) {
              (t = n), (e = o);
            }),
            t,
            e,
          ];
        }
        let we;
        const ye = [],
          Ee = [];
        function Te(t, e) {
          we || ((we = new D()), document.addEventListener('submit', _e)), we.add(t, e);
        }
        function _e(t) {
          if (!(t.target instanceof HTMLFormElement)) return;
          const e = t.target,
            n = we && we.matches(e);
          if (!n || 0 === n.length) return;
          const o = (function(t) {
              const e = {
                method: t.method || 'GET',
                url: t.action,
                headers: new Headers({ 'X-Requested-With': 'XMLHttpRequest' }),
                body: null,
              };
              if ('GET' === e.method.toUpperCase()) {
                const n = (function(t) {
                  const e = new URLSearchParams();
                  for (const o of le(t)) {
                    var n = ge(o, 2);
                    const t = n[0],
                      r = n[1];
                    e.append(t, r);
                  }
                  return e.toString();
                })(t);
                n && (e.url += (~e.url.indexOf('?') ? '&' : '?') + n);
              } else e.body = new FormData(t);
              return e;
            })(e),
            r = ge(be(), 3),
            i = r[0],
            s = r[1],
            a = r[2];
          t.preventDefault(),
            (async function(t, e, n, o) {
              let r = !1;
              for (const i of t) {
                const t = be(),
                  s = ge(t, 2),
                  a = s[0],
                  c = s[1],
                  l = () => ((r = !0), c(), o),
                  u = {
                    text: l,
                    json: () => (n.headers.set('Accept', 'application/json'), l()),
                    html: () => (n.headers.set('Accept', 'text/html'), l()),
                  };
                await Promise.race([a, i.data.call(null, e, u, n)]);
              }
              return r;
            })(n, e, o, i).then(
              async t => {
                if (t) {
                  for (const t of Ee) await t(e);
                  (async function(t) {
                    const e = await window.fetch(t.url, {
                        method: t.method,
                        body: null !== t.body ? t.body : void 0,
                        headers: t.headers,
                        credentials: 'same-origin',
                      }),
                      n = {
                        url: e.url,
                        status: e.status,
                        statusText: e.statusText,
                        headers: e.headers,
                        text: '',
                        get json() {
                          const t = JSON.parse(this.text);
                          return delete this.json, (this.json = t), this.json;
                        },
                        get html() {
                          return (
                            delete this.html,
                            (this.html = (function(t, e) {
                              const n = t.createElement('template');
                              return (n.innerHTML = e), t.importNode(n.content, !0);
                            })(document, this.text)),
                            this.html
                          );
                        },
                      },
                      o = await e.text();
                    if (((n.text = o), e.ok)) return n;
                    throw new ve('request failed', n);
                  })(o)
                    .then(s, a)
                    .catch(() => {})
                    .then(() => {
                      for (const t of ye) t(e);
                    });
                } else e.submit();
              },
              t => {
                e.submit(),
                  setTimeout(() => {
                    throw t;
                  });
              },
            );
        }
        function xe(t) {
          return new Promise(function(e) {
            function n() {
              t.hasFocus() &&
                (e(),
                t.removeEventListener('visibilitychange', n),
                window.removeEventListener('focus', n),
                window.removeEventListener('blur', n));
            }
            t.addEventListener('visibilitychange', n),
              window.addEventListener('focus', n),
              window.addEventListener('blur', n),
              n();
          });
        }
        let ke = 0,
          Le = -1;
        function Se(t) {
          const e = t.getBoundingClientRect(),
            n = window.innerHeight,
            o = window.innerWidth;
          if (0 === e.height) return !1;
          if (e.height < n) return e.top >= 0 && e.left >= 0 && e.bottom <= n && e.right <= o;
          {
            const t = Math.ceil(n / 2);
            return e.top >= 0 && e.top + t < n;
          }
        }
        function Ae(t) {
          for (const e of t.elements) Se(e) ? t.in.call(e, e, t) : t.out && t.out.call(e, e, t);
        }
        async function Ce(t) {
          const e = l(document, '#site-details-dialog', HTMLTemplateElement).content.cloneNode(!0),
            n = l(e, 'details'),
            o = l(n, 'details-dialog'),
            r = l(n, '.js-details-dialog-spinner');
          t.detailsClass && n.classList.add(...t.detailsClass.split(' ')),
            t.dialogClass && o.classList.add(...t.dialogClass.split(' ')),
            dt(document.body, 'app/assets/modules/github/details-dialog.js:23'),
            document.body.append(e);
          const i = await t.content;
          return (
            r.remove(),
            o.prepend(i),
            n.addEventListener('toggle', () => {
              n.hasAttribute('open') || (et(o, 'dialog:remove'), n.remove());
            }),
            o
          );
        }
        class je extends CustomEvent {
          constructor(t, e) {
            super(t, e), (this.relatedTarget = e.relatedTarget);
          }
        }
        const De = new WeakMap();
        function Me(t, e) {
          const n = new XMLHttpRequest();
          return (
            n.open('GET', e, !0),
            n.setRequestHeader('Accept', 'text/html; fragment'),
            (function(t, e) {
              const n = De.get(t);
              n && n.abort();
              De.set(t, e);
              const o = () => De.delete(t),
                r = (function(t) {
                  return new Promise((e, n) => {
                    (t.onload = function() {
                      t.status >= 200 && t.status < 300
                        ? e(t.responseText)
                        : n(new Error(t.responseText));
                    }),
                      (t.onerror = n),
                      t.send();
                  });
                })(e);
              return r.then(o, o), r;
            })(t, n)
          );
        }
        function Ie(t, e) {
          (function(t, e) {
            const n = t.scrollTop,
              o = n + t.clientHeight,
              r = e.offsetTop,
              i = r + e.clientHeight;
            return r >= n && i <= o;
          })(t, e) || (t.scrollTop = e.offsetTop);
        }
        let Oe = !1;
        const Pe = !!navigator.userAgent.match(/Macintosh/);
        function Ne(t) {
          if (t.shiftKey || t.metaKey || t.altKey) return;
          const e = t.currentTarget;
          if (!(e instanceof HTMLTextAreaElement || e instanceof HTMLInputElement)) return;
          if (Oe) return;
          const n = document.getElementById(e.getAttribute('aria-owns') || '');
          if (n)
            switch (t.key) {
              case 'Enter':
              case 'Tab':
                (function(t, e) {
                  const n = e.querySelector('[aria-selected="true"]');
                  return !(!n || ('true' !== n.getAttribute('aria-disabled') && (n.click(), 0)));
                })(0, n) && t.preventDefault();
                break;
              case 'Escape':
                He(e, n);
                break;
              case 'ArrowDown':
                qe(e, n, 1), t.preventDefault();
                break;
              case 'ArrowUp':
                qe(e, n, -1), t.preventDefault();
                break;
              case 'n':
                Pe && t.ctrlKey && (qe(e, n, 1), t.preventDefault());
                break;
              case 'p':
                Pe && t.ctrlKey && (qe(e, n, -1), t.preventDefault());
            }
        }
        function Re(t) {
          if (!(t.target instanceof Element)) return;
          const e = t.target.closest('[role="option"]');
          e &&
            'true' !== e.getAttribute('aria-disabled') &&
            (function(t) {
              t.dispatchEvent(new CustomEvent('combobox-commit', { bubbles: !0 }));
            })(e);
        }
        function qe(t, e) {
          let n = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : 1;
          const o = e.querySelector('[aria-selected="true"]'),
            r = Array.from(e.querySelectorAll('[role="option"]')),
            i = r.indexOf(o);
          let s = 1 === n ? 0 : r.length - 1;
          if (o && i >= 0) {
            const t = i + n;
            t >= 0 && t < r.length && (s = t);
          }
          const a = r[s];
          if (a)
            for (const c of r)
              a === c
                ? (t.setAttribute('aria-activedescendant', a.id),
                  a.setAttribute('aria-selected', 'true'),
                  Ie(e, a))
                : c.setAttribute('aria-selected', 'false');
        }
        function He(t, e) {
          t.removeAttribute('aria-activedescendant');
          for (const n of e.querySelectorAll('[aria-selected="true"]'))
            n.setAttribute('aria-selected', 'false');
        }
        function Ue(t) {
          const e = t.currentTarget;
          if (!(e instanceof HTMLTextAreaElement || e instanceof HTMLInputElement)) return;
          Oe = 'compositionstart' === t.type;
          const n = document.getElementById(e.getAttribute('aria-owns') || '');
          n && He(e, n);
        }
        class Fe {
          constructor(t, e, n) {
            (this.container = t),
              (this.input = e),
              (this.results = n),
              (this.results.hidden = !0),
              this.input.setAttribute('autocomplete', 'off'),
              this.input.setAttribute('spellcheck', 'false'),
              (this.interactingWithList = !1),
              (this.onInputChange = (function(t, e) {
                let n;
                return function() {
                  for (var o = arguments.length, r = new Array(o), i = 0; i < o; i++)
                    r[i] = arguments[i];
                  clearTimeout(n),
                    (n = setTimeout(() => {
                      clearTimeout(n), t(...r);
                    }, e));
                };
              })(this.onInputChange.bind(this), 300)),
              (this.onResultsMouseDown = this.onResultsMouseDown.bind(this)),
              (this.onInputBlur = this.onInputBlur.bind(this)),
              (this.onInputFocus = this.onInputFocus.bind(this)),
              (this.onKeydown = this.onKeydown.bind(this)),
              (this.onCommit = this.onCommit.bind(this)),
              this.input.addEventListener('keydown', this.onKeydown),
              this.input.addEventListener('focus', this.onInputFocus),
              this.input.addEventListener('blur', this.onInputBlur),
              this.input.addEventListener('input', this.onInputChange),
              this.results.addEventListener('mousedown', this.onResultsMouseDown),
              this.results.addEventListener('combobox-commit', this.onCommit);
          }
          destroy() {
            this.input.removeEventListener('keydown', this.onKeydown),
              this.input.removeEventListener('focus', this.onInputFocus),
              this.input.removeEventListener('blur', this.onInputBlur),
              this.input.removeEventListener('input', this.onInputChange),
              this.results.removeEventListener('mousedown', this.onResultsMouseDown),
              this.results.removeEventListener('combobox-commit', this.onCommit);
          }
          sibling(t) {
            const e = Array.from(this.results.querySelectorAll('[role="option"]')),
              n = this.results.querySelector('[aria-selected="true"]'),
              o = e.indexOf(n),
              r = t ? e[o + 1] : e[o - 1],
              i = t ? e[0] : e[e.length - 1];
            return r || i;
          }
          onKeydown(t) {
            'Escape' === t.key &&
              this.container.open &&
              ((this.container.open = !1), t.stopPropagation(), t.preventDefault());
          }
          onInputFocus() {
            this.fetchResults();
          }
          onInputBlur() {
            this.interactingWithList ? (this.interactingWithList = !1) : (this.container.open = !1);
          }
          onCommit(t) {
            let { target: e } = t;
            const n = e;
            if (!(n instanceof HTMLElement)) return;
            if (((this.container.open = !1), n instanceof HTMLAnchorElement)) return;
            const o = n.getAttribute('data-autocomplete-value') || n.textContent;
            this.container.value = o;
          }
          onResultsMouseDown() {
            this.interactingWithList = !0;
          }
          onInputChange() {
            this.container.removeAttribute('value'), this.fetchResults();
          }
          identifyOptions() {
            let t = 0;
            for (const e of this.results.querySelectorAll('[role="option"]:not([id])'))
              e.id = ''.concat(this.results.id, '-option-').concat(t++);
          }
          fetchResults() {
            const t = this.input.value.trim();
            if (!t) return void (this.container.open = !1);
            const e = this.container.src;
            if (!e) return;
            const n = new URL(e, window.location.href),
              o = new URLSearchParams(n.search.slice(1));
            o.append('q', t),
              (n.search = o.toString()),
              this.container.dispatchEvent(new CustomEvent('loadstart')),
              Me(this.input, n.toString())
                .then(t => {
                  (this.results.innerHTML = t), this.identifyOptions();
                  const e = !!this.results.querySelector('[role="option"]');
                  (this.container.open = e),
                    this.container.dispatchEvent(new CustomEvent('load')),
                    this.container.dispatchEvent(new CustomEvent('loadend'));
                })
                .catch(() => {
                  this.container.dispatchEvent(new CustomEvent('error')),
                    this.container.dispatchEvent(new CustomEvent('loadend'));
                });
          }
          open() {
            var t, e;
            this.results.hidden &&
              ((t = this.input),
              (e = this.results),
              t.addEventListener('compositionstart', Ue),
              t.addEventListener('compositionend', Ue),
              t.addEventListener('keydown', Ne),
              e.addEventListener('click', Re),
              (this.results.hidden = !1),
              this.container.setAttribute('aria-expanded', 'true'));
          }
          close() {
            var t, e;
            this.results.hidden ||
              ((t = this.input),
              (e = this.results),
              t.removeAttribute('aria-activedescendant'),
              t.removeEventListener('compositionstart', Ue),
              t.removeEventListener('compositionend', Ue),
              t.removeEventListener('keydown', Ne),
              e.removeEventListener('click', Re),
              (this.results.hidden = !0),
              this.input.removeAttribute('aria-activedescendant'),
              this.container.setAttribute('aria-expanded', 'false'));
          }
        }
        const Ve = new WeakMap();
        class AutocompleteElement extends HTMLElement {
          constructor() {
            super();
          }
          connectedCallback() {
            const t = this.getAttribute('aria-owns');
            if (!t) return;
            const e = this.querySelector('input'),
              n = document.getElementById(t);
            e instanceof HTMLInputElement &&
              n &&
              (e.setAttribute('aria-owns', t),
              Ve.set(this, new Fe(this, e, n)),
              this.setAttribute('role', 'combobox'),
              this.setAttribute('aria-haspopup', 'listbox'),
              this.setAttribute('aria-expanded', 'false'),
              e.setAttribute('aria-autocomplete', 'list'),
              e.setAttribute('aria-controls', t),
              n.setAttribute('role', 'listbox'));
          }
          disconnectedCallback() {
            const t = Ve.get(this);
            t && (t.destroy(), Ve.delete(this));
          }
          get src() {
            return this.getAttribute('src') || '';
          }
          set src(t) {
            this.setAttribute('src', t);
          }
          get value() {
            return this.getAttribute('value') || '';
          }
          set value(t) {
            this.setAttribute('value', t);
          }
          get open() {
            return this.hasAttribute('open');
          }
          set open(t) {
            t ? this.setAttribute('open', '') : this.removeAttribute('open');
          }
          static get observedAttributes() {
            return ['open', 'value'];
          }
          attributeChangedCallback(t, e, n) {
            if (e === n) return;
            const o = Ve.get(this);
            if (o)
              switch (t) {
                case 'open':
                  null === n ? o.close() : o.open();
                  break;
                case 'value':
                  null !== n && (o.input.value = n),
                    this.dispatchEvent(
                      new je('auto-complete-change', { bubbles: !0, relatedTarget: o.input }),
                    );
              }
          }
        }
        window.customElements.get('auto-complete') ||
          ((window.AutocompleteElement = AutocompleteElement),
          window.customElements.define('auto-complete', AutocompleteElement)),
          t('x', AutocompleteElement);
        const We = new WeakMap();
        function Xe(t) {
          const e = We.get(t);
          dt(e, 'app/assets/modules/github/throttled-input.js:24'),
            null != e.timer && clearTimeout(e.timer),
            (e.timer = setTimeout(() => {
              null != e.timer && (e.timer = null), (e.inputed = !1), e.listener.call(null, t);
            }, e.wait));
        }
        function Be(t) {
          const e = We.get(t.currentTarget);
          dt(e, 'app/assets/modules/github/throttled-input.js:36'),
            (e.keypressed = !0),
            null != e.timer && clearTimeout(e.timer);
        }
        function $e(t) {
          const e = We.get(t.currentTarget);
          dt(e, 'app/assets/modules/github/throttled-input.js:45'),
            dt(
              t.currentTarget instanceof HTMLInputElement ||
                t.currentTarget instanceof HTMLTextAreaElement,
              'app/assets/modules/github/throttled-input.js:46',
            ),
            (e.keypressed = !1),
            e.inputed && Xe(t.currentTarget);
        }
        function Ge(t) {
          const e = We.get(t.currentTarget);
          dt(e, 'app/assets/modules/github/throttled-input.js:55'),
            dt(
              t.currentTarget instanceof HTMLInputElement ||
                t.currentTarget instanceof HTMLTextAreaElement,
              'app/assets/modules/github/throttled-input.js:56',
            ),
            (e.inputed = !0),
            e.keypressed || Xe(t.currentTarget);
        }
        function Ke(t) {
          const e = atob(t),
            n = new ArrayBuffer(e.length),
            o = new Uint8Array(n);
          for (let r = 0; r < e.length; r++) o[r] = e.charCodeAt(r);
          return n;
        }
        function Ye(t) {
          const e = new Uint8Array(t);
          let n = '';
          for (const o of e) n += String.fromCharCode(o);
          return btoa(n);
        }
        function ze() {
          const t = navigator.credentials;
          if ('undefined' != typeof CredentialsContainer && t instanceof CredentialsContainer)
            return t;
        }
        function Je() {
          return 'true' === Ut(document, 'u2f-enabled');
        }
        function Qe() {
          return !!window.u2f;
        }
        function Ze() {
          const t = ze();
          return (
            !!t &&
            'function' == typeof t.get &&
            'function' == typeof PublicKeyCredential &&
            'function' == typeof AuthenticatorResponse &&
            'function' == typeof AuthenticatorAssertionResponse &&
            'function' == typeof AuthenticatorAttestationResponse
          );
        }
        function tn() {
          return Ze() ? 'supported' : 'unsupported';
        }
        function en() {
          return 'true' === Ut(document, 'webauthn-registration-enabled') && Ze();
        }
        function nn() {
          return 'true' === Ut(document, 'webauthn-auth-enabled') && Ze();
        }
        async function on(t, e) {
          const n = at(t, e);
          n.headers.set('Accept', 'application/json');
          const o = await self.fetch(n);
          return st(o, new rt(o)), o.json();
        }
        let rn = !1;
        !(function() {
          var t = 'chrome' in window && window.navigator.userAgent.indexOf('Edge') < 0;
          if (!('u2f' in window) && t) {
            var e,
              n = (window.u2f = {});
            (n.EXTENSION_ID = 'kmendfapggjehodndflmmgagdbamhnfd'),
              (n.MessageTypes = {
                U2F_REGISTER_REQUEST: 'u2f_register_request',
                U2F_REGISTER_RESPONSE: 'u2f_register_response',
                U2F_SIGN_REQUEST: 'u2f_sign_request',
                U2F_SIGN_RESPONSE: 'u2f_sign_response',
                U2F_GET_API_VERSION_REQUEST: 'u2f_get_api_version_request',
                U2F_GET_API_VERSION_RESPONSE: 'u2f_get_api_version_response',
              }),
              (n.ErrorCodes = {
                OK: 0,
                OTHER_ERROR: 1,
                BAD_REQUEST: 2,
                CONFIGURATION_UNSUPPORTED: 3,
                DEVICE_INELIGIBLE: 4,
                TIMEOUT: 5,
              }),
              (n.getMessagePort = function(t) {
                if ('undefined' != typeof chrome && chrome.runtime) {
                  var e = { type: n.MessageTypes.U2F_SIGN_REQUEST, signRequests: [] };
                  chrome.runtime.sendMessage(n.EXTENSION_ID, e, function() {
                    chrome.runtime.lastError ? n.getIframePort_(t) : n.getChromeRuntimePort_(t);
                  });
                } else
                  n.isAndroidChrome_()
                    ? n.getAuthenticatorPort_(t)
                    : n.isIosChrome_()
                    ? n.getIosPort_(t)
                    : n.getIframePort_(t);
              }),
              (n.isAndroidChrome_ = function() {
                var t = navigator.userAgent;
                return -1 != t.indexOf('Chrome') && -1 != t.indexOf('Android');
              }),
              (n.isIosChrome_ = function() {
                return ['iPhone', 'iPad', 'iPod'].indexOf(navigator.platform) > -1;
              }),
              (n.getChromeRuntimePort_ = function(t) {
                var e = chrome.runtime.connect(n.EXTENSION_ID, { includeTlsChannelId: !0 });
                setTimeout(function() {
                  t(new n.WrappedChromeRuntimePort_(e));
                }, 0);
              }),
              (n.getAuthenticatorPort_ = function(t) {
                setTimeout(function() {
                  t(new n.WrappedAuthenticatorPort_());
                }, 0);
              }),
              (n.getIosPort_ = function(t) {
                setTimeout(function() {
                  t(new n.WrappedIosPort_());
                }, 0);
              }),
              (n.WrappedChromeRuntimePort_ = function(t) {
                this.port_ = t;
              }),
              (n.formatSignRequest_ = function(t, o, r, i, s) {
                if (void 0 === e || e < 1.1) {
                  for (var a = [], c = 0; c < r.length; c++)
                    a[c] = {
                      version: r[c].version,
                      challenge: o,
                      keyHandle: r[c].keyHandle,
                      appId: t,
                    };
                  return {
                    type: n.MessageTypes.U2F_SIGN_REQUEST,
                    signRequests: a,
                    timeoutSeconds: i,
                    requestId: s,
                  };
                }
                return {
                  type: n.MessageTypes.U2F_SIGN_REQUEST,
                  appId: t,
                  challenge: o,
                  registeredKeys: r,
                  timeoutSeconds: i,
                  requestId: s,
                };
              }),
              (n.formatRegisterRequest_ = function(t, o, r, i, s) {
                if (void 0 === e || e < 1.1) {
                  for (var a = 0; a < r.length; a++) r[a].appId = t;
                  var c = [];
                  for (a = 0; a < o.length; a++)
                    c[a] = {
                      version: o[a].version,
                      challenge: r[0],
                      keyHandle: o[a].keyHandle,
                      appId: t,
                    };
                  return {
                    type: n.MessageTypes.U2F_REGISTER_REQUEST,
                    signRequests: c,
                    registerRequests: r,
                    timeoutSeconds: i,
                    requestId: s,
                  };
                }
                return {
                  type: n.MessageTypes.U2F_REGISTER_REQUEST,
                  appId: t,
                  registerRequests: r,
                  registeredKeys: o,
                  timeoutSeconds: i,
                  requestId: s,
                };
              }),
              (n.WrappedChromeRuntimePort_.prototype.postMessage = function(t) {
                this.port_.postMessage(t);
              }),
              (n.WrappedChromeRuntimePort_.prototype.addEventListener = function(t, e) {
                var n = t.toLowerCase();
                'message' == n || 'onmessage' == n
                  ? this.port_.onMessage.addListener(function(t) {
                      e({ data: t });
                    })
                  : console.error('WrappedChromeRuntimePort only supports onMessage');
              }),
              (n.WrappedAuthenticatorPort_ = function() {
                (this.requestId_ = -1), (this.requestObject_ = null);
              }),
              (n.WrappedAuthenticatorPort_.prototype.postMessage = function(t) {
                var e =
                  n.WrappedAuthenticatorPort_.INTENT_URL_BASE_ +
                  ';S.request=' +
                  encodeURIComponent(JSON.stringify(t)) +
                  ';end';
                document.location = e;
              }),
              (n.WrappedAuthenticatorPort_.prototype.getPortType = function() {
                return 'WrappedAuthenticatorPort_';
              }),
              (n.WrappedAuthenticatorPort_.prototype.addEventListener = function(t, e) {
                if ('message' == t.toLowerCase()) {
                  window.addEventListener('message', this.onRequestUpdate_.bind(this, e), !1);
                } else console.error('WrappedAuthenticatorPort only supports message');
              }),
              (n.WrappedAuthenticatorPort_.prototype.onRequestUpdate_ = function(t, e) {
                var n = JSON.parse(e.data),
                  o = (n.intentURL, n.errorCode, null);
                n.hasOwnProperty('data') && (o = JSON.parse(n.data)), t({ data: o });
              }),
              (n.WrappedAuthenticatorPort_.INTENT_URL_BASE_ =
                'intent:#Intent;action=com.google.android.apps.authenticator.AUTHENTICATE'),
              (n.WrappedIosPort_ = function() {}),
              (n.WrappedIosPort_.prototype.postMessage = function(t) {
                var e = JSON.stringify(t),
                  n = 'u2f://auth?' + encodeURI(e);
                location.replace(n);
              }),
              (n.WrappedIosPort_.prototype.getPortType = function() {
                return 'WrappedIosPort_';
              }),
              (n.WrappedIosPort_.prototype.addEventListener = function(t, e) {
                'message' !== t.toLowerCase() &&
                  console.error('WrappedIosPort only supports message');
              }),
              (n.getIframePort_ = function(t) {
                var e = 'chrome-extension://' + n.EXTENSION_ID,
                  o = document.createElement('iframe');
                (o.src = e + '/u2f-comms.html'),
                  o.setAttribute('style', 'display:none'),
                  document.body.appendChild(o);
                var r = new MessageChannel(),
                  i = function(e) {
                    'ready' == e.data
                      ? (r.port1.removeEventListener('message', i), t(r.port1))
                      : console.error('First event on iframe port was not "ready"');
                  };
                r.port1.addEventListener('message', i),
                  r.port1.start(),
                  o.addEventListener('load', function() {
                    o.contentWindow.postMessage('init', e, [r.port2]);
                  });
              }),
              (n.EXTENSION_TIMEOUT_SEC = 30),
              (n.port_ = null),
              (n.waitingForPort_ = []),
              (n.reqCounter_ = 0),
              (n.callbackMap_ = {}),
              (n.getPortSingleton_ = function(t) {
                n.port_
                  ? t(n.port_)
                  : (0 == n.waitingForPort_.length &&
                      n.getMessagePort(function(t) {
                        for (
                          n.port_ = t, n.port_.addEventListener('message', n.responseHandler_);
                          n.waitingForPort_.length;

                        )
                          n.waitingForPort_.shift()(n.port_);
                      }),
                    n.waitingForPort_.push(t));
              }),
              (n.responseHandler_ = function(t) {
                var e = t.data,
                  o = e.requestId;
                if (o && n.callbackMap_[o]) {
                  var r = n.callbackMap_[o];
                  delete n.callbackMap_[o], r(e.responseData);
                } else console.error('Unknown or missing requestId in response.');
              }),
              (n.sign = function(t, o, r, i, s) {
                void 0 === e
                  ? n.getApiVersion(function(a) {
                      (e = void 0 === a.js_api_version ? 0 : a.js_api_version),
                        console.log('Extension JS API Version: ', e),
                        n.sendSignRequest(t, o, r, i, s);
                    })
                  : n.sendSignRequest(t, o, r, i, s);
              }),
              (n.sendSignRequest = function(t, e, o, r, i) {
                n.getPortSingleton_(function(s) {
                  var a = ++n.reqCounter_;
                  n.callbackMap_[a] = r;
                  var c = void 0 !== i ? i : n.EXTENSION_TIMEOUT_SEC,
                    l = n.formatSignRequest_(t, e, o, c, a);
                  s.postMessage(l);
                });
              }),
              (n.register = function(t, o, r, i, s) {
                void 0 === e
                  ? n.getApiVersion(function(a) {
                      (e = void 0 === a.js_api_version ? 0 : a.js_api_version),
                        console.log('Extension JS API Version: ', e),
                        n.sendRegisterRequest(t, o, r, i, s);
                    })
                  : n.sendRegisterRequest(t, o, r, i, s);
              }),
              (n.sendRegisterRequest = function(t, e, o, r, i) {
                n.getPortSingleton_(function(s) {
                  var a = ++n.reqCounter_;
                  n.callbackMap_[a] = r;
                  var c = void 0 !== i ? i : n.EXTENSION_TIMEOUT_SEC,
                    l = n.formatRegisterRequest_(t, o, e, c, a);
                  s.postMessage(l);
                });
              }),
              (n.getApiVersion = function(t, e) {
                n.getPortSingleton_(function(o) {
                  if (o.getPortType) {
                    var r;
                    switch (o.getPortType()) {
                      case 'WrappedIosPort_':
                      case 'WrappedAuthenticatorPort_':
                        r = 1.1;
                        break;
                      default:
                        r = 0;
                    }
                    t({ js_api_version: r });
                  } else {
                    var i = ++n.reqCounter_;
                    n.callbackMap_[i] = t;
                    var s = {
                      type: n.MessageTypes.U2F_GET_API_VERSION_REQUEST,
                      timeoutSeconds: void 0 !== e ? e : n.EXTENSION_TIMEOUT_SEC,
                      requestId: i,
                    };
                    o.postMessage(s);
                  }
                });
              });
          }
        })();
        const sn = 1;
        class an extends Error {
          constructor(t, e) {
            super(t), (this.code = e);
          }
        }
        function cn(t) {
          return void 0 === t.errorCode || 0 === t.errorCode ? sn : t.errorCode;
        }
        var ln = t(
          'at',
          'undefined' != typeof globalThis
            ? globalThis
            : 'undefined' != typeof window
            ? window
            : 'undefined' != typeof global
            ? global
            : 'undefined' != typeof self
            ? self
            : {},
        );
        function un() {
          throw new Error('Dynamic requires are not currently supported by rollup-plugin-commonjs');
        }
        function dn(t) {
          return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, 'default')
            ? t.default
            : t;
        }
        function fn(t, e) {
          return t((e = { exports: {} }), e.exports), e.exports;
        }
        function hn(t) {
          return (t && t.default) || t;
        }
        function pn(t, e, n) {
          return (
            e in t
              ? Object.defineProperty(t, e, {
                  value: n,
                  enumerable: !0,
                  configurable: !0,
                  writable: !0,
                })
              : (t[e] = n),
            t
          );
        }
        t(
          'b8',
          Object.freeze({
            commonjsGlobal: ln,
            commonjsRequire: un,
            unwrapExports: dn,
            createCommonjsModule: fn,
            getCjsExportFromNamespace: hn,
          }),
        );
        class RemoteInputElement extends HTMLElement {
          constructor() {
            super(...arguments),
              pn(this, 'currentQuery', void 0),
              pn(this, 'debounceInputChange', void 0),
              pn(this, 'boundFetchResults', void 0);
          }
          static get observedAttributes() {
            return ['src'];
          }
          attributeChangedCallback(t, e) {
            e && 'src' === t && mn(this, !1);
          }
          connectedCallback() {
            const t = this.input;
            t &&
              (t.setAttribute('autocomplete', 'off'),
              t.setAttribute('spellcheck', 'false'),
              (this.debounceInputChange = (function(t) {
                let e;
                return function() {
                  clearTimeout(e),
                    (e = setTimeout(() => {
                      clearTimeout(e), t();
                    }, 300));
                };
              })(() => mn(this))),
              (this.boundFetchResults = () => mn(this)),
              t.addEventListener('focus', this.boundFetchResults),
              t.addEventListener('change', this.boundFetchResults),
              t.addEventListener('input', this.debounceInputChange));
          }
          disconnectedCallback() {
            const t = this.input;
            t &&
              (t.removeEventListener('focus', this.boundFetchResults),
              t.removeEventListener('change', this.boundFetchResults),
              t.removeEventListener('input', this.debounceInputChange));
          }
          get input() {
            const t = this.querySelector('input, textarea');
            return t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement ? t : null;
          }
          get src() {
            return this.getAttribute('src') || '';
          }
          set src(t) {
            this.setAttribute('src', t);
          }
        }
        async function mn(t) {
          let e = !(arguments.length > 1 && void 0 !== arguments[1]) || arguments[1];
          const n = t.input;
          if (!n) return;
          const o = n.value;
          if (e && t.currentQuery === o) return;
          t.currentQuery = o;
          const r = t.src;
          if (!r) return;
          const i = document.getElementById(t.getAttribute('aria-owns') || '');
          if (!i) return;
          const s = new URL(r, window.location.origin),
            a = new URLSearchParams(s.search);
          a.append(t.getAttribute('param') || 'q', o),
            (s.search = a.toString()),
            t.dispatchEvent(new CustomEvent('loadstart')),
            t.setAttribute('loading', '');
          try {
            const e = await fetch(s, {
                credentials: 'same-origin',
                headers: { accept: 'text/html; fragment' },
              }),
              n = await e.text();
            t.dispatchEvent(new CustomEvent('load')), (i.innerHTML = n);
          } catch (c) {
            t.dispatchEvent(new CustomEvent('error'));
          }
          t.removeAttribute('loading'), t.dispatchEvent(new CustomEvent('loadend'));
        }
        t('$', RemoteInputElement),
          window.customElements.get('remote-input') ||
            ((window.RemoteInputElement = RemoteInputElement),
            window.customElements.define('remote-input', RemoteInputElement));
        const gn = new WeakMap();
        let vn = null;
        function bn(t, e) {
          return t.closest('task-lists') === e.closest('task-lists');
        }
        function wn(t) {
          if (t.currentTarget !== t.target) return;
          const e = t.currentTarget;
          if (!(e instanceof Element)) return;
          const n = e.closest('.contains-task-list');
          if (!n) return;
          if (
            (e.classList.add('is-ghost'),
            t.dataTransfer && t.dataTransfer.setData('text/plain', e.textContent.trim()),
            !e.parentElement)
          )
            return;
          const o = Array.from(e.parentElement.children),
            r = o.indexOf(e),
            i = gn.get(e);
          i && i.sortStarted(n),
            (vn = {
              didDrop: !1,
              dragging: e,
              dropzone: e,
              sourceList: n,
              sourceSibling: o[r + 1] || null,
              sourceIndex: r,
            });
        }
        function yn(t) {
          if (!vn) return;
          const e = t.currentTarget;
          e instanceof Element &&
            (bn(vn.dragging, e)
              ? (t.preventDefault(),
                t.dataTransfer && (t.dataTransfer.dropEffect = 'move'),
                vn.dropzone !== e &&
                  (vn.dragging.classList.add('is-dragging'),
                  (vn.dropzone = e),
                  !(function(t, e) {
                    if (t.parentNode === e.parentNode) {
                      let n = t;
                      for (; n; ) {
                        if (n === e) return !0;
                        n = n.previousElementSibling;
                      }
                    }
                    return !1;
                  })(vn.dragging, e)
                    ? e.after(vn.dragging)
                    : e.before(vn.dragging)))
              : t.stopPropagation());
        }
        function En(t) {
          if (!vn) return;
          t.preventDefault(), t.stopPropagation();
          const e = t.currentTarget;
          if (!(e instanceof Element)) return;
          if (((vn.didDrop = !0), !vn.dragging.parentElement)) return;
          let n = Array.from(vn.dragging.parentElement.children).indexOf(vn.dragging);
          const o = e.closest('.contains-task-list');
          if (!o) return;
          if (vn.sourceIndex === n && vn.sourceList === o) return;
          vn.sourceList === o && vn.sourceIndex < n && n++;
          const r = { list: vn.sourceList, index: vn.sourceIndex },
            i = { list: o, index: n },
            s = gn.get(vn.dragging);
          s && s.sortFinished({ src: r, dst: i });
        }
        function Tn() {
          vn &&
            (vn.dragging.classList.remove('is-dragging'),
            vn.dragging.classList.remove('is-ghost'),
            vn.didDrop || vn.sourceList.insertBefore(vn.dragging, vn.sourceSibling),
            (vn = null));
        }
        function _n(t) {
          if (!vn) return;
          const e = t.currentTarget;
          e instanceof Element &&
            (bn(vn.dragging, e)
              ? (t.preventDefault(), t.dataTransfer && (t.dataTransfer.dropEffect = 'move'))
              : t.stopPropagation());
        }
        const xn = new WeakMap();
        class TaskListsElement extends HTMLElement {
          constructor() {
            super(),
              this.addEventListener('change', t => {
                const e = t.target;
                e instanceof HTMLInputElement &&
                  e.classList.contains('task-list-item-checkbox') &&
                  this.dispatchEvent(
                    new CustomEvent('task-lists-check', {
                      bubbles: !0,
                      detail: { position: jn(e), checked: e.checked },
                    }),
                  );
              }),
              xn.set(this, new MutationObserver(In.bind(null, this)));
          }
          connectedCallback() {
            const t = xn.get(this);
            t && t.observe(this, { childList: !0, subtree: !0 }), In(this);
          }
          disconnectedCallback() {
            const t = xn.get(this);
            t && t.disconnect();
          }
          get disabled() {
            return this.hasAttribute('disabled');
          }
          set disabled(t) {
            t ? this.setAttribute('disabled', '') : this.removeAttribute('disabled');
          }
          get sortable() {
            return this.hasAttribute('sortable');
          }
          set sortable(t) {
            t ? this.setAttribute('sortable', '') : this.removeAttribute('sortable');
          }
          static get observedAttributes() {
            return ['disabled'];
          }
          attributeChangedCallback(t, e, n) {
            if (e !== n)
              switch (t) {
                case 'disabled':
                  On(this);
              }
          }
        }
        const kn = document.createElement('template');
        kn.innerHTML =
          '\n  <span class="handle">\n    <svg class="drag-handle" aria-hidden="true" width="16" height="15" version="1.1" viewBox="0 0 16 15">\n      <path d="M12,4V5H4V4h8ZM4,8h8V7H4V8Zm0,3h8V10H4v1Z"></path>\n    </svg>\n  </span>';
        const Ln = new WeakMap();
        function Sn(t) {
          if (Ln.get(t)) return;
          Ln.set(t, !0);
          const e = t.closest('task-lists');
          if (!(e instanceof TaskListsElement)) return;
          if (e.querySelectorAll('.task-list-item').length <= 1) return;
          const n = kn.content.cloneNode(!0),
            o = n.querySelector('.handle');
          if ((t.prepend(n), !o)) throw new Error('handle not found');
          o.addEventListener('mouseenter', Hn),
            o.addEventListener('mouseleave', Un),
            (function(t, e, n) {
              gn.set(t, { sortStarted: e, sortFinished: n }),
                t.addEventListener('dragstart', wn),
                t.addEventListener('dragenter', yn),
                t.addEventListener('dragend', Tn),
                t.addEventListener('drop', En),
                t.addEventListener('dragover', _n);
            })(t, Rn, qn),
            t.addEventListener('mouseenter', An),
            t.addEventListener('mouseleave', Cn);
        }
        function An(t) {
          const e = t.currentTarget;
          if (!(e instanceof Element)) return;
          const n = e.closest('task-lists');
          n instanceof TaskListsElement && n.sortable && !n.disabled && e.classList.add('hovered');
        }
        function Cn(t) {
          const e = t.currentTarget;
          e instanceof Element && e.classList.remove('hovered');
        }
        function jn(t) {
          const e = Dn(t);
          if (!e) throw new Error('.contains-task-list not found');
          const n = Array.from(e.children).indexOf(t.closest('.task-list-item'));
          return [Pn(e), n];
        }
        function Dn(t) {
          const e = t.parentElement;
          return e ? e.closest('.contains-task-list') : null;
        }
        function Mn(t) {
          return (
            Dn(t) ===
            (function t(e) {
              const n = Dn(e);
              return n ? t(n) || n : null;
            })(t)
          );
        }
        function In(t) {
          const e = t.querySelectorAll('.contains-task-list > .task-list-item');
          for (const n of e) Mn(n) && Sn(n);
          On(t);
        }
        function On(t) {
          for (const e of t.querySelectorAll('.task-list-item'))
            e.classList.toggle('enabled', !t.disabled);
          for (const e of t.querySelectorAll('.task-list-item-checkbox'))
            e instanceof HTMLInputElement && (e.disabled = t.disabled);
        }
        function Pn(t) {
          const e = t.closest('task-lists');
          if (!e) throw new Error('parent not found');
          return Array.from(e.querySelectorAll('ol, ul')).indexOf(t);
        }
        const Nn = new WeakMap();
        function Rn(t) {
          const e = t.closest('task-lists');
          if (!e) throw new Error('parent not found');
          Nn.set(e, Array.from(e.querySelectorAll('ol, ul')));
        }
        function qn(t) {
          let e = t.src,
            n = t.dst;
          const o = e.list.closest('task-lists');
          if (!o) return;
          const r = Nn.get(o);
          r &&
            (Nn.delete(o),
            o.dispatchEvent(
              new CustomEvent('task-lists-move', {
                bubbles: !0,
                detail: { src: [r.indexOf(e.list), e.index], dst: [r.indexOf(n.list), n.index] },
              }),
            ));
        }
        function Hn(t) {
          const e = t.currentTarget;
          if (!(e instanceof Element)) return;
          const n = e.closest('.task-list-item');
          if (!n) return;
          const o = n.closest('task-lists');
          o instanceof TaskListsElement &&
            o.sortable &&
            !o.disabled &&
            n.setAttribute('draggable', 'true');
        }
        function Un(t) {
          if (vn) return;
          const e = t.currentTarget;
          if (!(e instanceof Element)) return;
          const n = e.closest('.task-list-item');
          n && n.setAttribute('draggable', 'false');
        }
        function Fn(t, e) {
          if (!(t instanceof e)) throw new TypeError('Cannot call a class as a function');
        }
        function Vn(t, e) {
          for (var n = 0; n < e.length; n++) {
            var o = e[n];
            (o.enumerable = o.enumerable || !1),
              (o.configurable = !0),
              'value' in o && (o.writable = !0),
              Object.defineProperty(t, o.key, o);
          }
        }
        function Wn(t, e, n) {
          return e && Vn(t.prototype, e), n && Vn(t, n), t;
        }
        function Xn(t, e, n) {
          return (
            e in t
              ? Object.defineProperty(t, e, {
                  value: n,
                  enumerable: !0,
                  configurable: !0,
                  writable: !0,
                })
              : (t[e] = n),
            t
          );
        }
        window.customElements.get('task-lists') ||
          ((window.TaskListsElement = TaskListsElement),
          window.customElements.define('task-lists', TaskListsElement));
        var Bn = (function() {
          function t(e) {
            Fn(this, t), Xn(this, 'parent', void 0), Xn(this, 'children', []), (this.parent = e);
          }
          return (
            Wn(t, [
              {
                key: 'delete',
                value: function(t) {
                  var e = this.children.indexOf(t);
                  return (
                    -1 !== e &&
                    ((this.children = this.children.slice(0, e).concat(this.children.slice(e + 1))),
                    0 === this.children.length && this.parent.delete(this),
                    !0)
                  );
                },
              },
              {
                key: 'add',
                value: function(t) {
                  return this.children.push(t), this;
                },
              },
            ]),
            t
          );
        })();
        function $n(t) {
          if (!(t instanceof HTMLElement)) return !1;
          var e = t.nodeName.toLowerCase(),
            n = (t.getAttribute('type') || '').toLowerCase();
          return (
            'select' === e ||
            'textarea' === e ||
            ('input' === e &&
              'submit' !== n &&
              'reset' !== n &&
              'checkbox' !== n &&
              'radio' !== n) ||
            t.isContentEditable
          );
        }
        function Gn(t) {
          $n(t)
            ? t.focus()
            : ((t instanceof HTMLAnchorElement && t.href) ||
                'BUTTON' === t.tagName ||
                'SUMMARY' === t.tagName ||
                (function(t) {
                  if (!(t instanceof HTMLElement)) return !1;
                  var e = t.nodeName.toLowerCase(),
                    n = (t.getAttribute('type') || '').toLowerCase();
                  return 'input' === e && ('checkbox' === n || 'radio' === n);
                })(t)) &&
              t.click();
        }
        function Kn(t) {
          return ''
            .concat(t.ctrlKey ? 'Control+' : '')
            .concat(t.altKey ? 'Alt+' : '')
            .concat(t.metaKey ? 'Meta+' : '')
            .concat(t.key);
        }
        var Yn = new ((function() {
            function t(e) {
              Fn(this, t),
                Xn(this, 'parent', null),
                Xn(this, 'children', {}),
                (this.parent = e || null);
            }
            return (
              Wn(t, [
                {
                  key: 'get',
                  value: function(t) {
                    return this.children[t];
                  },
                },
                {
                  key: 'insert',
                  value: function(e) {
                    for (var n = this, o = 0; o < e.length; o += 1) {
                      var r = e[o],
                        i = n.get(r);
                      if (o === e.length - 1)
                        return (
                          i instanceof t && (n.delete(i), (i = null)),
                          i || ((i = new Bn(n)), (n.children[r] = i)),
                          i
                        );
                      i instanceof Bn && (i = null),
                        i || ((i = new t(n)), (n.children[r] = i)),
                        (n = i);
                    }
                    return n;
                  },
                },
                {
                  key: 'delete',
                  value: function(t) {
                    for (var e in this.children) {
                      if (this.children[e] === t) {
                        var n = delete this.children[e];
                        return (
                          0 === Object.keys(this.children).length &&
                            this.parent &&
                            this.parent.delete(this),
                          n
                        );
                      }
                    }
                    return !1;
                  },
                },
              ]),
              t
            );
          })())(),
          zn = new WeakMap(),
          Jn = Yn,
          Qn = null;
        function Zn() {
          (Qn = null), (Jn = Yn);
        }
        function to(t) {
          if (!(t.target instanceof Node && $n(t.target))) {
            null != Qn && clearTimeout(Qn), (Qn = setTimeout(Zn, 1500));
            var e = Jn.get(Kn(t));
            if (e)
              return (
                (Jn = e),
                e instanceof Bn
                  ? (Gn(e.children[e.children.length - 1]), t.preventDefault(), void Zn())
                  : void 0
              );
            Zn();
          }
        }
        function eo(t, e = 0, { start: n = !0, middle: o = !0, once: r = !1 } = {}) {
          var i,
            s = 0,
            a = !1,
            c = function c(...l) {
              if (!a) {
                var u = Date.now() - s;
                (s = Date.now()),
                  n
                    ? ((n = !1), t(...l), r && c.cancel())
                    : ((o && u < e) || !o) &&
                      (clearTimeout(i),
                      (i = setTimeout(
                        function() {
                          (s = Date.now()), t(...l), r && c.cancel();
                        },
                        o ? e - u : e,
                      )));
              }
            };
          return (
            (c.cancel = function() {
              clearTimeout(i), (a = !0);
            }),
            c
          );
        }
        function no() {
          const t = document.getElementById('ajax-error-message');
          t && t.classList.add('visible');
        }
        function oo() {
          const t = document.getElementById('ajax-error-message');
          t && t.classList.remove('visible');
        }
        function ro() {}
        tt('deprecatedAjaxError', '[data-remote]', function(t) {
          dt(t instanceof CustomEvent, 'app/assets/modules/github/behaviors/ajax-error.js:25');
          const { error: e, text: n } = t.detail;
          t.currentTarget === t.target &&
            'abort' !== e &&
            'canceled' !== e &&
            (/<html/.test(n)
              ? (no(), t.stopImmediatePropagation())
              : setTimeout(function() {
                  t.defaultPrevented || no();
                }, 0));
        }),
          tt('deprecatedAjaxSend', '[data-remote]', function() {
            oo();
          }),
          tt('click', '.js-ajax-error-dismiss', function() {
            oo();
          });
        class io {
          constructor() {
            this.previousReceiver = { resolve: ro, reject: ro };
          }
          push(t) {
            return (
              (this.previousReceiver.resolve = this.previousReceiver.reject = ro),
              new Promise((e, n) => {
                const o = { resolve: e, reject: n };
                (this.previousReceiver = o),
                  t.then(
                    function() {
                      o.resolve.apply(this, arguments);
                    },
                    function() {
                      o.reject.apply(this, arguments);
                    },
                  );
              })
            );
          }
        }
        t('U', io);
        class so {
          constructor(t) {
            (this.closed = !1),
              (this.unsubscribe = () => {
                t(), (this.closed = !0);
              });
          }
        }
        function ao(t, e, n, o = !1) {
          return (
            t.addEventListener(e, n, o),
            new so(() => {
              t.removeEventListener(e, n, o);
            })
          );
        }
        function co(...t) {
          return new so(() => {
            for (const e of t) e.unsubscribe();
          });
        }
        function lo(t, e = !1) {
          return (
            uo(t) ||
            (function(t, e) {
              const n = (function(t) {
                return ho instanceof Element ? ho : t.ownerDocument.activeElement;
              })(t);
              return (
                null != n &&
                !(e && n === t) &&
                ((pe(n) && n === t) ||
                  (t.contains(n) &&
                    !(function(t) {
                      if (!(po instanceof Element)) return !1;
                      const e = t.closest(mo);
                      if (!e) return !1;
                      const n = po.closest(mo);
                      return e === n;
                    })(n)))
              );
            })(t, e) ||
            (function(t) {
              return t.matches(':active');
            })(t) ||
            (function(t) {
              return !(!t.closest('.is-dirty') && !t.querySelector('.is-dirty'));
            })(t)
          );
        }
        function uo(t) {
          for (const e of t.querySelectorAll('input, textarea'))
            if ((e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement) && fo(e))
              return !0;
          return !1;
        }
        function fo(t) {
          if (t instanceof HTMLInputElement && ('checkbox' === t.type || 'radio' === t.type)) {
            if (t.checked !== t.defaultChecked) return !0;
          } else if (t.value !== t.defaultValue) return !0;
          return !1;
        }
        let ho, po;
        document.addEventListener('mouseup', function(t) {
          po = t.target;
        });
        const mo = 'a[href], button, summary';
        function go(t, e) {
          return vo(
            (function(t) {
              if (t.activeElement !== t.body) return t.activeElement;
              var e = t.querySelectorAll(':hover'),
                n = e.length;
              if (n) return e[n - 1];
            })(t),
            e,
          );
        }
        function vo(t, e) {
          var n = t;
          if (!n) return Promise.resolve(e());
          var o = n.ownerDocument.documentElement;
          var r = (function(t) {
            for (var e = []; t; ) {
              var n = t.getBoundingClientRect(),
                o = n.top,
                r = n.left;
              e.push({ element: t, top: o, left: r }), (t = t.parentElement);
            }
            return e;
          })(n);
          return Promise.resolve(e()).then(function(t) {
            var e = (function(t) {
              for (var e = 0; e < t.length; e++) {
                var n = t[e];
                if (o.contains(n.element)) return n;
              }
            })(r);
            if (e) {
              n = e.element;
              var i = e.top,
                s = e.left,
                a = n.getBoundingClientRect(),
                c = a.top,
                l = a.left;
              !(function(t, e, n) {
                var o = t.ownerDocument,
                  r = o.defaultView;
                function i(t) {
                  return t.offsetParent
                    ? { top: t.scrollTop, left: t.scrollLeft }
                    : { top: r.pageYOffset, left: r.pageXOffset };
                }
                function s(t, e, n) {
                  if (0 === e && 0 === n) return [0, 0];
                  var s = i(t),
                    a = s.top + n,
                    c = s.left + e;
                  t === o || t === r || t === o.documentElement || t === o.body
                    ? o.defaultView.scrollTo(c, a)
                    : ((t.scrollTop = a), (t.scrollLeft = c));
                  var l = i(t);
                  return [l.left - s.left, l.top - s.top];
                }
                function a(t) {
                  var e = t;
                  if (e.offsetParent && e !== o.body) {
                    for (; e !== o.body; ) {
                      if (!e.parentElement) return;
                      e = e.parentElement;
                      var n = r.getComputedStyle(e),
                        i = n.position,
                        s = n.overflowY,
                        a = n.overflowX;
                      if (
                        'fixed' === i ||
                        'auto' === s ||
                        'auto' === a ||
                        'scroll' === s ||
                        'scroll' === a
                      )
                        break;
                    }
                    return e;
                  }
                }
                var c = a(t),
                  l = 0,
                  u = 0;
                for (; c; ) {
                  var d = s(c, e - l, n - u);
                  if (((l += d[0]), (u += d[1]), l === e && u === n)) break;
                  c = a(c);
                }
              })(n, l - s, c - i);
            }
            return t;
          });
        }
        const bo = new WeakMap();
        function wo(t, e, n = !1) {
          return go(document, () => {
            const o = ot(document, e.trim()),
              r = n && t === t.ownerDocument.activeElement ? o.querySelector('*') : null;
            for (const e of t.querySelectorAll('.js-updatable-content-preserve-scroll-position')) {
              const t = d(e, 'data-updatable-content-scroll-position-id');
              yo.set(t, e.scrollTop);
            }
            t.replaceWith(o), r && r.focus();
          });
        }
        const yo = new Map();
        function Eo(t, e = location.hash) {
          return To(t, _o(e));
        }
        function To(t, e) {
          if ('' !== e) return t.getElementById(e) || t.getElementsByName(e)[0];
        }
        function _o(t) {
          try {
            return decodeURIComponent(t.slice(1));
          } catch (e) {
            return '';
          }
        }
        function xo(t) {
          if (t === window) return 'window';
          const e = [t.nodeName.toLowerCase()],
            n = t.id;
          if (
            (n && e.push(`#${n}`), 'function' == typeof t.getAttribute && t.getAttribute('class'))
          ) {
            const n = (t.getAttribute('class') || '')
              .trim()
              .split(/\s+/)
              .join('.');
            n && e.push(`.${n}`);
          }
          return e.join('');
        }
        Ht('.js-updatable-content-preserve-scroll-position', {
          constructor: HTMLElement,
          add(t) {
            const e = t.getAttribute('data-updatable-content-scroll-position-id');
            if (!e) return;
            const n = yo.get(e);
            null != n && (t.scrollTop = n);
          },
        });
        const ko = new WeakMap();
        function Lo(t, e) {
          const n = (function(t, e) {
            const n = u(t, 'link[rel=pjax-prefetch]', HTMLLinkElement);
            for (const o of n) if (o.href === e) return o;
          })(t, e);
          if (n) {
            const t = ko.get(n);
            return n.remove(), ko.delete(n), t;
          }
        }
        const So = {
            container: null,
            timeout: 650,
            push: !0,
            replace: !1,
            type: 'GET',
            dataType: 'html',
            scrollTo: 0,
          },
          Ao = 20;
        let Co;
        const jo = new io();
        function Do(t, e, n) {
          return t.dispatchEvent(new CustomEvent(e, { bubbles: !0, cancelable: !0, detail: n }));
        }
        function Mo(t) {
          Io({ url: t.url, container: t.container, replace: t.replace });
        }
        function Io(t) {
          const e = { url: '', container: null };
          Object.assign(e, So, t),
            dt('string' == typeof e.url, 'app/assets/modules/github/pjax.js:180'),
            (e.requestUrl = e.url);
          const n = Uo(e.url),
            o = n.hash,
            r = e.container;
          dt(r, 'app/assets/modules/github/pjax.js:186');
          const i = Vo(r);
          'GET' === e.type &&
            ((n.search += `${n.search ? '&' : ''}_pjax=${encodeURIComponent(i)}`),
            (e.url = n.toString())),
            Co ||
              ae(
                (Co = {
                  id: qo(),
                  url: window.location.href,
                  title: document.title,
                  container: i,
                  fragment: e.fragment,
                  timeout: e.timeout,
                }),
                Co.title,
                Co.url,
              ),
            (Mo.options = e),
            dt('string' == typeof e.requestUrl, 'app/assets/modules/github/pjax.js:328');
          let s = Lo(r, e.requestUrl);
          var a, c;
          s ||
            (dt(e.url, 'app/assets/modules/github/pjax.js:331'),
            (s = lt(e.url, {
              method: e.type,
              body: e.data,
              headers: { Accept: 'text/html', 'X-PJAX': 'true', 'X-PJAX-Container': i },
            })),
            'GET' === e.type &&
              'number' == typeof e.timeout &&
              e.timeout > 0 &&
              (s = Promise.race([
                s,
                new Promise((t, n) => {
                  setTimeout(() => {
                    Do(r, 'pjax:timeout') && n(new Error('timeout'));
                  }, e.timeout);
                }),
              ]))),
            !0 === e.push &&
              !0 !== e.replace &&
              ((a = Co.id),
              (c = Ho(r)),
              ($o[a] = c),
              Ko.push(a),
              Yo(Go, 0),
              Yo(Ko, Ao),
              dt('string' == typeof e.requestUrl, 'app/assets/modules/github/pjax.js:359'),
              se(null, '', e.requestUrl)),
            Do(r, 'pjax:start', { url: e.url }),
            Do(r, 'pjax:send'),
            jo.push(s).then(
              async function(t) {
                const n = Co,
                  s = (function() {
                    for (const t of document.getElementsByTagName('meta')) {
                      const e = t.getAttribute('http-equiv');
                      if (e && 'X-PJAX-VERSION' === e.toUpperCase()) return t.content;
                    }
                  })(),
                  a = t.headers.get('X-PJAX-Version'),
                  c = (function(t, e, n) {
                    dt('string' == typeof n.requestUrl, 'app/assets/modules/github/pjax.js:615');
                    const o = { url: Bo(e, n.requestUrl), title: '' },
                      r = /<html/i.test(t);
                    if (
                      'text/html' !== (e.headers.get('Content-Type') || '').split(';', 1)[0].trim()
                    )
                      return o;
                    let i, s;
                    if (r) {
                      const e = t.match(/<head[^>]*>([\s\S.]*)<\/head>/i),
                        n = t.match(/<body[^>]*>([\s\S.]*)<\/body>/i);
                      (i = e ? Array.from(ot(document, e[0]).childNodes) : []),
                        (s = n ? Array.from(ot(document, n[0]).childNodes) : []);
                    } else i = s = Array.from(ot(document, t).childNodes);
                    if (0 === s.length) return o;
                    const a = Wo(i, 'title', HTMLTitleElement);
                    let c;
                    if (((o.title = a.length > 0 ? a[a.length - 1].textContent : ''), n.fragment)) {
                      if ('body' === n.fragment) c = s;
                      else {
                        const t = Wo(s, n.fragment, Element);
                        c = t.length > 0 ? [t[0]] : [];
                      }
                      if (
                        c.length &&
                        ('body' === n.fragment
                          ? (o.contents = c)
                          : (o.contents = c.reduce(
                              (t, e) => t.concat(Array.from(e.childNodes)),
                              [],
                            )),
                        !o.title)
                      ) {
                        const t = c[0];
                        t instanceof Element &&
                          (o.title = t.getAttribute('title') || t.getAttribute('data-title') || '');
                      }
                    } else r || (o.contents = s);
                    if (o.contents) {
                      o.contents = o.contents.filter(function(t) {
                        return !(t instanceof Element && t.matches('title'));
                      });
                      for (const e of o.contents)
                        if (e instanceof Element)
                          for (const t of e.querySelectorAll('title')) t.remove();
                      const t = Wo(o.contents, 'script[src]', HTMLScriptElement);
                      for (const e of t) e.remove();
                      (o.scripts = t),
                        dt(o.contents, 'app/assets/modules/github/pjax.js:707'),
                        (o.contents = o.contents.filter(e => -1 === t.indexOf(e)));
                    }
                    return o.title && (o.title = o.title.trim()), o;
                  })(await t.text(), t, e),
                  { contents: l } = c,
                  d = Uo(c.url);
                if ((o && ((d.hash = o), (c.url = d.href)), s && a && s !== a))
                  return void Oo(c.url);
                if (!l) return void Oo(c.url);
                (Co = {
                  id: null != e.id ? e.id : qo(),
                  url: c.url,
                  title: c.title,
                  container: i,
                  fragment: e.fragment,
                  timeout: e.timeout,
                }),
                  (!0 !== e.push && !0 !== e.replace) || ae(Co, c.title, c.url);
                const f = document.activeElement,
                  h = null != e.container && e.container.contains(f);
                if (f && h)
                  try {
                    f.blur();
                  } catch (g) {}
                c.title && (document.title = c.title),
                  Do(r, 'pjax:beforeReplace', { contents: l, state: Co, previousState: n }),
                  Xo(r, l);
                const p = u(r, 'input[autofocus], textarea[autofocus]').pop();
                p && document.activeElement !== p && p.focus(),
                  (function(t) {
                    if (!t) return;
                    const e = u(document, 'script[src]', HTMLScriptElement);
                    for (const n of t) {
                      const { src: t } = n;
                      if (e.some(e => e.src === t)) return;
                      const o = document.createElement('script'),
                        r = n.getAttribute('type');
                      r && (o.type = r), (o.src = t), document.head && document.head.appendChild(o);
                    }
                  })(c.scripts);
                let m = e.scrollTo;
                if (o) {
                  const t = Eo(document, o);
                  t && (m = t.getBoundingClientRect().top + window.pageYOffset);
                }
                'number' == typeof m && window.scrollTo(window.pageXOffset, m),
                  Do(r, 'pjax:success'),
                  Do(r, 'pjax:complete'),
                  Do(r, 'pjax:end');
              },
              function(t) {
                let n = e.requestUrl;
                dt('string' == typeof n, 'app/assets/modules/github/pjax.js:200'),
                  t.response && (n = Bo(t.response, n));
                const o = Do(r, 'pjax:error');
                'GET' === e.type && o && Oo(n), Do(r, 'pjax:complete'), Do(r, 'pjax:end');
              },
            );
        }
        function Oo(t) {
          dt(Co, 'app/assets/modules/github/pjax.js:410'),
            ae(null, '', Co.url),
            window.location.replace(t);
        }
        let Po = !0;
        const No = window.location.href,
          Ro = window.history.state;
        function qo() {
          return new Date().getTime();
        }
        function Ho(t) {
          const e = t.cloneNode(!0);
          return [Vo(t), Array.from(e.childNodes), Date.now()];
        }
        function Uo(t) {
          const e = document.createElement('a');
          return (e.href = t), e;
        }
        function Fo(t) {
          return t.href.replace(/#.*/, '');
        }
        function Vo(t) {
          if (t.id) return `#${t.id}`;
          throw new Error('pjax container has no id');
        }
        function Wo(t, e, n) {
          let o = [];
          for (const r of t)
            r instanceof Element &&
              (r instanceof n && r.matches(e) && o.push(r), (o = o.concat(u(r, e, n))));
          return o;
        }
        function Xo(t, e) {
          t.innerHTML = '';
          for (const n of e) null != n && t.appendChild(n);
        }
        function Bo(t, e) {
          const n = t.headers.get('X-PJAX-URL');
          return n
            ? (((o = Uo(n)).search = o.search.replace(/([?&])(_pjax|_)=[^&]*/g, '')),
              o.href.replace(/\?($|#)/, '$1'))
            : e;
          var o;
        }
        Ro && Ro.container && (Co = Ro), 'state' in window.history && (Po = !1);
        const $o = {},
          Go = [],
          Ko = [];
        function Yo(t, e) {
          for (; t.length > e; ) delete $o[t.shift()];
        }
        function zo(t) {
          return !(function(t) {
            return t.offsetWidth <= 0 && t.offsetHeight <= 0;
          })(t);
        }
        function Jo(t) {
          return t.dispatchEvent(new CustomEvent('change', { bubbles: !0, cancelable: !1 }));
        }
        window.addEventListener('popstate', function(t) {
          Po || jo.push(Promise.resolve(new Response()));
          const e = Co,
            n = t.state;
          let o;
          if (n && n.container) {
            if (Po && No === n.url) return;
            if (e) {
              if (e.id === n.id) return;
              o = e.id < n.id ? 'forward' : 'back';
            }
            const [t, r, i] = $o[n.id] || [],
              s = document.querySelector(t || n.container);
            if (s) {
              e &&
                (function(t, e, n) {
                  let o, r;
                  ($o[e] = n),
                    'forward' === t ? ((o = Ko), (r = Go)) : ((o = Go), (r = Ko)),
                    o.push(e);
                  const i = r.pop();
                  i && delete $o[i], Yo(o, Ao);
                })(o, e.id, Ho(s)),
                Do(s, 'pjax:popstate', { state: n, direction: o, cachedAt: i });
              const t = {
                id: n.id,
                url: n.url,
                container: s,
                push: !1,
                fragment: n.fragment || '',
                timeout: n.timeout || 0,
                scrollTo: !1,
              };
              r
                ? (Do(s, 'pjax:start'),
                  (Co = n),
                  n.title && (document.title = n.title),
                  Do(s, 'pjax:beforeReplace', { contents: r, state: n, previousState: e }),
                  Xo(s, r),
                  Do(s, 'pjax:end'))
                : Io(t),
                s.offsetHeight;
            } else Oo(location.href);
          }
          Po = !1;
        });
        const Qo = [];
        let Zo = 0;
        function tr(t) {
          !(async function() {
            Qo.push(t),
              await Vt,
              (function() {
                const t = Zo;
                (Zo = Qo.length), er(Qo.slice(t), null, window.location.href);
              })();
          })();
        }
        function er(t, e, n) {
          const o = window.location.hash.slice(1),
            r = { oldURL: e, newURL: n, target: o && document.getElementById(o) };
          for (const i of t) i.call(null, r);
        }
        tr.clear = () => {
          Qo.length = Zo = 0;
        };
        let nr = window.location.href;
        window.addEventListener('popstate', function() {
          nr = window.location.href;
        }),
          window.addEventListener('hashchange', function(t) {
            const e = window.location.href;
            try {
              er(Qo, t.oldURL || nr, e);
            } finally {
              nr = e;
            }
          });
        let or = null;
        function rr(t) {
          let e = t;
          const n = e.ownerDocument;
          if (!n) return;
          if (!e.offsetParent) return;
          const o = n.defaultView.HTMLElement;
          if (e !== n.body) {
            for (; e !== n.body; ) {
              if (!(e.parentElement instanceof o)) return;
              e = e.parentElement;
              const { position: t, overflowY: n, overflowX: r } = getComputedStyle(e);
              if ('fixed' === t || 'auto' === n || 'auto' === r || 'scroll' === n || 'scroll' === r)
                break;
            }
            return e instanceof Document ? null : e;
          }
        }
        function ir(t, e) {
          let n = e;
          const o = t.ownerDocument;
          if (!o) return;
          if (!o.body) return;
          const r = o.documentElement;
          if (!r) return;
          if (t === r) return;
          const i = sr(t, n);
          if (!i) return;
          const s =
              (n = i._container) === o.documentElement
                ? { top: o.defaultView.pageYOffset, left: o.defaultView.pageXOffset }
                : { top: n.scrollTop, left: n.scrollLeft },
            a = i.top - s.top,
            c = i.left - s.left,
            l = n.clientHeight,
            u = n.clientWidth;
          return {
            top: a,
            left: c,
            bottom: l - (a + t.offsetHeight),
            right: u - (c + t.offsetWidth),
            height: l,
            width: u,
          };
        }
        function sr(t, e) {
          let n = t;
          const o = n.ownerDocument;
          if (!o) return;
          const r = o.documentElement;
          if (!r) return;
          const i = o.body;
          if (!i) return;
          const s = o.defaultView.HTMLElement;
          let a = 0,
            c = 0;
          const l = n.offsetHeight,
            u = n.offsetWidth;
          for (; n !== o.body && n !== e; ) {
            if (((a += n.offsetTop || 0), (c += n.offsetLeft || 0), !(n.offsetParent instanceof s)))
              return;
            n = n.offsetParent;
          }
          let d, f, h;
          if (e && e !== o && e !== o.defaultView && e !== o.documentElement && e !== o.body) {
            if (!(e instanceof s)) return;
            (h = e), (d = e.scrollHeight), (f = e.scrollWidth);
          } else
            (h = r),
              (d = (function(t, e) {
                return Math.max(
                  t.scrollHeight,
                  e.scrollHeight,
                  t.offsetHeight,
                  e.offsetHeight,
                  e.clientHeight,
                );
              })(i, r)),
              (f = (function(t, e) {
                return Math.max(
                  t.scrollWidth,
                  e.scrollWidth,
                  t.offsetWidth,
                  e.offsetWidth,
                  e.clientWidth,
                );
              })(i, r));
          return { top: a, left: c, bottom: d - (a + l), right: f - (c + u), _container: h };
        }
        function ar(t, e) {
          let n = t;
          const o = t.ownerDocument;
          (n !== o && n !== o.defaultView && n !== o.documentElement && n !== o.body) || (n = o);
          const r = o.defaultView.Document,
            i = o.defaultView.HTMLElement;
          if (n instanceof r) {
            const t = null != e.top ? e.top : o.defaultView.pageYOffset,
              n = null != e.left ? e.left : o.defaultView.pageXOffset;
            o.defaultView.scrollTo(n, t);
          } else {
            if (!(n instanceof i)) throw new Error('container is not HTMLElement');
            (n.scrollTop = e.top), null != e.left && (n.scrollLeft = e.left);
          }
        }
        document.addEventListener('pjax:start', function() {
          or = window.location.href;
        }),
          document.addEventListener('pjax:end', function() {
            er(Qo, or, window.location.href);
          }),
          (function() {
            var t = function(t) {
              this.w = t || [];
            };
            (t.prototype.set = function(t) {
              this.w[t] = !0;
            }),
              (t.prototype.encode = function() {
                for (var t = [], e = 0; e < this.w.length; e++)
                  this.w[e] && (t[Math.floor(e / 6)] ^= 1 << e % 6);
                for (e = 0; e < t.length; e++)
                  t[e] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'.charAt(
                    t[e] || 0,
                  );
                return t.join('') + '~';
              });
            var e = new t();
            function n(t) {
              e.set(t);
            }
            var o = function(e, n) {
                var o = new t(i(e));
                o.set(n), e.set(se, o.w);
              },
              r = function(n) {
                (n = i(n)), (n = new t(n));
                for (var o = e.w.slice(), r = 0; r < n.w.length; r++) o[r] = o[r] || n.w[r];
                return new t(o).encode();
              },
              i = function(t) {
                return (t = t.get(se)), a(t) || (t = []), t;
              },
              s = function(t) {
                return 'function' == typeof t;
              },
              a = function(t) {
                return '[object Array]' == Object.prototype.toString.call(Object(t));
              },
              c = function(t) {
                return null != t && -1 < (t.constructor + '').indexOf('String');
              },
              l = function(t, e) {
                return 0 == t.indexOf(e);
              },
              u = function(t) {
                return t ? t.replace(/^[\s\xa0]+|[\s\xa0]+$/g, '') : '';
              },
              d = function(t) {
                var e = _.createElement('img');
                return (e.width = 1), (e.height = 1), (e.src = t), e;
              },
              f = function() {},
              h = function(t) {
                return encodeURIComponent instanceof Function ? encodeURIComponent(t) : (n(28), t);
              },
              p = function(t, e, o, r) {
                try {
                  t.addEventListener
                    ? t.addEventListener(e, o, !!r)
                    : t.attachEvent && t.attachEvent('on' + e, o);
                } catch (i) {
                  n(27);
                }
              },
              m = /^[\w\-:\/.?=&%!]+$/,
              g = function(t, e, n, o) {
                t &&
                  (n
                    ? ((o = ''),
                      e && m.test(e) && (o = ' id="' + e + '"'),
                      m.test(t) && _.write('<script' + o + ' src="' + t + '"></script>'))
                    : (((n = _.createElement('script')).type = 'text/javascript'),
                      (n.async = !0),
                      (n.src = t),
                      o && (n.onload = o),
                      e && (n.id = e),
                      (t = _.getElementsByTagName('script')[0]).parentNode.insertBefore(n, t)));
              },
              v = function() {
                return 'https:' == _.location.protocol;
              },
              b = function(t, e) {
                return (t = t.match(
                  '(?:&|#|\\?)' + h(e).replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1') + '=([^&#]*)',
                )) && 2 == t.length
                  ? t[1]
                  : '';
              },
              w = function() {
                var t = '' + _.location.hostname;
                return 0 == t.indexOf('www.') ? t.substring(4) : t;
              },
              y = function(t, e) {
                if (1 == e.length && null != e[0] && 'object' == typeof e[0]) return e[0];
                for (var n = {}, o = Math.min(t.length + 1, e.length), r = 0; r < o; r++) {
                  if ('object' == typeof e[r]) {
                    for (var i in e[r]) e[r].hasOwnProperty(i) && (n[i] = e[r][i]);
                    break;
                  }
                  r < t.length && (n[t[r]] = e[r]);
                }
                return n;
              },
              E = function() {
                (this.keys = []), (this.values = {}), (this.m = {});
              };
            (E.prototype.set = function(t, e, n) {
              this.keys.push(t), n ? (this.m[':' + t] = e) : (this.values[':' + t] = e);
            }),
              (E.prototype.get = function(t) {
                return this.m.hasOwnProperty(':' + t) ? this.m[':' + t] : this.values[':' + t];
              }),
              (E.prototype.map = function(t) {
                for (var e = 0; e < this.keys.length; e++) {
                  var n = this.keys[e],
                    o = this.get(n);
                  o && t(n, o);
                }
              });
            var T = window,
              _ = document,
              x = window,
              k = function(t) {
                var e = x._gaUserPrefs;
                if ((e && e.ioo && e.ioo()) || (t && !0 === x['ga-disable-' + t])) return !0;
                try {
                  var n = x.external;
                  if (n && n._gaUserPrefs && 'oo' == n._gaUserPrefs) return !0;
                } catch (o) {}
                return !1;
              },
              L = function(t) {
                var e = [],
                  n = _.cookie.split(';');
                t = new RegExp('^\\s*' + t + '=\\s*(.*?)\\s*$');
                for (var o = 0; o < n.length; o++) {
                  var r = n[o].match(t);
                  r && e.push(r[1]);
                }
                return e;
              },
              S = function(t, e, o, r, i, s) {
                if (!(i = !k(i) && !(j.test(_.location.hostname) || ('/' == o && C.test(r)))))
                  return !1;
                if (
                  (e && 1200 < e.length && ((e = e.substring(0, 1200)), n(24)),
                  (o = t + '=' + e + '; path=' + o + '; '),
                  s && (o += 'expires=' + new Date(new Date().getTime() + s).toGMTString() + '; '),
                  r && 'none' != r && (o += 'domain=' + r + ';'),
                  (r = _.cookie),
                  (_.cookie = o),
                  !(r = r != _.cookie))
                )
                  t: {
                    for (t = L(t), r = 0; r < t.length; r++)
                      if (e == t[r]) {
                        r = !0;
                        break t;
                      }
                    r = !1;
                  }
                return r;
              },
              A = function(t) {
                return h(t)
                  .replace(/\(/g, '%28')
                  .replace(/\)/g, '%29');
              },
              C = /^(www\.)?google(\.com?)?(\.[a-z]{2})?$/,
              j = /(^|\.)doubleclick\.net$/i,
              D = function() {
                return (dt || v() ? 'https:' : 'http:') + '//www.google-analytics.com';
              },
              M = function(t) {
                (this.name = 'len'), (this.message = t + '-8192');
              },
              I = function(t, e, n) {
                if (((n = n || f), 2036 >= e.length)) O(t, e, n);
                else {
                  if (!(8192 >= e.length)) throw (R('len', e.length), new M(e.length));
                  N(t, e, n) || P(t, e, n) || O(t, e, n);
                }
              },
              O = function(t, e, n) {
                var o = d(t + '?' + e);
                o.onload = o.onerror = function() {
                  (o.onload = null), (o.onerror = null), n();
                };
              },
              P = function(t, e, n) {
                var o = T.XMLHttpRequest;
                if (!o) return !1;
                var r = new o();
                return (
                  'withCredentials' in r &&
                  (r.open('POST', t, !0),
                  (r.withCredentials = !0),
                  r.setRequestHeader('Content-Type', 'text/plain'),
                  (r.onreadystatechange = function() {
                    4 == r.readyState && (n(), (r = null));
                  }),
                  r.send(e),
                  !0)
                );
              },
              N = function(t, e, n) {
                return !!T.navigator.sendBeacon && (!!T.navigator.sendBeacon(t, e) && (n(), !0));
              },
              R = function(t, e, n) {
                1 <= 100 * Math.random() ||
                  k('?') ||
                  ((t = ['t=error', '_e=' + t, '_v=j48', 'sr=1']),
                  e && t.push('_f=' + e),
                  n && t.push('_m=' + h(n.substring(0, 100))),
                  t.push('aip=1'),
                  t.push('z=' + Y()),
                  O(D() + '/collect', t.join('&'), f));
              },
              q = function(t) {
                var e = (T.gaData = T.gaData || {});
                return (e[t] = e[t] || {});
              },
              H = function() {
                this.M = [];
              };
            function U(t) {
              if (100 != t.get(Ne) && Jn(et(t, _e)) % 1e4 >= 100 * nt(t, Ne)) throw 'abort';
            }
            function F(t) {
              if (k(et(t, Le))) throw 'abort';
            }
            function V() {
              var t = _.location.protocol;
              if ('http:' != t && 'https:' != t) throw 'abort';
            }
            function W(t) {
              try {
                T.navigator.sendBeacon
                  ? n(42)
                  : T.XMLHttpRequest && 'withCredentials' in new T.XMLHttpRequest() && n(40);
              } catch (o) {}
              t.set(ie, r(t), !0), t.set(yt, nt(t, yt) + 1);
              var e = [];
              Z.map(function(n, o) {
                o.F &&
                  (null != (n = t.get(n)) &&
                    n != o.defaultValue &&
                    ('boolean' == typeof n && (n *= 1), e.push(o.F + '=' + h('' + n))));
              }),
                e.push('z=' + z()),
                t.set(vt, e.join('&'), !0);
            }
            function X(t) {
              var e = et(t, He) || D() + '/collect',
                n = et(t, wt);
              if ((!n && t.get(bt) && (n = 'beacon'), n)) {
                var o = et(t, vt),
                  r = (r = t.get(gt)) || f;
                'image' == n
                  ? O(e, o, r)
                  : ('xhr' == n && P(e, o, r)) || ('beacon' == n && N(e, o, r)) || I(e, o, r);
              } else I(e, et(t, vt), t.get(gt));
              (e = t.get(Le)),
                (n = (e = q(e)).hitcount),
                (e.hitcount = n ? n + 1 : 1),
                (e = t.get(Le)),
                delete q(e).pending_experiments,
                t.set(gt, f, !0);
            }
            function B(t) {
              var e;
              (T.gaData = T.gaData || {}).expId && t.set(zt, (T.gaData = T.gaData || {}).expId),
                (T.gaData = T.gaData || {}).expVar && t.set(Jt, (T.gaData = T.gaData || {}).expVar);
              var n = t.get(Le);
              if ((n = q(n).pending_experiments)) {
                var o = [];
                for (e in n)
                  n.hasOwnProperty(e) &&
                    n[e] &&
                    o.push(encodeURIComponent(e) + '.' + encodeURIComponent(n[e]));
                e = o.join('!');
              } else e = void 0;
              e && t.set(Qt, e, !0);
            }
            function $() {
              if (T.navigator && 'preview' == T.navigator.loadPurpose) throw 'abort';
            }
            function G(t) {
              var e = T.gaDevIds;
              a(e) && 0 != e.length && t.set('&did', e.join(','), !0);
            }
            function K(t) {
              if (!t.get(Le)) throw 'abort';
            }
            (H.prototype.add = function(t) {
              this.M.push(t);
            }),
              (H.prototype.D = function(t) {
                try {
                  for (var e = 0; e < this.M.length; e++) {
                    var n = t.get(this.M[e]);
                    n && s(n) && n.call(T, t);
                  }
                } catch (o) {}
                (e = t.get(gt)) != f && s(e) && (t.set(gt, f, !0), setTimeout(e, 10));
              });
            var Y = function() {
                return Math.round(2147483647 * Math.random());
              },
              z = function() {
                try {
                  var t = new Uint32Array(1);
                  return T.crypto.getRandomValues(t), 2147483647 & t[0];
                } catch (e) {
                  return Y();
                }
              };
            function J(t) {
              var e = nt(t, ne);
              if ((500 <= e && n(15), 'transaction' != (o = et(t, mt)) && 'item' != o)) {
                var o = nt(t, re),
                  r = new Date().getTime(),
                  i = nt(t, oe);
                if (
                  (0 == i && t.set(oe, r),
                  0 < (i = Math.round((2 * (r - i)) / 1e3)) &&
                    ((o = Math.min(o + i, 20)), t.set(oe, r)),
                  0 >= o)
                )
                  throw 'abort';
                t.set(re, --o);
              }
              t.set(ne, ++e);
            }
            var Q = function() {
                this.data = new E();
              },
              Z = new E(),
              tt = [];
            Q.prototype.get = function(t) {
              var e = it(t),
                n = this.data.get(t);
              return (
                e && null == n && (n = s(e.defaultValue) ? e.defaultValue() : e.defaultValue),
                e && e.Z ? e.Z(this, t, n) : n
              );
            };
            var et = function(t, e) {
                return null == (t = t.get(e)) ? '' : '' + t;
              },
              nt = function(t, e) {
                return null == (t = t.get(e)) || '' === t ? 0 : 1 * t;
              };
            Q.prototype.set = function(t, e, n) {
              if (t)
                if ('object' == typeof t)
                  for (var o in t) t.hasOwnProperty(o) && ot(this, o, t[o], n);
                else ot(this, t, e, n);
            };
            var ot = function(t, e, n, o) {
                if (null != n)
                  switch (e) {
                    case Le:
                      Ln.test(n);
                  }
                var r = it(e);
                r && r.o ? r.o(t, e, n, o) : t.data.set(e, n, o);
              },
              rt = function(t, e, n, o, r) {
                (this.name = t), (this.F = e), (this.Z = o), (this.o = r), (this.defaultValue = n);
              },
              it = function(t) {
                var e = Z.get(t);
                if (!e)
                  for (var n = 0; n < tt.length; n++) {
                    var o = tt[n],
                      r = o[0].exec(t);
                    if (r) {
                      (e = o[1](r)), Z.set(e.name, e);
                      break;
                    }
                  }
                return e;
              },
              st = function(t, e, n, o, r) {
                return (t = new rt(t, e, n, o, r)), Z.set(t.name, t), t.name;
              },
              at = function(t, e) {
                tt.push([new RegExp('^' + t + '$'), e]);
              },
              ct = function(t, e, n) {
                return st(t, e, n, void 0, lt);
              },
              lt = function() {},
              ut = (c(window.GoogleAnalyticsObject) && u(window.GoogleAnalyticsObject)) || 'ga',
              dt = !1,
              ft = ct('apiVersion', 'v'),
              ht = ct('clientVersion', '_v');
            st('anonymizeIp', 'aip');
            var pt = st('adSenseId', 'a'),
              mt = st('hitType', 't'),
              gt = st('hitCallback'),
              vt = st('hitPayload');
            st('nonInteraction', 'ni'), st('currencyCode', 'cu'), st('dataSource', 'ds');
            var bt = st('useBeacon', void 0, !1),
              wt = st('transport');
            st('sessionControl', 'sc', ''), st('sessionGroup', 'sg'), st('queueTime', 'qt');
            var yt = st('_s', '_s');
            st('screenName', 'cd');
            var Et = st('location', 'dl', ''),
              Tt = st('referrer', 'dr'),
              _t = st('page', 'dp', '');
            st('hostname', 'dh');
            var xt = st('language', 'ul'),
              kt = st('encoding', 'de');
            st('title', 'dt', function() {
              return _.title || void 0;
            }),
              at('contentGroup([0-9]+)', function(t) {
                return new rt(t[0], 'cg' + t[1]);
              });
            var Lt = st('screenColors', 'sd'),
              St = st('screenResolution', 'sr'),
              At = st('viewportSize', 'vp'),
              Ct = st('javaEnabled', 'je'),
              jt = st('flashVersion', 'fl');
            st('campaignId', 'ci'),
              st('campaignName', 'cn'),
              st('campaignSource', 'cs'),
              st('campaignMedium', 'cm'),
              st('campaignKeyword', 'ck'),
              st('campaignContent', 'cc');
            var Dt = st('eventCategory', 'ec'),
              Mt = st('eventAction', 'ea'),
              It = st('eventLabel', 'el'),
              Ot = st('eventValue', 'ev'),
              Pt = st('socialNetwork', 'sn'),
              Nt = st('socialAction', 'sa'),
              Rt = st('socialTarget', 'st'),
              qt = st('l1', 'plt'),
              Ht = st('l2', 'pdt'),
              Ut = st('l3', 'dns'),
              Ft = st('l4', 'rrt'),
              Vt = st('l5', 'srt'),
              Wt = st('l6', 'tcp'),
              Xt = st('l7', 'dit'),
              Bt = st('l8', 'clt'),
              $t = st('timingCategory', 'utc'),
              Gt = st('timingVar', 'utv'),
              Kt = st('timingLabel', 'utl'),
              Yt = st('timingValue', 'utt');
            st('appName', 'an'),
              st('appVersion', 'av', ''),
              st('appId', 'aid', ''),
              st('appInstallerId', 'aiid', ''),
              st('exDescription', 'exd'),
              st('exFatal', 'exf');
            var zt = st('expId', 'xid'),
              Jt = st('expVar', 'xvar'),
              Qt = st('exp', 'exp'),
              Zt = st('_utma', '_utma'),
              te = st('_utmz', '_utmz'),
              ee = st('_utmht', '_utmht'),
              ne = st('_hc', void 0, 0),
              oe = st('_ti', void 0, 0),
              re = st('_to', void 0, 20);
            at('dimension([0-9]+)', function(t) {
              return new rt(t[0], 'cd' + t[1]);
            }),
              at('metric([0-9]+)', function(t) {
                return new rt(t[0], 'cm' + t[1]);
              }),
              st(
                'linkerParam',
                void 0,
                void 0,
                function(t) {
                  var e = ln((t = t.get(_e)), 0);
                  return '_ga=1.' + h(e + '.' + t);
                },
                lt,
              );
            var ie = st('usage', '_u'),
              se = st('_um');
            st(
              'forceSSL',
              void 0,
              void 0,
              function() {
                return dt;
              },
              function(t, e, o) {
                n(34), (dt = !!o);
              },
            );
            var ae = st('_j1', 'jid');
            at('\\&(.*)', function(t) {
              var e = new rt(t[0], t[1]),
                n = (function(t) {
                  var e;
                  return (
                    Z.map(function(n, o) {
                      o.F == t && (e = o);
                    }),
                    e && e.name
                  );
                })(t[0].substring(1));
              return (
                n &&
                  ((e.Z = function(t) {
                    return t.get(n);
                  }),
                  (e.o = function(t, e, o, r) {
                    t.set(n, o, r);
                  }),
                  (e.F = void 0)),
                e
              );
            });
            var ce = ct('_oot'),
              le = st('previewTask'),
              ue = st('checkProtocolTask'),
              de = st('validationTask'),
              fe = st('checkStorageTask'),
              he = st('historyImportTask'),
              pe = st('samplerTask'),
              me = st('_rlt'),
              ge = st('buildHitTask'),
              ve = st('sendHitTask'),
              be = st('ceTask'),
              we = st('devIdTask'),
              ye = st('timingTask'),
              Ee = st('displayFeaturesTask'),
              Te = ct('name'),
              _e = ct('clientId', 'cid'),
              xe = ct('clientIdTime'),
              ke = st('userId', 'uid'),
              Le = ct('trackingId', 'tid'),
              Se = ct('cookieName', void 0, '_ga'),
              Ae = ct('cookieDomain'),
              Ce = ct('cookiePath', void 0, '/'),
              je = ct('cookieExpires', void 0, 63072e3),
              De = ct('legacyCookieDomain'),
              Me = ct('legacyHistoryImport', void 0, !0),
              Ie = ct('storage', void 0, 'cookie'),
              Oe = ct('allowLinker', void 0, !1),
              Pe = ct('allowAnchor', void 0, !0),
              Ne = ct('sampleRate', 'sf', 100),
              Re = ct('siteSpeedSampleRate', void 0, 1),
              qe = ct('alwaysSendReferrer', void 0, !1),
              He = st('transportUrl'),
              Ue = st('_r', '_r');
            function Fe(t, e, o, r) {
              e[t] = function() {
                try {
                  return r && n(r), o.apply(this, arguments);
                } catch (e) {
                  throw (R('exc', t, e && e.name), e);
                }
              };
            }
            var Ve = function(t, e, n) {
                (this.V = t), (this.fa = e), (this.$ = !1), (this.oa = n), (this.ea = 1);
              },
              We = function(t, e) {
                var n;
                if (t.fa && t.$) return 0;
                if (((t.$ = !0), e)) {
                  if (t.oa && nt(e, t.oa)) return nt(e, t.oa);
                  if (0 == e.get(Re)) return 0;
                }
                return 0 == t.V
                  ? 0
                  : (void 0 === n && (n = z()),
                    0 == n % t.V ? (Math.floor(n / t.V) % t.ea) + 1 : 0);
              };
            var Xe = function(t) {
                var e = {};
                if (Be(e) || $e(e)) {
                  var n = e[qt];
                  null == n ||
                    1 / 0 == n ||
                    isNaN(n) ||
                    (0 < n
                      ? (Ge(e, Ut),
                        Ge(e, Wt),
                        Ge(e, Vt),
                        Ge(e, Ht),
                        Ge(e, Ft),
                        Ge(e, Xt),
                        Ge(e, Bt),
                        t(e))
                      : p(
                          T,
                          'load',
                          function() {
                            Xe(t);
                          },
                          !1,
                        ));
                }
              },
              Be = function(t) {
                var e;
                if (!(e = (e = T.performance || T.webkitPerformance) && e.timing)) return !1;
                var n = e.navigationStart;
                return (
                  0 != n &&
                  ((t[qt] = e.loadEventStart - n),
                  (t[Ut] = e.domainLookupEnd - e.domainLookupStart),
                  (t[Wt] = e.connectEnd - e.connectStart),
                  (t[Vt] = e.responseStart - e.requestStart),
                  (t[Ht] = e.responseEnd - e.responseStart),
                  (t[Ft] = e.fetchStart - n),
                  (t[Xt] = e.domInteractive - n),
                  (t[Bt] = e.domContentLoadedEventStart - n),
                  !0)
                );
              },
              $e = function(t) {
                if (T.top != T) return !1;
                var e = T.external,
                  n = e && e.onloadT;
                return (
                  e && !e.isValidLoadTime && (n = void 0),
                  2147483648 < n && (n = void 0),
                  0 < n && e.setPageReadyTime(),
                  null != n && ((t[qt] = n), !0)
                );
              },
              Ge = function(t, e) {
                var n = t[e];
                (isNaN(n) || 1 / 0 == n || 0 > n) && (t[e] = void 0);
              },
              Ke = function(t) {
                return function(e) {
                  if ('pageview' == e.get(mt) && !t.I) {
                    t.I = !0;
                    var n = (function(t) {
                      var e = Math.min(nt(t, Re), 100);
                      return !(Jn(et(t, _e)) % 100 >= e);
                    })(e);
                    (e = 0 < b(e.get(Et), 'gclid').length),
                      (n || e) &&
                        Xe(function(e) {
                          t.send(n ? 'timing' : 'adtiming', e);
                        });
                  }
                };
              },
              Ye = !1,
              ze = function(t) {
                if ('cookie' == et(t, Ie)) {
                  var e = et(t, Se),
                    o = Ze(t),
                    r = nn(et(t, Ce)),
                    i = en(et(t, Ae)),
                    s = 1e3 * nt(t, je),
                    a = et(t, Le);
                  if ('auto' != i) S(e, o, r, i, a, s) && (Ye = !0);
                  else {
                    var c;
                    if (
                      (n(32),
                      (o = []),
                      4 != (i = w().split('.')).length ||
                        ((c = i[i.length - 1]), parseInt(c, 10) != c))
                    ) {
                      for (c = i.length - 2; 0 <= c; c--) o.push(i.slice(c).join('.'));
                      o.push('none'), (c = o);
                    } else c = ['none'];
                    for (var l = 0; l < c.length; l++)
                      if (((i = c[l]), t.data.set(Ae, i), (o = Ze(t)), S(e, o, r, i, a, s)))
                        return void (Ye = !0);
                    t.data.set(Ae, 'auto');
                  }
                }
              },
              Je = function(t) {
                if ('cookie' == et(t, Ie) && !Ye && (ze(t), !Ye)) throw 'abort';
              },
              Qe = function(t) {
                if (t.get(Me)) {
                  var e = et(t, Ae),
                    o = et(t, De) || w(),
                    r = rn('__utma', o, e);
                  r &&
                    (n(19),
                    t.set(ee, new Date().getTime(), !0),
                    t.set(Zt, r.R),
                    (e = rn('__utmz', o, e)) && r.hash == e.hash && t.set(te, e.R));
                }
              },
              Ze = function(t) {
                var e = A(et(t, _e)),
                  n = en(et(t, Ae)).split('.').length;
                return 1 < (t = on(et(t, Ce))) && (n += '-' + t), ['GA1', n, e].join('.');
              },
              tn = function(t, e, n) {
                for (var o, r = [], i = [], s = 0; s < t.length; s++) {
                  var a = t[s];
                  a.H[n] == e
                    ? r.push(a)
                    : null == o || a.H[n] < o
                    ? ((i = [a]), (o = a.H[n]))
                    : a.H[n] == o && i.push(a);
                }
                return 0 < r.length ? r : i;
              },
              en = function(t) {
                return 0 == t.indexOf('.') ? t.substr(1) : t;
              },
              nn = function(t) {
                return t
                  ? (1 < t.length &&
                      t.lastIndexOf('/') == t.length - 1 &&
                      (t = t.substr(0, t.length - 1)),
                    0 != t.indexOf('/') && (t = '/' + t),
                    t)
                  : '/';
              },
              on = function(t) {
                return '/' == (t = nn(t)) ? 1 : t.split('/').length;
              };
            function rn(t, e, n) {
              'none' == e && (e = '');
              var o = [],
                r = L(t);
              t = '__utma' == t ? 6 : 2;
              for (var i = 0; i < r.length; i++) {
                var s = ('' + r[i]).split('.');
                s.length >= t && o.push({ hash: s[0], R: r[i], O: s });
              }
              if (0 != o.length)
                return 1 == o.length ? o[0] : sn(e, o) || sn(n, o) || sn(null, o) || o[0];
            }
            function sn(t, e) {
              var n;
              null == t
                ? (n = t = 1)
                : ((n = Jn(t)), (t = Jn(l(t, '.') ? t.substring(1) : '.' + t)));
              for (var o = 0; o < e.length; o++) if (e[o].hash == n || e[o].hash == t) return e[o];
            }
            var an = new RegExp(/^https?:\/\/([^\/:]+)/),
              cn = /(.*)([?&#])(?:_ga=[^&#]*)(?:&?)(.*)/;
            function ln(t, e) {
              var n = new Date(),
                o = T.navigator,
                r = o.plugins || [];
              for (
                t = [
                  t,
                  o.userAgent,
                  n.getTimezoneOffset(),
                  n.getYear(),
                  n.getDate(),
                  n.getHours(),
                  n.getMinutes() + e,
                ],
                  e = 0;
                e < r.length;
                ++e
              )
                t.push(r[e].description);
              return Jn(t.join('.'));
            }
            var un = function(t) {
              n(48), (this.target = t), (this.T = !1);
            };
            un.prototype.ca = function(t, e) {
              if (t.tagName) {
                if ('a' == t.tagName.toLowerCase())
                  return void (t.href && (t.href = dn(this, t.href, e)));
                if ('form' == t.tagName.toLowerCase()) return fn(this, t);
              }
              if ('string' == typeof t) return dn(this, t, e);
            };
            var dn = function(t, e, n) {
                (r = cn.exec(e)) && 3 <= r.length && (e = r[1] + (r[3] ? r[2] + r[3] : '')),
                  (t = t.target.get('linkerParam'));
                var o = e.indexOf('?'),
                  r = e.indexOf('#');
                return (
                  n
                    ? (e += (-1 == r ? '#' : '&') + t)
                    : ((n = -1 == o ? '?' : '&'),
                      (e = -1 == r ? e + (n + t) : e.substring(0, r) + n + t + e.substring(r))),
                  e.replace(/&+_ga=/, '&_ga=')
                );
              },
              fn = function(t, e) {
                if (e && e.action) {
                  var n = t.target.get('linkerParam').split('=')[1];
                  if ('get' == e.method.toLowerCase()) {
                    t = e.childNodes || [];
                    for (var o = 0; o < t.length; o++)
                      if ('_ga' == t[o].name) return void t[o].setAttribute('value', n);
                    (t = _.createElement('input')).setAttribute('type', 'hidden'),
                      t.setAttribute('name', '_ga'),
                      t.setAttribute('value', n),
                      e.appendChild(t);
                  } else 'post' == e.method.toLowerCase() && (e.action = dn(t, e.action));
                }
              };
            function hn(t, e) {
              if (e == _.location.hostname) return !1;
              for (var n = 0; n < t.length; n++)
                if (t[n] instanceof RegExp) {
                  if (t[n].test(e)) return !0;
                } else if (0 <= e.indexOf(t[n])) return !0;
              return !1;
            }
            un.prototype.S = function(t, e, o) {
              function r(o) {
                try {
                  var r;
                  o = o || T.event;
                  t: {
                    var s = o.target || o.srcElement;
                    for (o = 100; s && 0 < o; ) {
                      if (s.href && s.nodeName.match(/^a(?:rea)?$/i)) {
                        r = s;
                        break t;
                      }
                      (s = s.parentNode), o--;
                    }
                    r = {};
                  }
                  ('http:' == r.protocol || 'https:' == r.protocol) &&
                    hn(t, r.hostname || '') &&
                    r.href &&
                    (r.href = dn(i, r.href, e));
                } catch (a) {
                  n(26);
                }
              }
              var i = this;
              this.T || ((this.T = !0), p(_, 'mousedown', r, !1), p(_, 'keyup', r, !1)),
                o &&
                  p(_, 'submit', function(e) {
                    if ((e = (e = e || T.event).target || e.srcElement) && e.action) {
                      var n = e.action.match(an);
                      n && hn(t, n[1]) && fn(i, e);
                    }
                  });
            };
            var pn,
              mn = /^(GTM|OPT)-[A-Z0-9]+$/,
              gn = /;_gaexp=[^;]*/g,
              vn = /;((__utma=)|([^;=]+=GAX?\d+\.))[^;]*/g,
              bn = function(t, e, o) {
                (this.U = ae),
                  (this.aa = e),
                  (e = o) ||
                    (e =
                      (e = et(t, Te)) && 't0' != e
                        ? Tn.test(e)
                          ? '_gat_' + A(et(t, Le))
                          : '_gat_' + A(e)
                        : '_gat'),
                  (this.Y = e),
                  We(new Ve(10), t) && (n(30), (this.pa = !0));
              },
              wn = function(t, e) {
                e.get(t.U) || ('1' == L(t.Y)[0] ? e.set(t.U, '', !0) : e.set(t.U, '' + Y(), !0));
              },
              yn = function(t, e) {
                if (e.get(t.U)) {
                  var n = 6e5;
                  t.pa && (n /= 10), S(t.Y, '1', e.get(Ce), e.get(Ae), e.get(Le), n);
                }
              },
              En = function(t, e) {
                if (e.get(t.U)) {
                  var n = new E(),
                    o = function(t) {
                      it(t).F && n.set(it(t).F, e.get(t));
                    };
                  o(ft), o(ht), o(Le), o(_e), o(ke), o(t.U), n.set(it(ie).F, r(e));
                  var i = t.aa;
                  n.map(function(t, e) {
                    (i += h(t) + '='), (i += h('' + e) + '&');
                  }),
                    (i += 'z=' + Y()),
                    d(i),
                    e.set(t.U, '', !0);
                }
              },
              Tn = /^gtm\d+$/,
              _n = function(t, e) {
                var n;
                (t = t.b).get('dcLoaded') ||
                  (o(t, 29),
                  (e = e || {})[Se] && (n = A(e[Se])),
                  (function(t, e) {
                    var n = e.get(ge);
                    e.set(ge, function(e) {
                      wn(t, e);
                      var o = n(e);
                      return yn(t, e), o;
                    });
                    var o = e.get(ve);
                    e.set(ve, function(e) {
                      var n = o(e);
                      return En(t, e), n;
                    });
                  })(
                    (e = new bn(
                      t,
                      'https://stats.g.doubleclick.net/r/collect?t=dc&aip=1&_r=3&',
                      n,
                    )),
                    t,
                  ),
                  t.set('dcLoaded', !0));
              },
              xn = function(t) {
                if (!t.get('dcLoaded') && 'cookie' == t.get(Ie)) {
                  o(t, 51);
                  var e = new bn(t);
                  wn(e, t),
                    yn(e, t),
                    t.get(e.U) && (t.set(Ue, 1, !0), t.set(He, D() + '/r/collect', !0));
                }
              },
              kn = function(t) {
                return t ? (1 * t).toFixed(3) : '0';
              },
              Ln = /^(UA|YT|MO|GP)-(\d+)-(\d+)$/,
              Sn = function(t) {
                function e(t, e) {
                  i.b.data.set(t, e);
                }
                function o(t, n) {
                  e(t, n), i.filters.add(t);
                }
                function r(t, e, o) {
                  We(new Ve(1e4, !0, e), i.b) && (t = L(t)) && 0 < t.length && n(o);
                }
                var i = this;
                (this.b = new Q()),
                  (this.filters = new H()),
                  e(Te, t[Te]),
                  e(Le, u(t[Le])),
                  e(Se, t[Se]),
                  e(Ae, t[Ae] || w()),
                  e(Ce, t[Ce]),
                  e(je, t[je]),
                  e(De, t[De]),
                  e(Me, t[Me]),
                  e(Oe, t[Oe]),
                  e(Pe, t[Pe]),
                  e(Ne, t[Ne]),
                  e(Re, t[Re]),
                  e(qe, t[qe]),
                  e(Ie, t[Ie]),
                  e(ke, t[ke]),
                  e(xe, t[xe]),
                  e(ft, 1),
                  e(ht, 'j48'),
                  o(ce, F),
                  o(le, $),
                  o(ue, V),
                  o(de, K),
                  o(fe, Je),
                  o(he, Qe),
                  o(pe, U),
                  o(me, J),
                  o(be, B),
                  o(we, G),
                  o(Ee, xn),
                  o(ge, W),
                  o(ve, X),
                  o(ye, Ke(this)),
                  An(this.b, t[_e]),
                  Cn(this.b),
                  this.b.set(
                    pt,
                    (function() {
                      var t = (T.gaGlobal = T.gaGlobal || {});
                      return (t.hid = t.hid || Y());
                    })(),
                  ),
                  (function(t, e, n) {
                    if (!pn) {
                      var o;
                      o = _.location.hash;
                      var r = T.name,
                        i = /^#?gaso=([^&]*)/;
                      (r =
                        (o = (o = (o && o.match(i)) || (r && r.match(i)))
                          ? o[1]
                          : L('GASO')[0] || '') &&
                        o.match(/^(?:!([-0-9a-z.]{1,40})!)?([-.\w]{10,1200})$/i)) &&
                        (S('GASO', '' + o, n, e, t, 0),
                        window._udo || (window._udo = e),
                        window._utcp || (window._utcp = n),
                        (t = r[1]),
                        g(
                          'https://www.google.com/analytics/web/inpage/pub/inpage.js?' +
                            (t ? 'prefix=' + t + '&' : '') +
                            Y(),
                          '_gasojs',
                        )),
                        (pn = !0);
                    }
                  })(this.b.get(Le), this.b.get(Ae), this.b.get(Ce)),
                  (this.ra = new Ve(1e4, !0, 'gaexp10')),
                  r('_gid', 'gacookie11', 41),
                  r('_gaid', 'gacookie12', 44);
              },
              An = function(t, e) {
                if ('cookie' == et(t, Ie)) {
                  var o;
                  Ye = !1;
                  t: {
                    var r = L(et(t, Se));
                    if (r && !(1 > r.length)) {
                      o = [];
                      for (var i = 0; i < r.length; i++) {
                        var s,
                          a = (s = r[i].split('.')).shift();
                        ('GA1' == a || '1' == a) && 1 < s.length
                          ? (1 == (a = s.shift().split('-')).length && (a[1] = '1'),
                            (a[0] *= 1),
                            (a[1] *= 1),
                            (s = { H: a, s: s.join('.') }))
                          : (s = void 0),
                          s && o.push(s);
                      }
                      if (1 == o.length) {
                        n(13), (o = o[0].s);
                        break t;
                      }
                      if (0 != o.length) {
                        if (
                          (n(14),
                          (r = en(et(t, Ae)).split('.').length),
                          1 == (o = tn(o, r, 0)).length)
                        ) {
                          o = o[0].s;
                          break t;
                        }
                        (r = on(et(t, Ce))), (o = (o = tn(o, r, 1))[0] && o[0].s);
                        break t;
                      }
                      n(12);
                    }
                    o = void 0;
                  }
                  o ||
                    ((o = et(t, Ae)),
                    null != (o = rn('__utma', (r = et(t, De) || w()), o))
                      ? (n(10), (o = o.O[1] + '.' + o.O[2]))
                      : (o = void 0)),
                    o && (t.data.set(_e, o), (Ye = !0));
                }
                if (
                  ((o = t.get(Pe)),
                  (i = b(_.location[o ? 'href' : 'search'], '_ga')) &&
                    (t.get(Oe)
                      ? -1 == (o = i.indexOf('.'))
                        ? n(22)
                        : ((r = i.substring(o + 1)),
                          '1' != i.substring(0, o)
                            ? n(22)
                            : -1 == (o = r.indexOf('.'))
                            ? n(22)
                            : (i = r.substring(0, o)) != ln((o = r.substring(o + 1)), 0) &&
                              i != ln(o, -1) &&
                              i != ln(o, -2)
                            ? n(23)
                            : (n(11), t.data.set(_e, o)))
                      : n(21)),
                  e && (n(9), t.data.set(_e, h(e))),
                  !t.get(_e))
                )
                  if (
                    (e =
                      (e = T.gaGlobal && T.gaGlobal.vid) && -1 != e.search(/^(?:utma\.)?\d+\.\d+$/)
                        ? e
                        : void 0)
                  )
                    n(17), t.data.set(_e, e);
                  else {
                    for (
                      n(8),
                        o = (e =
                          T.navigator.userAgent +
                          (_.cookie ? _.cookie : '') +
                          (_.referrer ? _.referrer : '')).length,
                        r = T.history.length;
                      0 < r;

                    )
                      e += r-- ^ o++;
                    t.data.set(
                      _e,
                      [Y() ^ (2147483647 & Jn(e)), Math.round(new Date().getTime() / 1e3)].join(
                        '.',
                      ),
                    );
                  }
                ze(t);
              },
              Cn = function(t) {
                var e = T.navigator,
                  o = T.screen,
                  r = _.location;
                if (
                  (t.set(
                    Tt,
                    (function(t) {
                      var e = _.referrer;
                      if (/^https?:\/\//i.test(e)) {
                        if (t) return e;
                        t = '//' + _.location.hostname;
                        var n = e.indexOf(t);
                        if (
                          !(
                            (5 != n && 6 != n) ||
                            ('/' != (t = e.charAt(n + t.length)) && '?' != t && '' != t && ':' != t)
                          )
                        )
                          return;
                        return e;
                      }
                    })(t.get(qe)),
                  ),
                  r)
                ) {
                  var i = r.pathname || '';
                  '/' != i.charAt(0) && (n(31), (i = '/' + i)),
                    t.set(Et, r.protocol + '//' + r.hostname + i + r.search);
                }
                o && t.set(St, o.width + 'x' + o.height), o && t.set(Lt, o.colorDepth + '-bit');
                o = _.documentElement;
                var s = (i = _.body) && i.clientWidth && i.clientHeight,
                  a = [];
                if (
                  (o && o.clientWidth && o.clientHeight && ('CSS1Compat' === _.compatMode || !s)
                    ? (a = [o.clientWidth, o.clientHeight])
                    : s && (a = [i.clientWidth, i.clientHeight]),
                  (o = 0 >= a[0] || 0 >= a[1] ? '' : a.join('x')),
                  t.set(At, o),
                  t.set(
                    jt,
                    (function() {
                      var t, e, n;
                      if ((n = (n = T.navigator) ? n.plugins : null) && n.length)
                        for (var o = 0; o < n.length && !e; o++) {
                          var r = n[o];
                          -1 < r.name.indexOf('Shockwave Flash') && (e = r.description);
                        }
                      if (!e)
                        try {
                          e = (t = new ActiveXObject(
                            'ShockwaveFlash.ShockwaveFlash.7',
                          )).GetVariable('$version');
                        } catch (s) {}
                      if (!e)
                        try {
                          (t = new ActiveXObject('ShockwaveFlash.ShockwaveFlash.6')),
                            (e = 'WIN 6,0,21,0'),
                            (t.AllowScriptAccess = 'always'),
                            (e = t.GetVariable('$version'));
                        } catch (s) {}
                      if (!e)
                        try {
                          e = (t = new ActiveXObject('ShockwaveFlash.ShockwaveFlash')).GetVariable(
                            '$version',
                          );
                        } catch (s) {}
                      return (
                        e &&
                          (t = e.match(/[\d]+/g)) &&
                          3 <= t.length &&
                          (e = t[0] + '.' + t[1] + ' r' + t[2]),
                        e || void 0
                      );
                    })(),
                  ),
                  t.set(kt, _.characterSet || _.charset),
                  t.set(Ct, (e && 'function' == typeof e.javaEnabled && e.javaEnabled()) || !1),
                  t.set(xt, ((e && (e.language || e.browserLanguage)) || '').toLowerCase()),
                  r && t.get(Pe) && (e = _.location.hash))
                ) {
                  for (e = e.split(/[?&#]+/), r = [], o = 0; o < e.length; ++o)
                    (l(e[o], 'utm_id') ||
                      l(e[o], 'utm_campaign') ||
                      l(e[o], 'utm_source') ||
                      l(e[o], 'utm_medium') ||
                      l(e[o], 'utm_term') ||
                      l(e[o], 'utm_content') ||
                      l(e[o], 'gclid') ||
                      l(e[o], 'dclid') ||
                      l(e[o], 'gclsrc')) &&
                      r.push(e[o]);
                  0 < r.length && ((e = '#' + r.join('&')), t.set(Et, t.get(Et) + e));
                }
              };
            (Sn.prototype.get = function(t) {
              return this.b.get(t);
            }),
              (Sn.prototype.set = function(t, e) {
                this.b.set(t, e);
              });
            var jn = {
              pageview: [_t],
              event: [Dt, Mt, It, Ot],
              social: [Pt, Nt, Rt],
              timing: [$t, Gt, Yt, Kt],
            };
            (Sn.prototype.send = function(t) {
              var e, o;
              1 > arguments.length ||
                ('string' == typeof arguments[0]
                  ? ((e = arguments[0]), (o = [].slice.call(arguments, 1)))
                  : ((e = arguments[0] && arguments[0][mt]), (o = arguments)),
                e &&
                  (((o = y(jn[e] || [], o))[mt] = e),
                  this.b.set(o, void 0, !0),
                  this.filters.D(this.b),
                  (this.b.data.m = {}),
                  We(this.ra, this.b) &&
                    (function(t) {
                      var e = T.performance;
                      if (e && e.getEntriesByName) {
                        n(35);
                        var o = 'https://www.google-analytics.com/analytics.js?wpid=' + t;
                        g(o, void 0, void 0, function() {
                          try {
                            var r = 1,
                              i = e.getEntriesByName(
                                'https://www.google-analytics.com/analytics.js',
                              );
                            (i && 0 != i.length) ||
                              ((i = e.getEntriesByName(
                                'http://www.google-analytics.com/analytics.js',
                              )),
                              (r = 0));
                            var s = e.getEntriesByName(o);
                            if (i && 1 == i.length && s && 1 == s.length) {
                              n(37);
                              var a = i[0],
                                c = s[0],
                                l = {
                                  tid: t,
                                  ad: kn(a.duration),
                                  bd: kn(c.duration),
                                  ar: kn(a.responseEnd - a.requestStart),
                                  br: kn(c.responseEnd - c.requestStart),
                                  an: kn(a.domainLookupEnd - a.domainLookupStart),
                                  bn: kn(c.domainLookupEnd - c.domainLookupStart),
                                  ac: kn(a.connectEnd - a.connectStart),
                                  bc: kn(c.connectEnd - c.connectStart),
                                  as: r,
                                };
                              for (var u in ((r = []).push('_v=j48'), r.push('id=10'), l))
                                l.hasOwnProperty(u) && r.push(u + '=' + h(l[u]));
                              r.push('z=' + Y()),
                                O('https://www.google-analytics.com/u/d', r.join('&'), f);
                            }
                          } catch (d) {}
                        });
                      }
                    })(this.b.get(Le))));
            }),
              (Sn.prototype.ma = function(t, e) {
                var n = this;
                Un(t, n, e) ||
                  (Vn(t, function() {
                    Un(t, n, e);
                  }),
                  Fn(String(n.get(Te)), t, void 0, e, !0));
              });
            var Dn,
              Mn,
              In,
              On,
              Pn = function(t) {
                return 'prerender' != _.visibilityState && (t(), !0);
              },
              Nn = function(t) {
                if (!Pn(t)) {
                  n(16);
                  var e = !1,
                    o = function() {
                      if (!e && Pn(t)) {
                        e = !0;
                        var n = o,
                          r = _;
                        r.removeEventListener
                          ? r.removeEventListener('visibilitychange', n, !1)
                          : r.detachEvent && r.detachEvent('onvisibilitychange', n);
                      }
                    };
                  p(_, 'visibilitychange', o);
                }
              },
              Rn = /^(?:(\w+)\.)?(?:(\w+):)?(\w+)$/,
              qn = function(t) {
                if (s(t[0])) this.u = t[0];
                else {
                  var e = Rn.exec(t[0]);
                  if (
                    (null != e &&
                      4 == e.length &&
                      ((this.c = e[1] || 't0'),
                      (this.K = e[2] || ''),
                      (this.C = e[3]),
                      (this.a = [].slice.call(t, 1)),
                      this.K ||
                        ((this.A = 'create' == this.C),
                        (this.i = 'require' == this.C),
                        (this.g = 'provide' == this.C),
                        (this.ba = 'remove' == this.C)),
                      this.i &&
                        (3 <= this.a.length
                          ? ((this.X = this.a[1]), (this.W = this.a[2]))
                          : this.a[1] &&
                            (c(this.a[1]) ? (this.X = this.a[1]) : (this.W = this.a[1])))),
                    (e = t[1]),
                    (t = t[2]),
                    !this.C)
                  )
                    throw 'abort';
                  if (this.i && (!c(e) || '' == e)) throw 'abort';
                  if (this.g && (!c(e) || '' == e || !s(t))) throw 'abort';
                  if (Hn(this.c) || Hn(this.K)) throw 'abort';
                  if (this.g && 't0' != this.c) throw 'abort';
                }
              };
            function Hn(t) {
              return 0 <= t.indexOf('.') || 0 <= t.indexOf(':');
            }
            (Dn = new E()),
              (In = new E()),
              (On = new E()),
              (Mn = { ec: 45, ecommerce: 46, linkid: 47 });
            var Un = function(t, e, n) {
                e == Gn || e.get(Te);
                var o = Dn.get(t);
                return (
                  !!s(o) &&
                  ((e.plugins_ = e.plugins_ || new E()),
                  !!e.plugins_.get(t) || (e.plugins_.set(t, new o(e, n || {})), !0))
                );
              },
              Fn = function(t, e, o, r, i) {
                if (!s(Dn.get(e)) && !In.get(e)) {
                  if ((Mn.hasOwnProperty(e) && n(Mn[e]), mn.test(e))) {
                    if ((n(52), !(t = Gn.j(t)))) return !0;
                    (r = {
                      id: e,
                      B: (o = r || {}).dataLayer || 'dataLayer',
                      ia: !!t.get('anonymizeIp'),
                      na: i,
                      G: !1,
                    }),
                      t.get('&gtm') == e && (r.G = !0);
                    var a = String(t.get('name'));
                    't0' != a && (r.target = a),
                      k(String(t.get('trackingId'))) ||
                        ((r.ja = String(t.get(_e))),
                        (r.ka = Number(t.get(xe))),
                        (o = o.palindrome ? vn : gn),
                        (o = (o = _.cookie.replace(/^|(; +)/g, ';').match(o))
                          ? o
                              .sort()
                              .join('')
                              .substring(1)
                          : void 0),
                        (r.la = o),
                        (r.qa = b(t.b.get(Et) || '', 'gclid'))),
                      (t = r.B),
                      (o = new Date().getTime()),
                      (T[t] = T[t] || []),
                      (o = { 'gtm.start': o }),
                      i || (o.event = 'gtm.js'),
                      T[t].push(o),
                      (o = (function(t) {
                        function e(t, e) {
                          e && (n += '&' + t + '=' + h(e));
                        }
                        var n = 'https://www.google-analytics.com/gtm/js?id=' + h(t.id);
                        return (
                          'dataLayer' != t.B && e('l', t.B),
                          e('t', t.target),
                          e('cid', t.ja),
                          e('cidt', t.ka),
                          e('gac', t.la),
                          e('aip', t.ia),
                          t.na && e('m', 'sync'),
                          e('cycle', t.G),
                          t.qa && e('gclid', t.qa),
                          n
                        );
                      })(r));
                  }
                  !o && Mn.hasOwnProperty(e) ? (n(39), (o = e + '.js')) : n(43),
                    o &&
                      ((o && 0 <= o.indexOf('/')) ||
                        (o =
                          (dt || v() ? 'https:' : 'http:') +
                          '//www.google-analytics.com/plugins/ua/' +
                          o),
                      (t = (r = Bn(o)).protocol),
                      (o = _.location.protocol),
                      ('https:' == t || t == o || ('http:' == t && 'http:' == o)) &&
                        Xn(r) &&
                        (g(r.url, void 0, i), In.set(e, !0)));
                }
              },
              Vn = function(t, e) {
                var n = On.get(t) || [];
                n.push(e), On.set(t, n);
              },
              Wn = function(t, e) {
                Dn.set(t, e), (e = On.get(t) || []);
                for (var n = 0; n < e.length; n++) e[n]();
                On.set(t, []);
              },
              Xn = function(t) {
                var e = Bn(_.location.href);
                return (
                  !!l(t.url, 'https://www.google-analytics.com/gtm/js?id=') ||
                  (!(t.query || 0 <= t.url.indexOf('?') || 0 <= t.path.indexOf('://')) &&
                    ((t.host == e.host && t.port == e.port) ||
                      ((e = 'http:' == t.protocol ? 80 : 443),
                      !(
                        'www.google-analytics.com' != t.host ||
                        (t.port || e) != e ||
                        !l(t.path, '/plugins/')
                      ))))
                );
              },
              Bn = function(t) {
                function e(t) {
                  var e = (t.hostname || '').split(':')[0].toLowerCase(),
                    n = (t.protocol || '').toLowerCase();
                  n = 1 * t.port || ('http:' == n ? 80 : 'https:' == n ? 443 : '');
                  return (t = t.pathname || ''), l(t, '/') || (t = '/' + t), [e, '' + n, t];
                }
                var n = _.createElement('a');
                n.href = _.location.href;
                var o = (n.protocol || '').toLowerCase(),
                  r = e(n),
                  i = n.search || '',
                  s = o + '//' + r[0] + (r[1] ? ':' + r[1] : '');
                return (
                  l(t, '//')
                    ? (t = o + t)
                    : l(t, '/')
                    ? (t = s + t)
                    : !t || l(t, '?')
                    ? (t = s + r[2] + (t || i))
                    : 0 > t.split('/')[0].indexOf(':') &&
                      (t = s + r[2].substring(0, r[2].lastIndexOf('/')) + '/' + t),
                  (n.href = t),
                  (o = e(n)),
                  {
                    protocol: (n.protocol || '').toLowerCase(),
                    host: o[0],
                    port: o[1],
                    path: o[2],
                    query: n.search || '',
                    url: t || '',
                  }
                );
              },
              $n = {
                ga: function() {
                  $n.f = [];
                },
              };
            $n.ga(),
              ($n.D = function(t) {
                var e = $n.J.apply($n, arguments);
                e = $n.f.concat(e);
                for ($n.f = []; 0 < e.length && !$n.v(e[0]) && (e.shift(), !(0 < $n.f.length)); );
                $n.f = $n.f.concat(e);
              }),
              ($n.J = function(t) {
                for (var e = [], n = 0; n < arguments.length; n++)
                  try {
                    var o = new qn(arguments[n]);
                    o.g
                      ? Wn(o.a[0], o.a[1])
                      : (o.i && (o.ha = Fn(o.c, o.a[0], o.X, o.W)), e.push(o));
                  } catch (r) {}
                return e;
              }),
              ($n.v = function(t) {
                try {
                  if (t.u) t.u.call(T, Gn.j('t0'));
                  else {
                    var e = t.c == ut ? Gn : Gn.j(t.c);
                    if (t.A) 't0' != t.c || Gn.create.apply(Gn, t.a);
                    else if (t.ba) Gn.remove(t.c);
                    else if (e)
                      if (t.i) {
                        if ((t.ha && (t.ha = Fn(t.c, t.a[0], t.X, t.W)), !Un(t.a[0], e, t.W)))
                          return !0;
                      } else if (t.K) {
                        var n = t.C,
                          o = t.a,
                          r = e.plugins_.get(t.K);
                        r[n].apply(r, o);
                      } else e[t.C].apply(e, t.a);
                  }
                } catch (i) {}
              });
            var Gn = function(t) {
              n(1), $n.D.apply($n, [arguments]);
            };
            (Gn.h = {}), (Gn.P = []), (Gn.L = 0), (Gn.answer = 42);
            var Kn = [Le, Ae, Te];
            (Gn.create = function(t) {
              var e = y(Kn, [].slice.call(arguments));
              e[Te] || (e[Te] = 't0');
              var n = '' + e[Te];
              return Gn.h[n] ? Gn.h[n] : ((e = new Sn(e)), (Gn.h[n] = e), Gn.P.push(e), e);
            }),
              (Gn.remove = function(t) {
                for (var e = 0; e < Gn.P.length; e++)
                  if (Gn.P[e].get(Te) == t) {
                    Gn.P.splice(e, 1), (Gn.h[t] = null);
                    break;
                  }
              }),
              (Gn.j = function(t) {
                return Gn.h[t];
              }),
              (Gn.getAll = function() {
                return Gn.P.slice(0);
              }),
              (Gn.N = function() {
                'ga' != ut && n(49);
                var t = T[ut];
                if (!t || 42 != t.answer) {
                  if (
                    ((Gn.L = t && t.l),
                    (Gn.loaded = !0),
                    Fe('create', (e = T[ut] = Gn), e.create),
                    Fe('remove', e, e.remove),
                    Fe('getByName', e, e.j, 5),
                    Fe('getAll', e, e.getAll, 6),
                    Fe('get', (e = Sn.prototype), e.get, 7),
                    Fe('set', e, e.set, 4),
                    Fe('send', e, e.send),
                    Fe('requireSync', e, e.ma),
                    Fe('get', (e = Q.prototype), e.get),
                    Fe('set', e, e.set),
                    !v() && !dt)
                  ) {
                    t: {
                      for (
                        var e = _.getElementsByTagName('script'), o = 0;
                        o < e.length && 100 > o;
                        o++
                      ) {
                        var r = e[o].src;
                        if (r && 0 == r.indexOf('https://www.google-analytics.com/analytics')) {
                          n(33), (e = !0);
                          break t;
                        }
                      }
                      e = !1;
                    }
                    e && (dt = !0);
                  }
                  v() || dt || !We(new Ve(1e4)) || (n(36), (dt = !0)),
                    ((T.gaplugins = T.gaplugins || {}).Linker = un),
                    (e = un.prototype),
                    Wn('linker', un),
                    Fe('decorate', e, e.ca, 20),
                    Fe('autoLink', e, e.S, 25),
                    Wn('displayfeatures', _n),
                    Wn('adfeatures', _n),
                    (t = t && t.q),
                    a(t) ? $n.D.apply(Gn, t) : n(50);
                }
              }),
              (Gn.da = function() {
                for (var t = Gn.getAll(), e = 0; e < t.length; e++) t[e].get(Te);
              });
            var Yn = Gn.N,
              zn = T[ut];
            function Jn(t) {
              var e,
                n,
                o = 1;
              if (t)
                for (o = 0, n = t.length - 1; 0 <= n; n--)
                  o =
                    0 !=
                    (e =
                      266338304 & (o = ((o << 6) & 268435455) + (e = t.charCodeAt(n)) + (e << 14)))
                      ? o ^ (e >> 21)
                      : o;
              return o;
            }
            zn && zn.r ? Yn() : Nn(Yn),
              Nn(function() {
                $n.D(['provide', 'render', f]);
              });
          })(window),
          (function() {
            var t = window,
              e = 'push',
              n = 'length',
              o = 'prototype',
              r = function(t) {
                if (t.get && t.set) {
                  this.clear();
                  var e = t.get('buildHitTask');
                  t.set('buildHitTask', d(this, e)), t.set('_rlt', f(this, t.get('_rlt')));
                }
              },
              i = {
                action: 'pa',
                promoAction: 'promoa',
                id: 'ti',
                affiliation: 'ta',
                revenue: 'tr',
                tax: 'tt',
                shipping: 'ts',
                coupon: 'tcc',
                step: 'cos',
                label: 'col',
                option: 'col',
                options: 'col',
                list: 'pal',
                listSource: 'pls',
              },
              s = {
                id: 'id',
                name: 'nm',
                brand: 'br',
                category: 'ca',
                variant: 'va',
                position: 'ps',
                price: 'pr',
                quantity: 'qt',
                coupon: 'cc',
                'dimension(\\d+)': 'cd',
                'metric(\\d+)': 'cm',
              },
              a = { id: 'id', name: 'nm', creative: 'cr', position: 'ps' },
              c = function(t, e) {
                (this.name = t), (this.source = e), (this.e = []);
              },
              l = 'detail checkout checkout_option click add remove purchase refund'.split(' ');
            (r[o].clear = function() {
              (this.b = void 0), (this.f = []), (this.a = []), (this.g = []), (this.d = void 0);
            }),
              (r[o].h = function(t, e) {
                var n = e || {};
                'promo_click' == t ? (n.promoAction = 'click') : (n.action = t), (this.b = h(n));
              }),
              (r[o].j = function(t) {
                (t = h(t)) && this.f[e](t);
              }),
              (r[o].i = function(t) {
                var o = h(t);
                if (o) {
                  var r,
                    i = t.list || '';
                  t = t.listSource || '';
                  for (var s = 0; s < this.a[n]; s++)
                    if (this.a[s].name == i) {
                      r = this.a[s];
                      break;
                    }
                  r || ((r = new c(i, t)), this.a[e](r)), r.e[e](o);
                }
              }),
              (r[o].c = function(t) {
                (t = h(t)) && this.g[e](t);
              });
            var u = function(t, e, r) {
              if ('[object Array]' == Object[o].toString.call(Object(t)))
                for (var i = 0; i < t[n]; i++) e.call(r, t[i]);
            };
            r[o].data = function(t) {
              if (t && t.ecommerce) {
                (t = t.ecommerce).promoView && u(t.promoView.promotions, this.c, this),
                  t.promoClick &&
                    (this.h('promo_click', t.promoClick.actionField),
                    u(t.promoClick.promotions, this.c, this));
                for (var e = 0; e < l[n]; e++) {
                  var o = t[l[e]];
                  if (o) {
                    this.h(l[e], o.actionField), u(o.products, this.j, this);
                    break;
                  }
                }
                u(t.impressions, this.i, this), t.currencyCode && (this.d = t.currencyCode);
              }
            };
            var d = function(t, e) {
                return function(o) {
                  var r, c, l;
                  for (t.b && p(i, t.b, o, '&'), r = 0; r < t.f[n]; r++)
                    (c = '&pr' + (r + 1)), p(s, t.f[r], o, c);
                  for (r = 0; r < t.a[n]; r++) {
                    (c = '&il' + (r + 1)),
                      (l = t.a[r]).name && o.set(c + 'nm', l.name, !0),
                      l.source && o.set(c + 'ls', l.source, !0);
                    for (var u = 0; u < l.e[n]; u++) p(s, l.e[u], o, c + 'pi' + (u + 1));
                  }
                  for (r = 0; r < t.g[n]; r++) (c = '&promo' + (r + 1)), p(a, t.g[r], o, c);
                  return t.d && o.set('&cu', t.d, !0), t.clear(), e(o);
                };
              },
              f = function(t, e) {
                return function(n) {
                  var o = t.b && t.b.action;
                  if ('purchase' != o && 'refund' != o) return e(n);
                };
              },
              h = function(t) {
                var e = 0,
                  n = {};
                if (t && 'object' == typeof t)
                  for (var o in t) t.hasOwnProperty(o) && ((n[o] = t[o]), e++);
                return e ? n : void 0;
              },
              p = function(t, e, n, o) {
                for (var r in e)
                  if (e.hasOwnProperty(r))
                    for (var i in t)
                      if (t.hasOwnProperty(i)) {
                        var s = r.match('^' + i + '$');
                        s && n.set(o + t[i] + s.slice(1).join(''), e[r], !0);
                      }
              };
            !(function() {
              (t.gaplugins = t.gaplugins || {}),
                (t.gaplugins.EC = r),
                (r[o].setAction = r[o].h),
                (r[o].addProduct = r[o].j),
                (r[o].addImpression = r[o].i),
                (r[o].addPromo = r[o].c),
                (r[o].clear = r[o].clear),
                (r[o].data = r[o].data);
              var n = t.GoogleAnalyticsObject || 'ga';
              (t[n] =
                t[n] ||
                function() {
                  (t[n].q = t[n].q || [])[e](arguments);
                }),
                t[n]('provide', 'ec', r);
            })();
          })(),
          window.ga ||
            ((window.ga = function() {
              window.ga.q.push(arguments);
            }),
            (window.ga.q = []));
        const cr = navigator.userAgent.match(/Macintosh/),
          lr = cr ? 'metaKey' : 'ctrlKey',
          ur = cr ? 'Meta' : 'Control';
        let dr = !1,
          fr = { x: 0, y: 0 };
        function hr(t) {
          t instanceof MouseEvent &&
            ((fr.x === t.clientX && fr.y === t.clientY) || (dr = !1),
            (fr = { x: t.clientX, y: t.clientY }));
        }
        function pr(t) {
          if (dr) return;
          const e = t.currentTarget,
            { target: n } = t;
          if (
            !(
              n instanceof Element &&
              e instanceof HTMLElement &&
              e.closest('.js-active-navigation-container')
            )
          )
            return;
          const o = n.closest('.js-navigation-item');
          o && Lr(o, e);
        }
        Ht('.js-navigation-container:not(.js-navigation-container-no-mouse)', {
          subscribe: t => co(ao(t, 'mouseover', hr), ao(t, 'mouseover', pr)),
        });
        let mr = 0;
        function gr(t) {
          if (
            t.target !== document.body &&
            t.target instanceof HTMLElement &&
            !t.target.classList.contains('js-navigation-enable')
          )
            return;
          dr = !0;
          const e = Sr();
          let n;
          if (e) {
            n = et(
              e.querySelector('.js-navigation-item[aria-selected="true"]') || e,
              'navigation:keydown',
              { hotkey: Kn(t), originalEvent: t, originalTarget: t.target },
            );
          }
          n || t.preventDefault();
        }
        function vr(t) {
          et(t.currentTarget, 'navigation:open', {
            modifierKey: t.modifierKey || t.altKey || t.ctrlKey || t.metaKey,
            shiftKey: t.shiftKey,
          }) || t.preventDefault();
        }
        function br(t) {
          const e = Sr();
          t !== e && (e && wr(e), t.classList.add('js-active-navigation-container'));
        }
        function wr(t) {
          t.classList.remove('js-active-navigation-container');
        }
        Ht('.js-active-navigation-container', {
          add() {
            1 === ++mr && document.addEventListener('keydown', gr);
          },
          remove() {
            0 === --mr && document.removeEventListener('keydown', gr);
          },
        }),
          tt('navigation:keydown', '.js-active-navigation-container', function(t) {
            dt(t instanceof CustomEvent, 'app/assets/modules/github/navigation.js:232');
            const e = t.currentTarget,
              n = t.detail.originalTarget.matches('input, textarea'),
              o = t.target;
            if (o.classList.contains('js-navigation-item'))
              if (n) {
                if (cr)
                  switch (Kn(t.detail.originalEvent)) {
                    case 'Control+n':
                      xr(o, e);
                      break;
                    case 'Control+p':
                      _r(o, e);
                  }
                switch (Kn(t.detail.originalEvent)) {
                  case 'ArrowUp':
                    _r(o, e);
                    break;
                  case 'ArrowDown':
                    xr(o, e);
                    break;
                  case 'Enter':
                  case `${ur}+Enter`:
                    kr(o, t.detail.originalEvent[lr]);
                }
              } else {
                if (cr)
                  switch (Kn(t.detail.originalEvent)) {
                    case 'Control+n':
                      xr(o, e);
                      break;
                    case 'Control+p':
                      _r(o, e);
                      break;
                    case 'Alt+v':
                      !(function(t, e) {
                        const n = Ar(e);
                        let o = n.indexOf(t);
                        const r = rr(t);
                        if (null == r) return;
                        let i, s;
                        for (; (i = n[o - 1]) && (s = ir(i, r)) && s.top >= 0; ) o--;
                        if (i) {
                          const t = Lr(i, e);
                          if (t) return;
                          jr(r, i);
                        }
                      })(o, e);
                      break;
                    case 'Control+v':
                      !(function(t, e) {
                        const n = Ar(e);
                        let o = n.indexOf(t);
                        const r = rr(t);
                        if (null == r) return;
                        let i, s;
                        for (; (i = n[o + 1]) && (s = ir(i, r)) && s.bottom >= 0; ) o++;
                        if (i) {
                          const t = Lr(i, e);
                          if (t) return;
                          jr(r, i);
                        }
                      })(o, e);
                  }
                switch (Kn(t.detail.originalEvent)) {
                  case 'j':
                  case 'J':
                    xr(o, e);
                    break;
                  case 'k':
                  case 'K':
                    _r(o, e);
                    break;
                  case 'o':
                  case 'Enter':
                  case `${ur}+Enter`:
                    kr(o, t.detail[lr]);
                }
              }
            else {
              const o = Ar(e)[0];
              if (o)
                if (n) {
                  if (cr)
                    switch (Kn(t.detail.originalEvent)) {
                      case 'Control+n':
                        Lr(o, e);
                    }
                  switch (Kn(t.detail.originalEvent)) {
                    case 'ArrowDown':
                      Lr(o, e);
                  }
                } else {
                  if (cr)
                    switch (Kn(t.detail.originalEvent)) {
                      case 'Control+n':
                      case 'Control+v':
                        Lr(o, e);
                    }
                  switch (Kn(t.detail.originalEvent)) {
                    case 'j':
                      Lr(o, e);
                  }
                }
            }
            if (n) {
              if (cr)
                switch (Kn(t.detail.originalEvent)) {
                  case 'Control+n':
                  case 'Control+p':
                    t.preventDefault();
                }
              switch (Kn(t.detail.originalEvent)) {
                case 'ArrowUp':
                case 'ArrowDown':
                  t.preventDefault();
                  break;
                case 'Enter':
                  t.preventDefault();
              }
            } else {
              if (cr)
                switch (Kn(t.detail.originalEvent)) {
                  case 'Control+n':
                  case 'Control+p':
                  case 'Control+v':
                  case 'Alt+v':
                    t.preventDefault();
                }
              switch (Kn(t.detail.originalEvent)) {
                case 'j':
                case 'k':
                  t.preventDefault();
                  break;
                case 'o':
                case 'Enter':
                case `${lr}+Enter`:
                  t.preventDefault();
              }
            }
          }),
          tt('click', '.js-active-navigation-container .js-navigation-item', function(t) {
            dt(t instanceof MouseEvent, 'app/assets/modules/github/navigation.js:388'), vr(t);
          }),
          tt('navigation:keyopen', '.js-active-navigation-container .js-navigation-item', function(
            t,
          ) {
            dt(t instanceof CustomEvent, 'app/assets/modules/github/navigation.js:394');
            const e = t.currentTarget.classList.contains('js-navigation-open')
              ? t.currentTarget
              : t.currentTarget.querySelector('.js-navigation-open');
            if (e) {
              if (t.detail.modifierKey) window.open(e.href, '_blank'), window.focus();
              else {
                e.dispatchEvent(new MouseEvent('click', { bubbles: !0, cancelable: !0 })) &&
                  e.click();
              }
              t.preventDefault();
            } else vr(t);
          });
        const yr = [];
        function Er(t, e) {
          e || (e = t);
          const n = Ar(t)[0],
            o = e.closest('.js-navigation-item') || n;
          if ((br(t), o instanceof HTMLElement)) {
            if (Lr(o, t)) return;
            const e = rr(o);
            dt(e, 'app/assets/modules/github/navigation.js:495'), Dr(e, o);
          }
        }
        function Tr(t) {
          const e = t.querySelectorAll('.js-navigation-item[aria-selected]');
          for (const n of e)
            n.classList.remove('navigation-focus'), n.setAttribute('aria-selected', 'false');
        }
        function _r(t, e) {
          const n = Ar(e),
            o = n.indexOf(t),
            r = n[o - 1];
          if (r) {
            if (Lr(r, e)) return;
            const t = rr(r);
            dt(t, 'app/assets/modules/github/navigation.js:543'),
              'page' === Cr(e) ? jr(t, r) : Dr(t, r);
          }
        }
        function xr(t, e) {
          const n = Ar(e),
            o = n.indexOf(t),
            r = n[o + 1];
          if (r) {
            if (Lr(r, e)) return;
            const t = rr(r);
            dt(t, 'app/assets/modules/github/navigation.js:570'),
              'page' === Cr(e) ? jr(t, r) : Dr(t, r);
          }
        }
        function kr(t, e = !1) {
          et(t, 'navigation:keyopen', { modifierKey: e });
        }
        function Lr(t, e) {
          return (
            !et(t, 'navigation:focus') ||
            (Tr(e),
            t.classList.add('navigation-focus'),
            t.setAttribute('aria-selected', 'true'),
            !1)
          );
        }
        function Sr() {
          return document.querySelector('.js-active-navigation-container');
        }
        function Ar(t) {
          return Array.from(t.querySelectorAll('.js-navigation-item')).filter(zo);
        }
        function Cr(t) {
          return t.getAttribute('data-navigation-scroll') || 'item';
        }
        function jr(t, e, n = 'smooth') {
          const o = ir(e, t);
          o &&
            (o.bottom <= 0
              ? e.scrollIntoView({ behavior: n, block: 'start' })
              : o.top <= 0 && e.scrollIntoView({ behavior: n, block: 'end' }));
        }
        function Dr(t, e) {
          const n = sr(e, t),
            o = ir(e, t);
          if (null != n && null != o)
            if (o.bottom <= 0 && document.body) {
              ar(t, {
                top:
                  (null != t.offsetParent ? t.scrollHeight : document.body.scrollHeight) -
                  (n.bottom + o.height),
              });
            } else o.top <= 0 && ar(t, { top: n.top });
        }
        const Mr = 'ontransitionend' in window;
        function Ir(t, e) {
          if (!Mr) return void e();
          const n = Array.from(t.querySelectorAll('.js-transitionable'));
          t.classList.add('js-transitionable') && n.push(t);
          for (const o of n) {
            const t = Or(o);
            o.addEventListener(
              'transitionend',
              () => {
                (o.style.display = ''),
                  (o.style.visibility = ''),
                  t &&
                    Pr(o, function() {
                      o.style.height = '';
                    });
              },
              { once: !0 },
            ),
              (o.style.boxSizing = 'content-box'),
              (o.style.display = 'block'),
              (o.style.visibility = 'visible'),
              t &&
                Pr(o, function() {
                  o.style.height = getComputedStyle(o).height;
                }),
              o.offsetHeight;
          }
          e();
          for (const o of n)
            if (Or(o)) {
              const t = getComputedStyle(o).height;
              (o.style.boxSizing = ''),
                (o.style.height = '0px' === t ? `${o.scrollHeight}px` : '0px');
            }
        }
        function Or(t) {
          return 'height' === getComputedStyle(t).transitionProperty;
        }
        function Pr(t, e) {
          (t.style.transition = 'none'), e(), t.offsetHeight, (t.style.transition = '');
        }
        function Nr(t, e) {
          const n = t.getAttribute('data-details-container') || '.js-details-container',
            o = c(t, n);
          Ir(o, () => {
            const n = null != e ? e : !o.classList.contains('open');
            o.classList.toggle('open', n),
              o.classList.toggle('Details--on', n),
              t.setAttribute('aria-expanded', n.toString()),
              Promise.resolve().then(() => {
                !(function(t) {
                  const e = t.querySelectorAll('input[autofocus], textarea[autofocus]'),
                    n = e[e.length - 1];
                  n && document.activeElement !== n && n.focus();
                })(o),
                  (function(t) {
                    t.classList.contains('tooltipped') &&
                      (t.classList.remove('tooltipped'),
                      t.addEventListener(
                        'mouseleave',
                        () => {
                          t.classList.add('tooltipped'), t.blur();
                        },
                        { once: !0 },
                      ));
                  })(t),
                  (function(t) {
                    const e = t.closest('.js-edit-repository-meta');
                    e instanceof HTMLFormElement && e.reset();
                  })(t);
                const e = new CustomEvent('details:toggled', {
                  bubbles: !0,
                  cancelable: !1,
                  detail: { open: o.classList.contains('Details--on') },
                });
                o.dispatchEvent(e);
              });
          });
        }
        function Rr(t) {
          let e = !1,
            n = t.parentElement;
          for (; n; )
            n.classList.contains('Details-content--shown') && (e = !0),
              n.classList.contains('js-details-container') &&
                (n.classList.toggle('open', !e), n.classList.toggle('Details--on', !e), (e = !1)),
              (n = n.parentElement);
        }
        tt('click', '.js-details-target', function(t) {
          const { currentTarget: e } = t;
          dt(e instanceof HTMLElement, 'app/assets/modules/github/details.js:128'),
            Nr(e),
            t.preventDefault();
        }),
          tr(function({ target: t }) {
            t && Rr(t);
          });
        var qr = fn(function(t) {
          var e;
          (e = function() {
            if ('undefined' == typeof window || !window.document)
              return function() {
                throw new Error('Sortable.js requires a window with a document');
              };
            var t,
              e,
              n,
              o,
              r,
              i,
              s,
              a,
              c,
              l,
              u,
              d,
              f,
              h,
              p,
              m,
              g,
              v,
              b,
              w,
              y,
              E,
              T = {},
              _ = /\s+/g,
              x = /left|right|inline/,
              k = 'Sortable' + new Date().getTime(),
              L = window,
              S = L.document,
              A = L.parseInt,
              C = L.setTimeout,
              j = L.jQuery || L.Zepto,
              D = L.Polymer,
              M = !1,
              I = 'draggable' in S.createElement('div'),
              O =
                !navigator.userAgent.match(/(?:Trident.*rv[ :]?11\.|msie)/i) &&
                (((E = S.createElement('x')).style.cssText = 'pointer-events:auto'),
                'auto' === E.style.pointerEvents),
              P = !1,
              N = Math.abs,
              R = Math.min,
              q = [],
              H = [],
              U = function() {
                return !1;
              },
              F = it(function(t, e, n) {
                if (n && e.scroll) {
                  var o,
                    r,
                    i,
                    s,
                    a,
                    d,
                    f = n[k],
                    h = e.scrollSensitivity,
                    p = e.scrollSpeed,
                    m = t.clientX,
                    g = t.clientY,
                    v = window.innerWidth,
                    b = window.innerHeight;
                  if (l !== n && ((c = e.scroll), (l = n), (u = e.scrollFn), !0 === c)) {
                    c = n;
                    do {
                      if (c.offsetWidth < c.scrollWidth || c.offsetHeight < c.scrollHeight) break;
                    } while ((c = c.parentNode));
                  }
                  c &&
                    ((o = c),
                    (r = c.getBoundingClientRect()),
                    (i = (N(r.right - m) <= h) - (N(r.left - m) <= h)),
                    (s = (N(r.bottom - g) <= h) - (N(r.top - g) <= h))),
                    i ||
                      s ||
                      ((s = (b - g <= h) - (g <= h)),
                      ((i = (v - m <= h) - (m <= h)) || s) && (o = L)),
                    (T.vx === i && T.vy === s && T.el === o) ||
                      ((T.el = o),
                      (T.vx = i),
                      (T.vy = s),
                      clearInterval(T.pid),
                      o &&
                        (T.pid = setInterval(function() {
                          if (((d = s ? s * p : 0), (a = i ? i * p : 0), 'function' == typeof u))
                            return u.call(f, a, d, t);
                          o === L
                            ? L.scrollTo(L.pageXOffset + a, L.pageYOffset + d)
                            : ((o.scrollTop += d), (o.scrollLeft += a));
                        }, 24)));
                }
              }, 30),
              V = function(t) {
                function e(t, e) {
                  return (null != t && !0 !== t) || null != (t = n.name)
                    ? 'function' == typeof t
                      ? t
                      : function(n, o) {
                          var r = o.options.group.name;
                          return e ? t : t && (t.join ? t.indexOf(r) > -1 : r == t);
                        }
                    : U;
                }
                var n = {},
                  o = t.group;
                (o && 'object' == typeof o) || (o = { name: o }),
                  (n.name = o.name),
                  (n.checkPull = e(o.pull, !0)),
                  (n.checkPut = e(o.put)),
                  (n.revertClone = o.revertClone),
                  (t.group = n);
              };
            try {
              window.addEventListener(
                'test',
                null,
                Object.defineProperty({}, 'passive', {
                  get: function() {
                    M = { capture: !1, passive: !1 };
                  },
                }),
              );
            } catch (lt) {}
            function W(t, e) {
              if (!t || !t.nodeType || 1 !== t.nodeType)
                throw 'Sortable: `el` must be HTMLElement, and not ' + {}.toString.call(t);
              (this.el = t), (this.options = e = st({}, e)), (t[k] = this);
              var n = {
                group: null,
                sort: !0,
                disabled: !1,
                store: null,
                handle: null,
                scroll: !0,
                scrollSensitivity: 30,
                scrollSpeed: 10,
                draggable: /[uo]l/i.test(t.nodeName) ? 'li' : '>*',
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                ignore: 'a, img',
                filter: null,
                preventOnFilter: !0,
                animation: 0,
                setData: function(t, e) {
                  t.setData('Text', e.textContent);
                },
                dropBubble: !1,
                dragoverBubble: !1,
                dataIdAttr: 'data-id',
                delay: 0,
                forceFallback: !1,
                fallbackClass: 'sortable-fallback',
                fallbackOnBody: !1,
                fallbackTolerance: 0,
                fallbackOffset: { x: 0, y: 0 },
                supportPointer: !1 !== W.supportPointer,
              };
              for (var o in n) !(o in e) && (e[o] = n[o]);
              for (var r in (V(e), this))
                '_' === r.charAt(0) &&
                  'function' == typeof this[r] &&
                  (this[r] = this[r].bind(this));
              (this.nativeDraggable = !e.forceFallback && I),
                G(t, 'mousedown', this._onTapStart),
                G(t, 'touchstart', this._onTapStart),
                e.supportPointer && G(t, 'pointerdown', this._onTapStart),
                this.nativeDraggable && (G(t, 'dragover', this), G(t, 'dragenter', this)),
                H.push(this._onDragOver),
                e.store && this.sort(e.store.get(this));
            }
            function X(e, n) {
              'clone' !== e.lastPullMode && (n = !0),
                r &&
                  r.state !== n &&
                  (z(r, 'display', n ? 'none' : ''),
                  n ||
                    (r.state &&
                      (e.options.group.revertClone
                        ? (i.insertBefore(r, s), e._animate(t, r))
                        : i.insertBefore(r, t))),
                  (r.state = n));
            }
            function B(t, e, n) {
              if (t) {
                n = n || S;
                do {
                  if (('>*' === e && t.parentNode === n) || rt(t, e)) return t;
                } while ((t = $(t)));
              }
              return null;
            }
            function $(t) {
              var e = t.host;
              return e && e.nodeType ? e : t.parentNode;
            }
            function G(t, e, n) {
              t.addEventListener(e, n, M);
            }
            function K(t, e, n) {
              t.removeEventListener(e, n, M);
            }
            function Y(t, e, n) {
              if (t)
                if (t.classList) t.classList[n ? 'add' : 'remove'](e);
                else {
                  var o = (' ' + t.className + ' ').replace(_, ' ').replace(' ' + e + ' ', ' ');
                  t.className = (o + (n ? ' ' + e : '')).replace(_, ' ');
                }
            }
            function z(t, e, n) {
              var o = t && t.style;
              if (o) {
                if (void 0 === n)
                  return (
                    S.defaultView && S.defaultView.getComputedStyle
                      ? (n = S.defaultView.getComputedStyle(t, ''))
                      : t.currentStyle && (n = t.currentStyle),
                    void 0 === e ? n : n[e]
                  );
                e in o || (e = '-webkit-' + e), (o[e] = n + ('string' == typeof n ? '' : 'px'));
              }
            }
            function J(t, e, n) {
              if (t) {
                var o = t.getElementsByTagName(e),
                  r = 0,
                  i = o.length;
                if (n) for (; r < i; r++) n(o[r], r);
                return o;
              }
              return [];
            }
            function Q(t, e, n, o, i, s, a, c) {
              t = t || e[k];
              var l = S.createEvent('Event'),
                u = t.options,
                d = 'on' + n.charAt(0).toUpperCase() + n.substr(1);
              l.initEvent(n, !0, !0),
                (l.to = i || e),
                (l.from = s || e),
                (l.item = o || e),
                (l.clone = r),
                (l.oldIndex = a),
                (l.newIndex = c),
                e.dispatchEvent(l),
                u[d] && u[d].call(t, l);
            }
            function Z(t, e, n, o, r, i, s, a) {
              var c,
                l,
                u = t[k],
                d = u.options.onMove;
              return (
                (c = S.createEvent('Event')).initEvent('move', !0, !0),
                (c.to = e),
                (c.from = t),
                (c.dragged = n),
                (c.draggedRect = o),
                (c.related = r || e),
                (c.relatedRect = i || e.getBoundingClientRect()),
                (c.willInsertAfter = a),
                t.dispatchEvent(c),
                d && (l = d.call(u, c, s)),
                l
              );
            }
            function tt(t) {
              t.draggable = !1;
            }
            function et() {
              P = !1;
            }
            function nt(t) {
              for (
                var e = t.tagName + t.className + t.src + t.href + t.textContent,
                  n = e.length,
                  o = 0;
                n--;

              )
                o += e.charCodeAt(n);
              return o.toString(36);
            }
            function ot(t, e) {
              var n = 0;
              if (!t || !t.parentNode) return -1;
              for (; t && (t = t.previousElementSibling); )
                'TEMPLATE' === t.nodeName.toUpperCase() || ('>*' !== e && !rt(t, e)) || n++;
              return n;
            }
            function rt(t, e) {
              if (t) {
                var n = (e = e.split('.')).shift().toUpperCase(),
                  o = new RegExp('\\s(' + e.join('|') + ')(?=\\s)', 'g');
                return !(
                  ('' !== n && t.nodeName.toUpperCase() != n) ||
                  (e.length && ((' ' + t.className + ' ').match(o) || []).length != e.length)
                );
              }
              return !1;
            }
            function it(t, e) {
              var n, o;
              return function() {
                void 0 === n &&
                  ((n = arguments),
                  (o = this),
                  C(function() {
                    1 === n.length ? t.call(o, n[0]) : t.apply(o, n), (n = void 0);
                  }, e));
              };
            }
            function st(t, e) {
              if (t && e) for (var n in e) e.hasOwnProperty(n) && (t[n] = e[n]);
              return t;
            }
            function at(t) {
              return C(t, 0);
            }
            function ct(t) {
              return clearTimeout(t);
            }
            return (
              (W.prototype = {
                constructor: W,
                _onTapStart: function(e) {
                  var n,
                    o = this,
                    r = this.el,
                    i = this.options,
                    s = i.preventOnFilter,
                    c = e.type,
                    l = e.touches && e.touches[0],
                    u = (l || e).target,
                    d = (e.target.shadowRoot && e.path && e.path[0]) || u,
                    f = i.filter;
                  if (
                    ((function(t) {
                      q.length = 0;
                      var e = t.getElementsByTagName('input'),
                        n = e.length;
                      for (; n--; ) {
                        var o = e[n];
                        o.checked && q.push(o);
                      }
                    })(r),
                    !t &&
                      !((/mousedown|pointerdown/.test(c) && 0 !== e.button) || i.disabled) &&
                      !d.isContentEditable &&
                      (u = B(u, i.draggable, r)) &&
                      a !== u)
                  ) {
                    if (((n = ot(u, i.draggable)), 'function' == typeof f)) {
                      if (f.call(this, e, u, this))
                        return Q(o, d, 'filter', u, r, r, n), void (s && e.preventDefault());
                    } else if (
                      f &&
                      (f = f.split(',').some(function(t) {
                        if ((t = B(d, t.trim(), r))) return Q(o, t, 'filter', u, r, r, n), !0;
                      }))
                    )
                      return void (s && e.preventDefault());
                    (i.handle && !B(d, i.handle, r)) || this._prepareDragStart(e, l, u, n);
                  }
                },
                _prepareDragStart: function(o, r, c, l) {
                  var u,
                    d = this,
                    f = d.el,
                    h = d.options,
                    m = f.ownerDocument;
                  c &&
                    !t &&
                    c.parentNode === f &&
                    ((b = o),
                    (i = f),
                    (t = c),
                    h.handleReplacedDragElement && (e = c.getAttribute('id')),
                    (n = t.parentNode),
                    (s = t.nextSibling),
                    (a = c),
                    (g = h.group),
                    (p = l),
                    (this._lastX = (r || o).clientX),
                    (this._lastY = (r || o).clientY),
                    (t.style['will-change'] = 'all'),
                    (u = function() {
                      d._disableDelayedDrag(),
                        (t.draggable = d.nativeDraggable),
                        Y(t, h.chosenClass, !0),
                        d._triggerDragStart(o, r),
                        Q(d, i, 'choose', t, i, i, p);
                    }),
                    h.ignore.split(',').forEach(function(e) {
                      J(t, e.trim(), tt);
                    }),
                    G(m, 'mouseup', d._onDrop),
                    G(m, 'touchend', d._onDrop),
                    G(m, 'touchcancel', d._onDrop),
                    G(m, 'selectstart', d),
                    h.supportPointer && G(m, 'pointercancel', d._onDrop),
                    h.delay
                      ? (G(m, 'mouseup', d._disableDelayedDrag),
                        G(m, 'touchend', d._disableDelayedDrag),
                        G(m, 'touchcancel', d._disableDelayedDrag),
                        G(m, 'mousemove', d._disableDelayedDrag),
                        G(m, 'touchmove', d._disableDelayedDrag),
                        h.supportPointer && G(m, 'pointermove', d._disableDelayedDrag),
                        (d._dragStartTimer = C(u, h.delay)))
                      : u());
                },
                _disableDelayedDrag: function() {
                  var t = this.el.ownerDocument;
                  clearTimeout(this._dragStartTimer),
                    K(t, 'mouseup', this._disableDelayedDrag),
                    K(t, 'touchend', this._disableDelayedDrag),
                    K(t, 'touchcancel', this._disableDelayedDrag),
                    K(t, 'mousemove', this._disableDelayedDrag),
                    K(t, 'touchmove', this._disableDelayedDrag),
                    K(t, 'pointermove', this._disableDelayedDrag);
                },
                _triggerDragStart: function(e, n) {
                  (n = n || ('touch' == e.pointerType ? e : null))
                    ? ((b = { target: t, clientX: n.clientX, clientY: n.clientY }),
                      this._onDragStart(b, 'touch'))
                    : this.nativeDraggable
                    ? (G(t, 'dragend', this), G(i, 'dragstart', this._onDragStart))
                    : this._onDragStart(b, !0);
                  try {
                    S.selection
                      ? at(function() {
                          S.selection.empty();
                        })
                      : window.getSelection().removeAllRanges();
                  } catch (lt) {}
                },
                _dragStarted: function() {
                  if (i && t) {
                    var e = this.options;
                    Y(t, e.ghostClass, !0),
                      Y(t, e.dragClass, !1),
                      (W.active = this),
                      Q(this, i, 'start', t, i, i, p);
                  } else this._nulling();
                },
                _emulateDragOver: function() {
                  if (w) {
                    if (this._lastX === w.clientX && this._lastY === w.clientY) return;
                    (this._lastX = w.clientX),
                      (this._lastY = w.clientY),
                      O || z(o, 'display', 'none');
                    var t = S.elementFromPoint(w.clientX, w.clientY),
                      e = t,
                      n = H.length;
                    if (
                      (t &&
                        t.shadowRoot &&
                        (e = t = t.shadowRoot.elementFromPoint(w.clientX, w.clientY)),
                      e)
                    )
                      do {
                        if (e[k]) {
                          for (; n--; )
                            H[n]({ clientX: w.clientX, clientY: w.clientY, target: t, rootEl: e });
                          break;
                        }
                        t = e;
                      } while ((e = e.parentNode));
                    O || z(o, 'display', '');
                  }
                },
                _onTouchMove: function(t) {
                  if (b) {
                    var e = this.options,
                      n = e.fallbackTolerance,
                      r = e.fallbackOffset,
                      i = t.touches ? t.touches[0] : t,
                      s = i.clientX - b.clientX + r.x,
                      a = i.clientY - b.clientY + r.y,
                      c = t.touches
                        ? 'translate3d(' + s + 'px,' + a + 'px,0)'
                        : 'translate(' + s + 'px,' + a + 'px)';
                    if (!W.active) {
                      if (n && R(N(i.clientX - this._lastX), N(i.clientY - this._lastY)) < n)
                        return;
                      this._dragStarted();
                    }
                    this._appendGhost(),
                      (y = !0),
                      (w = i),
                      z(o, 'webkitTransform', c),
                      z(o, 'mozTransform', c),
                      z(o, 'msTransform', c),
                      z(o, 'transform', c),
                      t.preventDefault();
                  }
                },
                _appendGhost: function() {
                  if (!o) {
                    var e,
                      n = t.getBoundingClientRect(),
                      r = z(t),
                      s = this.options;
                    Y((o = t.cloneNode(!0)), s.ghostClass, !1),
                      Y(o, s.fallbackClass, !0),
                      Y(o, s.dragClass, !0),
                      z(o, 'top', n.top - A(r.marginTop, 10)),
                      z(o, 'left', n.left - A(r.marginLeft, 10)),
                      z(o, 'width', n.width),
                      z(o, 'height', n.height),
                      z(o, 'opacity', '0.8'),
                      z(o, 'position', 'fixed'),
                      z(o, 'zIndex', '100000'),
                      z(o, 'pointerEvents', 'none'),
                      (s.fallbackOnBody && S.body.appendChild(o)) || i.appendChild(o),
                      (e = o.getBoundingClientRect()),
                      z(o, 'width', 2 * n.width - e.width),
                      z(o, 'height', 2 * n.height - e.height);
                  }
                },
                _onDragStart: function(e, n) {
                  var o = e.dataTransfer,
                    r = this.options;
                  this._offUpEvents(),
                    g.checkPull(this, this, t, e),
                    Y(t, r.dragClass, !0),
                    n
                      ? ('touch' === n
                          ? (G(S, 'touchmove', this._onTouchMove),
                            G(S, 'touchend', this._onDrop),
                            G(S, 'touchcancel', this._onDrop),
                            r.supportPointer &&
                              (G(S, 'pointermove', this._onTouchMove),
                              G(S, 'pointerup', this._onDrop)))
                          : (G(S, 'mousemove', this._onTouchMove), G(S, 'mouseup', this._onDrop)),
                        (this._loopId = setInterval(this._emulateDragOver, 50)))
                      : (o && ((o.effectAllowed = 'move'), r.setData && r.setData.call(this, o, t)),
                        G(S, 'drop', this),
                        (this._dragStartId = at(this._dragStarted)));
                },
                _onDragOver: function(a) {
                  var c,
                    l,
                    u,
                    p,
                    m = this.el,
                    b = this.options,
                    w = b.group,
                    E = W.active,
                    T = g === w,
                    _ = !1,
                    L = b.sort;
                  if (
                    (void 0 !== a.preventDefault &&
                      (a.preventDefault(), !b.dragoverBubble && a.stopPropagation()),
                    !t.animated &&
                      ((y = !0),
                      b.handleReplacedDragElement &&
                        !t.parentNode &&
                        e &&
                        Y((t = S.getElementById(e) || t), this.options.ghostClass, !0),
                      E &&
                        !b.disabled &&
                        (T
                          ? L || (p = !i.contains(t))
                          : v === this ||
                            ((E.lastPullMode = g.checkPull(this, E, t, a)) &&
                              w.checkPut(this, E, t, a))) &&
                        (void 0 === a.rootEl || a.rootEl === this.el)))
                  ) {
                    if ((F(a, b, this.el), P)) return;
                    if (
                      ((c = B(a.target, b.draggable, m)),
                      (l = t.getBoundingClientRect()),
                      v !== this && ((v = this), (_ = !0)),
                      p)
                    )
                      return (
                        X(E, !0),
                        (n = i),
                        void (r || s ? i.insertBefore(t, r || s) : L || i.appendChild(t))
                      );
                    if (
                      0 === m.children.length ||
                      m.children[0] === o ||
                      (m === a.target &&
                        (function(t, e) {
                          var n = t.lastElementChild.getBoundingClientRect();
                          return (
                            e.clientY - (n.top + n.height) > 5 || e.clientX - (n.left + n.width) > 5
                          );
                        })(m, a))
                    ) {
                      if (
                        (0 !== m.children.length &&
                          m.children[0] !== o &&
                          m === a.target &&
                          (c = m.lastElementChild),
                        c)
                      ) {
                        if (c.animated) return;
                        u = c.getBoundingClientRect();
                      }
                      X(E, T),
                        !1 !== Z(i, m, t, l, c, u, a) &&
                          (t.contains(m) || (m.appendChild(t), (n = m)),
                          this._animate(l, t),
                          c && this._animate(u, c));
                    } else if (c && !c.animated && c !== t && void 0 !== c.parentNode[k]) {
                      d !== c && ((d = c), (f = z(c)), (h = z(c.parentNode)));
                      var A = (u = c.getBoundingClientRect()).right - u.left,
                        j = u.bottom - u.top,
                        D =
                          x.test(f.cssFloat + f.display) ||
                          ('flex' == h.display && 0 === h['flex-direction'].indexOf('row')),
                        M = c.offsetWidth > t.offsetWidth,
                        I = c.offsetHeight > t.offsetHeight,
                        O = (D ? (a.clientX - u.left) / A : (a.clientY - u.top) / j) > 0.5,
                        N = c.nextElementSibling,
                        R = !1;
                      if (D) {
                        var q = t.offsetTop,
                          H = c.offsetTop;
                        R =
                          q === H
                            ? (c.previousElementSibling === t && !M) || (O && M)
                            : c.previousElementSibling === t || t.previousElementSibling === c
                            ? (a.clientY - u.top) / j > 0.5
                            : H > q;
                      } else _ || (R = (N !== t && !I) || (O && I));
                      var U = Z(i, m, t, l, c, u, a, R);
                      !1 !== U &&
                        ((1 !== U && -1 !== U) || (R = 1 === U),
                        (P = !0),
                        C(et, 30),
                        X(E, T),
                        t.contains(m) ||
                          (R && !N ? m.appendChild(t) : c.parentNode.insertBefore(t, R ? N : c)),
                        (n = t.parentNode),
                        this._animate(l, t),
                        this._animate(u, c));
                    }
                  }
                },
                _animate: function(t, e) {
                  var n = this.options.animation;
                  if (n) {
                    var o = e.getBoundingClientRect();
                    1 === t.nodeType && (t = t.getBoundingClientRect()),
                      z(e, 'transition', 'none'),
                      z(
                        e,
                        'transform',
                        'translate3d(' + (t.left - o.left) + 'px,' + (t.top - o.top) + 'px,0)',
                      ),
                      e.offsetWidth,
                      z(e, 'transition', 'all ' + n + 'ms'),
                      z(e, 'transform', 'translate3d(0,0,0)'),
                      clearTimeout(e.animated),
                      (e.animated = C(function() {
                        z(e, 'transition', ''), z(e, 'transform', ''), (e.animated = !1);
                      }, n));
                  }
                },
                _offUpEvents: function() {
                  var t = this.el.ownerDocument;
                  K(S, 'touchmove', this._onTouchMove),
                    K(S, 'pointermove', this._onTouchMove),
                    K(t, 'mouseup', this._onDrop),
                    K(t, 'touchend', this._onDrop),
                    K(t, 'pointerup', this._onDrop),
                    K(t, 'touchcancel', this._onDrop),
                    K(t, 'pointercancel', this._onDrop),
                    K(t, 'selectstart', this);
                },
                _onDrop: function(e) {
                  var a = this.el,
                    c = this.options;
                  clearInterval(this._loopId),
                    clearInterval(T.pid),
                    clearTimeout(this._dragStartTimer),
                    ct(this._cloneId),
                    ct(this._dragStartId),
                    K(S, 'mouseover', this),
                    K(S, 'mousemove', this._onTouchMove),
                    this.nativeDraggable &&
                      (K(S, 'drop', this), K(a, 'dragstart', this._onDragStart)),
                    this._offUpEvents(),
                    e &&
                      (y && (e.preventDefault(), !c.dropBubble && e.stopPropagation()),
                      o && o.parentNode && o.parentNode.removeChild(o),
                      (i !== n && 'clone' === W.active.lastPullMode) ||
                        (r && r.parentNode && r.parentNode.removeChild(r)),
                      t &&
                        (this.nativeDraggable && K(t, 'dragend', this),
                        tt(t),
                        (t.style['will-change'] = ''),
                        Y(t, this.options.ghostClass, !1),
                        Y(t, this.options.chosenClass, !1),
                        Q(this, i, 'unchoose', t, n, i, p),
                        i !== n
                          ? (m = ot(t, c.draggable)) >= 0 &&
                            (Q(null, n, 'add', t, n, i, p, m),
                            Q(this, i, 'remove', t, n, i, p, m),
                            Q(null, n, 'sort', t, n, i, p, m),
                            Q(this, i, 'sort', t, n, i, p, m))
                          : t.nextSibling !== s &&
                            (m = ot(t, c.draggable)) >= 0 &&
                            (Q(this, i, 'update', t, n, i, p, m),
                            Q(this, i, 'sort', t, n, i, p, m)),
                        W.active &&
                          ((null != m && -1 !== m) || (m = p),
                          Q(this, i, 'end', t, n, i, p, m),
                          this.save()))),
                    this._nulling();
                },
                _nulling: function() {
                  (i = t = n = o = s = r = a = c = l = b = w = y = m = d = f = v = g = W.active = null),
                    q.forEach(function(t) {
                      t.checked = !0;
                    }),
                    (q.length = 0);
                },
                handleEvent: function(e) {
                  switch (e.type) {
                    case 'drop':
                    case 'dragend':
                      this._onDrop(e);
                      break;
                    case 'dragover':
                    case 'dragenter':
                      t &&
                        (this._onDragOver(e),
                        (function(t) {
                          t.dataTransfer && (t.dataTransfer.dropEffect = 'move');
                          t.preventDefault();
                        })(e));
                      break;
                    case 'mouseover':
                      this._onDrop(e);
                      break;
                    case 'selectstart':
                      e.preventDefault();
                  }
                },
                toArray: function() {
                  for (
                    var t, e = [], n = this.el.children, o = 0, r = n.length, i = this.options;
                    o < r;
                    o++
                  )
                    B((t = n[o]), i.draggable, this.el) &&
                      e.push(t.getAttribute(i.dataIdAttr) || nt(t));
                  return e;
                },
                sort: function(t) {
                  var e = {},
                    n = this.el;
                  this.toArray().forEach(function(t, o) {
                    var r = n.children[o];
                    B(r, this.options.draggable, n) && (e[t] = r);
                  }, this),
                    t.forEach(function(t) {
                      e[t] && (n.removeChild(e[t]), n.appendChild(e[t]));
                    });
                },
                save: function() {
                  var t = this.options.store;
                  t && t.set(this);
                },
                closest: function(t, e) {
                  return B(t, e || this.options.draggable, this.el);
                },
                option: function(t, e) {
                  var n = this.options;
                  if (void 0 === e) return n[t];
                  (n[t] = e), 'group' === t && V(n);
                },
                destroy: function() {
                  var t = this.el;
                  (t[k] = null),
                    K(t, 'mousedown', this._onTapStart),
                    K(t, 'touchstart', this._onTapStart),
                    K(t, 'pointerdown', this._onTapStart),
                    this.nativeDraggable && (K(t, 'dragover', this), K(t, 'dragenter', this)),
                    Array.prototype.forEach.call(t.querySelectorAll('[draggable]'), function(t) {
                      t.removeAttribute('draggable');
                    }),
                    H.splice(H.indexOf(this._onDragOver), 1),
                    this._onDrop(),
                    (this.el = t = null);
                },
              }),
              G(S, 'touchmove', function(t) {
                W.active && t.preventDefault();
              }),
              (W.utils = {
                on: G,
                off: K,
                css: z,
                find: J,
                is: function(t, e) {
                  return !!B(t, e, t);
                },
                extend: st,
                throttle: it,
                closest: B,
                toggleClass: Y,
                clone: function(t) {
                  return D && D.dom
                    ? D.dom(t).cloneNode(!0)
                    : j
                    ? j(t).clone(!0)[0]
                    : t.cloneNode(!0);
                },
                index: ot,
                nextTick: at,
                cancelNextTick: ct,
              }),
              (W.create = function(t, e) {
                return new W(t, e);
              }),
              (W.version = '1.7.0'),
              W
            );
          }),
            (t.exports = e());
        });
        function Hr(t) {
          const e = document.querySelector('.sso-modal');
          e &&
            (e.classList.remove('success', 'error'),
            t ? e.classList.add('success') : e.classList.add('error'));
        }
        t('aI', qr),
          Ht('.js-sso-modal-complete', function(t) {
            if (window.opener && window.opener.external.ssoComplete) {
              const e = t.getAttribute('data-error'),
                n = t.getAttribute('data-expires-around');
              window.opener.external.ssoComplete({ error: e, expiresAround: n }), window.close();
            } else {
              const e = t.getAttribute('data-fallback-url');
              window.location = e;
            }
          });
        let Ur = null;
        function Fr() {
          Ur = null;
        }
        let Vr = null;
        function Wr(t) {
          et(t, 'menu:deactivate') &&
            (document.removeEventListener('keydown', Br),
            document.removeEventListener('click', Xr),
            (Vr = null),
            Ir(t, () => {
              t.classList.remove('active');
              const e = t.querySelector('.js-menu-content');
              e && e.setAttribute('aria-expanded', 'false');
              const n = t.querySelector('.js-menu-target');
              n &&
                (n.setAttribute('aria-expanded', 'false'),
                n.hasAttribute('data-no-toggle') || n.classList.remove('selected'));
            }),
            et(t, 'menu:deactivated'));
        }
        function Xr(t) {
          if (!Vr) return;
          const e = t.target;
          dt(e instanceof Element, 'app/assets/modules/github/menu.js:111');
          const n = e.closest('#facebox, .facebox-overlay, details[open], details-dialog'),
            o = !!n && !n.contains(Vr);
          Vr.contains(e) || o || (t.preventDefault(), Wr(Vr));
        }
        function Br(t) {
          if (!Vr) return;
          const e = document.activeElement;
          e && 'Escape' === t.key && (Vr.contains(e) && e.blur(), t.preventDefault(), Wr(Vr));
        }
        tt('click', '.js-menu-container', function(t) {
          const e = t.currentTarget;
          dt(e instanceof HTMLElement, 'app/assets/modules/github/menu.js:157'),
            t.target.closest('.js-menu-target') instanceof HTMLElement
              ? (t.preventDefault(),
                e === Vr
                  ? Wr(e)
                  : (function(t) {
                      Vr && Wr(Vr),
                        et(t, 'menu:activate') &&
                          (document.addEventListener('keydown', Br),
                          document.addEventListener('click', Xr),
                          (Vr = t),
                          Ir(t, () => {
                            t.classList.add('active');
                            const e = t.querySelector('.js-menu-content [tabindex]');
                            e && e.focus();
                            const n = t.querySelector('.js-menu-target');
                            n &&
                              (n.setAttribute('aria-expanded', 'true'),
                              n.hasAttribute('data-no-toggle') || n.classList.add('selected'));
                          }),
                          et(t, 'menu:activated'));
                    })(e))
              : t.target.closest('.js-menu-content') || (e === Vr && (t.preventDefault(), Wr(e)));
        }),
          tt('click', '.js-menu-container .js-menu-close', function(t) {
            const e = t.currentTarget.closest('.js-menu-container');
            dt(
              e instanceof HTMLElement,
              'expected container to be .js-menu-container -- app/assets/modules/github/menu.js:184',
            ),
              Wr(e),
              t.preventDefault();
          }),
          Ht('.js-menu-container.active', {
            add() {
              const t = document.body;
              dt(t, 'app/assets/modules/github/menu.js:193'), t.classList.add('menu-active');
            },
            remove() {
              const t = document.body;
              dt(t, 'app/assets/modules/github/menu.js:198'), t.classList.remove('menu-active');
            },
          });
        const $r = new WeakMap();
        function Gr(t) {
          dt(t instanceof CustomEvent, 'app/assets/modules/github/code-editor.js:18');
          const e = t.detail.editor;
          return $r.set(t.target, e), e;
        }
        function Kr(t) {
          if (t.querySelector('.js-task-list-field'))
            for (const e of u(t, 'task-lists', TaskListsElement)) e.disabled = !1;
        }
        function Yr(t, e, n) {
          const o = l(t, '.js-comment-update', HTMLFormElement);
          !(function(t) {
            for (const e of u(t, 'task-lists', TaskListsElement)) e.disabled = !0;
          })(t);
          const r = o.elements.namedItem('task_list_track');
          r && r.remove();
          const i = o.elements.namedItem('task_list_operation');
          i && i.remove();
          const s = document.createElement('input');
          s.setAttribute('type', 'hidden'),
            s.setAttribute('name', 'task_list_track'),
            s.setAttribute('value', e),
            o.appendChild(s);
          const a = document.createElement('input');
          if (
            (a.setAttribute('type', 'hidden'),
            a.setAttribute('name', 'task_list_operation'),
            a.setAttribute('value', JSON.stringify(n)),
            o.appendChild(a),
            !o.elements.namedItem('task_list_key'))
          ) {
            const t = d(l(o, '.js-task-list-field'), 'name').split('[')[0],
              e = document.createElement('input');
            e.setAttribute('type', 'hidden'),
              e.setAttribute('name', 'task_list_key'),
              e.setAttribute('value', t),
              o.appendChild(e);
          }
          t.classList.remove('is-comment-stale'), he(o);
        }
        tt('codeEditor:ready', '.js-code-editor', Gr),
          Ht('.js-task-list-container .js-task-list-field', function(t) {
            Kr(c(t, '.js-task-list-container'));
          }),
          tt('task-lists-move', 'task-lists', function(t) {
            dt(t instanceof CustomEvent, 'app/assets/modules/github/task-list.js:68');
            const { src: e, dst: n } = t.detail;
            Yr(c(t.currentTarget, '.js-task-list-container'), 'reordered', {
              operation: 'move',
              src: e,
              dst: n,
            });
          }),
          tt('task-lists-check', 'task-lists', function(t) {
            dt(t instanceof CustomEvent, 'app/assets/modules/github/task-list.js:75');
            const { position: e, checked: n } = t.detail;
            Yr(c(t.currentTarget, '.js-task-list-container'), `checked:${n ? 1 : 0}`, {
              operation: 'check',
              position: e,
              checked: n,
            });
          }),
          Te('.js-task-list-container .js-comment-update', async function(t, e) {
            const n = c(t, '.js-task-list-container'),
              o = t.elements.namedItem('task_list_track');
            o && o.remove();
            const r = t.elements.namedItem('task_list_operation');
            let i;
            r && r.remove();
            try {
              i = await e.json();
            } catch (s) {
              let t;
              try {
                t = JSON.parse(s.response.text);
              } catch (a) {}
              if (t && t.stale) {
                const e = t.updated_markdown,
                  o = t.updated_html,
                  r = t.version;
                if (e && o && r) {
                  const t = l(n, '.js-comment-body'),
                    i = l(n, '.js-body-version'),
                    s = l(n, '.js-task-list-field', HTMLTextAreaElement);
                  (t.innerHTML = o),
                    (s.value = e),
                    n.setAttribute('data-body-version', r),
                    i instanceof HTMLInputElement && (i.value = r);
                }
              } else window.location.reload();
            }
            i &&
              (r &&
                i.json.source &&
                (l(n, '.js-task-list-field', HTMLTextAreaElement).value = i.json.source),
              Kr(n));
          });
      },
    };
  });
//# sourceMappingURL=frameworks-e3b03578.js.map
