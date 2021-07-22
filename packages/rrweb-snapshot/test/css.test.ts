import 'mocha';
import { expect } from 'chai';
import { parse, Rule, Media } from '../src/css';

describe('css parser', () => {
  it('should save the filename and source', () => {
    const css = 'booty {\n  size: large;\n}\n';
    const ast = parse(css, {
      source: 'booty.css',
    });

    expect(ast.stylesheet!.source).to.equal('booty.css');

    const position = ast.stylesheet!.rules[0].position!;
    expect(position.start).to.be.ok;
    expect(position.end).to.be.ok;
    expect(position.source).to.equal('booty.css');
    expect(position.content).to.equal(css);
  });

  it('should throw when a selector is missing', () => {
    expect(() => {
      parse('{size: large}');
    }).to.throw();

    expect(() => {
      parse('b { color: red; }\n{ color: green; }\na { color: blue; }');
    }).to.throw();
  });

  it('should throw when a broken comment is found', () => {
    expect(() => {
      parse('thing { color: red; } /* b { color: blue; }');
    }).to.throw();

    expect(() => {
      parse('/*');
    }).to.throw();

    /* Nested comments should be fine */
    expect(() => {
      parse('/* /* */');
    }).to.not.throw();
  });

  it('should allow empty property value', () => {
    expect(() => {
      parse('p { color:; }');
    }).to.not.throw();
  });

  it('should not throw with silent option', () => {
    expect(() => {
      parse('thing { color: red; } /* b { color: blue; }', { silent: true });
    }).to.not.throw();
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
    expect(rules.length).to.above(2);

    const errors = result.stylesheet!.parsingErrors!;
    expect(errors.length).to.equal(2);

    expect(errors[0]).to.have.property('message');
    expect(errors[0]).to.have.property('reason');
    expect(errors[0]).to.have.property('filename');
    expect(errors[0]).to.have.property('line');
    expect(errors[0]).to.have.property('column');
    expect(errors[0]).to.have.property('source');
    expect(errors[0].filename).to.equal('foo.css');
  });

  it('should set parent property', () => {
    const result = parse(
      'thing { test: value; }\n' +
        '@media (min-width: 100px) { thing { test: value; } }',
    );

    expect(result.parent).to.equal(null);

    const rules = result.stylesheet!.rules;
    expect(rules.length).to.equal(2);

    let rule = rules[0] as Rule;
    expect(rule.parent).to.equal(result);
    expect(rule.declarations!.length).to.equal(1);

    let decl = rule.declarations![0];
    expect(decl.parent).to.equal(rule);

    const media = rules[1] as Media;
    expect(media.parent).to.equal(result);
    expect(media.rules!.length).to.equal(1);

    rule = media.rules![0] as Rule;
    expect(rule.parent).to.equal(media);

    expect(rule.declarations!.length).to.equal(1);
    decl = rule.declarations![0];
    expect(decl.parent).to.equal(rule);
  });
});
