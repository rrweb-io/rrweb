import { parse, Rule, Media } from '../src/css';
import { validateStringifiedCssRule } from './../src/utils';

describe('css parser', () => {
  it('should save the filename and source', () => {
    const css = 'booty {\n  size: large;\n}\n';
    const ast = parse(css, {
      source: 'booty.css',
    });

    expect(ast.stylesheet!.source).toEqual('booty.css');

    const position = ast.stylesheet!.rules[0].position!;
    expect(position.start).toBeTruthy();
    expect(position.end).toBeTruthy();
    expect(position.source).toEqual('booty.css');
    expect(position.content).toEqual(css);
  });

  it('should throw when a selector is missing', () => {
    expect(() => {
      parse('{size: large}');
    }).toThrow();

    expect(() => {
      parse('b { color: red; }\n{ color: green; }\na { color: blue; }');
    }).toThrow();
  });

  it('should throw when a broken comment is found', () => {
    expect(() => {
      parse('thing { color: red; } /* b { color: blue; }');
    }).toThrow();

    expect(() => {
      parse('/*');
    }).toThrow();

    /* Nested comments should be fine */
    expect(() => {
      parse('/* /* */');
    }).not.toThrow();
  });

  it('should allow empty property value', () => {
    expect(() => {
      parse('p { color:; }');
    }).not.toThrow();
  });

  it('should not throw with silent option', () => {
    expect(() => {
      parse('thing { color: red; } /* b { color: blue; }', { silent: true });
    }).not.toThrow();
  });

  it('should list the parsing errors and continue parsing', () => {
    const result = parse(
      'foo { color= red; } bar { color: blue; } baz {}} boo { display: none}',
      {
        silent: true,
        source: 'foo.css',
      },
    );

    const rules = result.stylesheet!.rules;
    expect(rules.length).toBeGreaterThan(2);

    const errors = result.stylesheet!.parsingErrors!;
    expect(errors.length).toEqual(2);

    expect(errors[0]).toHaveProperty('message');
    expect(errors[0]).toHaveProperty('reason');
    expect(errors[0]).toHaveProperty('filename');
    expect(errors[0]).toHaveProperty('line');
    expect(errors[0]).toHaveProperty('column');
    expect(errors[0]).toHaveProperty('source');
    expect(errors[0].filename).toEqual('foo.css');
  });

  it('should set parent property', () => {
    const result = parse(
      'thing { test: value; }\n' +
        '@media (min-width: 100px) { thing { test: value; } }',
    );

    expect(result.parent).toEqual(null);

    const rules = result.stylesheet!.rules;
    expect(rules.length).toEqual(2);

    let rule = rules[0] as Rule;
    expect(rule.parent).toEqual(result);
    expect(rule.declarations!.length).toEqual(1);

    let decl = rule.declarations![0];
    expect(decl.parent).toEqual(rule);

    const media = rules[1] as Media;
    expect(media.parent).toEqual(result);
    expect(media.rules!.length).toEqual(1);

    rule = media.rules![0] as Rule;
    expect(rule.parent).toEqual(media);

    expect(rule.declarations!.length).toEqual(1);
    decl = rule.declarations![0];
    expect(decl.parent).toEqual(rule);
  });

  it('parses : in attribute selectors correctly', () => {
    const out1 = validateStringifiedCssRule('[data-foo] { color: red; }');
    expect(out1).toEqual('[data-foo] { color: red; }');

    const out2 = validateStringifiedCssRule('[data-foo:other] { color: red; }');
    expect(out2).toEqual('[data-foo\\:other] { color: red; }');

    const out3 = validateStringifiedCssRule(
      '[data-aa\\:other] { color: red; }',
    );
    expect(out3).toEqual('[data-aa\\:other] { color: red; }');
  });
});
