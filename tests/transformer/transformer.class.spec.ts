
import { expect, assert, use } from 'chai';
import dirtyChai = require('dirty-chai');
use(dirtyChai);
import * as sinon from 'sinon';
import sinonChai = require('sinon-chai');
use(sinonChai);
import * as R from 'ramda';
import 'xmldom-ts';
const { functify } = require('jinxed');
import * as types from '../../lib/types';
import { Transformer, ITransformFunction } from '../../lib/transformer/transformer.class';
import { SpecOptionService, Specs } from '../../lib/specService/spec-option-service.class';

describe('Transformer for "attributes" context', () => {
  afterEach(() => {
    sinon.reset();
  });

  const tests = [
    // ['number']
    {
      given: 'spec with "attributes/coercion/matchers/primitives" = number',
      context: 'attributes',
      path: 'attributes/coercion/matchers/primitives',
      specValue: ['number'],
      valueType: 'number',
      raw: 42,
      expected: 42
    },
    // ['boolean']
    {
      given: 'spec with "attributes/coercion/matchers/primitives" = boolean, value=true',
      context: 'attributes',
      path: 'attributes/coercion/matchers/primitives',
      specValue: ['boolean'],
      valueType: 'boolean',
      raw: true,
      expected: true
    },
    {
      given: 'spec with "attributes/coercion/matchers/primitives" = boolean, value=false',
      context: 'attributes',
      path: 'attributes/coercion/matchers/primitives',
      specValue: ['boolean'],
      valueType: 'boolean',
      raw: false,
      expected: false
    },
    {
      given: 'spec with "attributes/coercion/matchers/primitives" = boolean, value(string)="true"',
      context: 'attributes',
      path: 'attributes/coercion/matchers/primitives',
      specValue: ['boolean'],
      valueType: 'boolean',
      raw: 'true',
      expected: true
    },
    {
      given: 'spec with "attributes/coercion/matchers/primitives" = boolean, value(string)="false"',
      context: 'attributes',
      path: 'attributes/coercion/matchers/primitives',
      specValue: ['boolean'],
      valueType: 'boolean',
      raw: 'false',
      expected: false
    },
    // string
    {
      given: 'spec with "attributes/coercion/matchers" = string(true)',
      context: 'attributes',
      path: 'attributes/coercion/matchers/string',
      specValue: { string: true },
      valueType: 'string',
      raw: 'foo',
      expected: 'foo'
    },
    {
      given: 'spec without a final string matcher and unhandled string value',
      context: 'attributes',
      path: 'attributes/coercion/matchers/string',
      specValue: true,
      valueType: 'string',
      raw: 'foo',
      expected: 'foo'
    },
    // number
    {
      given: 'spec with "attributes/coercion/matchers/number"',
      context: 'attributes',
      path: 'attributes/coercion/matchers/number',
      specValue: null, // THIS CAN BE ANYTHING (number matcher doesn't need a config value)
      valueType: 'number',
      raw: '10',
      expected: 10
    },
    // boolean
    {
      given: 'spec with "attributes/coercion/matchers/boolean"',
      context: 'attributes',
      path: 'attributes/coercion/matchers/boolean',
      specValue: null, // THIS CAN BE ANYTHING (boolean matcher doesn't need a config value)
      valueType: 'boolean',
      raw: true,
      expected: true
    }
  ];

  tests.forEach((t: any) => {
    context(`given: ${t.given}`, () => {
      it(`should: coerce "${t.valueType}" value ok`, () => {
        try {
          const stub = new SpecOptionService();
          sinon.stub(stub, 'fetchOption')
            .withArgs(t.path).returns(t.specValue);

          const transformer = new Transformer(stub);
          const transform: ITransformFunction<any> = transformer.getTransform(t.valueType as types.MatcherStr);
          const subject = '/SUBJECT';
          const result = transform.call(transformer, subject, t.raw, t.context as types.SpecContext);

          expect(result.succeeded).to.be.true(`succeeded RESULT: ${result.succeeded}`);
          expect(result.value).to.equal(t.expected);
        } catch (error) {
          assert.fail(`transform function for type: "${t.valueType}" failed. (${error})`);
        }
      });
    });
  });

  context('given: spec with "attributes/coercion/matchers/primitives" = date', () => {
    it('should: coerce "date" value ok:', () => {
      try {
        const stub = new SpecOptionService();
        sinon.stub(stub, 'fetchOption')
          .withArgs('attributes/coercion/matchers/date/format').returns('YYYY-MM-DD');

        const transformer = new Transformer(stub);
        const transform: ITransformFunction<any> = transformer.getTransform('date');
        const subject = '/SUBJECT';
        const dateValue = '2016-06-23';
        const result = transform.call(transformer, subject, dateValue, 'attributes');

        expect(result.succeeded).to.be.true(`succeeded RESULT: ${result.succeeded}`);
        expect(result.value.format('YYYY-MM-DD')).to.equal('2016-06-23');
      } catch (error) {
        assert.fail(`transform function for type: "date" failed. (${error})`);
      }
    });
  });

  context('given: spec with invalid primitives', () => {
    it('should: throw', () => {
      const stub = new SpecOptionService();
      sinon.stub(stub, 'fetchOption')
        .withArgs('attributes/coercion/matchers/primitives').returns(['duff']);

      const transformer = new Transformer(stub);
      const transform: ITransformFunction<any> = transformer.getTransform('primitives');
      const subject = '/SUBJECT';
      const strValue = 'chop-sticks';
      expect(() => {
        transform.call(transformer, subject, strValue, 'attributes');
      }).to.throw();
    });
  });

  context('given: spec where "attributes/coercion/matchers/string" is missing', () => {
    it('should: still coerce as a string value', () => {
      try {
        const stub = new SpecOptionService();
        sinon.stub(stub, 'fetchOption')
          .withArgs('attributes/coercion/matchers/string').returns(undefined);

        const transformer = new Transformer(stub);
        const transform: ITransformFunction<any> = transformer.getTransform('string');
        const subject = '/SUBJECT';
        const strValue = 'chop-sticks';
        const result = transform.call(transformer, subject, strValue, 'attributes');

        expect(result.succeeded).to.be.true(`succeeded RESULT: ${result.succeeded}`);
        expect(result.value).to.equal('chop-sticks');
      } catch (error) {
        assert.fail(`transform function for type: "string" failed. (${error})`);
      }
    });
  });

  context('given: spec with "attributes/coercion/matchers/primitives" = date and invalid date', () => {
    it('should: return negative transform result', () => {
      try {
        const stub = new SpecOptionService();
        sinon.stub(stub, 'fetchOption')
          .withArgs('attributes/coercion/matchers/date/format').returns('YYYY-MM-DD');

        const transformer = new Transformer(stub);
        const transform: ITransformFunction<any> = transformer.getTransform('date');
        const subject = '/SUBJECT';
        const dateValue = 'blah';
        const result = transform.call(transformer, subject, dateValue, 'attributes');

        expect(result.succeeded).to.be.false(`succeeded RESULT: ${result.succeeded}`);
      } catch (error) {
        assert.fail(`transform function for type: "date" failed. (${error})`);
      }
    });
  });

  context('given: spec with "attributes/coercion/matchers/primitives" = symbol', () => {
    it('should coerce "symbol" value ok:', () => {
      try {
        const stub = new SpecOptionService();
        sinon.stub(stub, 'fetchOption')
          .withArgs('attributes/coercion/matchers/symbol/prefix').returns('$')
          .withArgs('attributes/coercion/matchers/symbol/global').returns(true);

        const transformer = new Transformer(stub);
        const transform: ITransformFunction<any> = transformer.getTransform('symbol');
        const subject = '/SUBJECT';
        const symbolValue = '$excalibur';
        const symbolExpected = Symbol(symbolValue);
        const result = transform.call(transformer, subject, symbolValue, 'attributes');

        expect(result.succeeded).to.be.true(`succeeded RESULT: ${result.succeeded}`);
        expect(R.is(Symbol)(result.value)).to.be.true();
        expect(result.value.toString()).to.equal(symbolExpected.toString());
      } catch (error) {
        assert.fail(`transform function for type: "symbol" failed. (${error})`);
      }
    });
  });

  context('given: spec with "attributes/coercion/matchers/primitives" = symbol (NON-GLOBAL)', () => {
    it('should coerce "symbol" value ok:', () => {
      try {
        const stub = new SpecOptionService();
        sinon.stub(stub, 'fetchOption')
          .withArgs('attributes/coercion/matchers/symbol/prefix').returns('$')
          .withArgs('attributes/coercion/matchers/symbol/global').returns(false);

        const transformer = new Transformer(stub);
        const transform: ITransformFunction<any> = transformer.getTransform('symbol');
        const subject = '/SUBJECT';
        const symbolValue = '$excalibur';
        const symbolExpected = Symbol(symbolValue);
        const result = transform.call(transformer, subject, symbolValue, 'attributes');

        expect(result.succeeded).to.be.true(`succeeded RESULT: ${result.succeeded}`);
        expect(R.is(Symbol)(result.value)).to.be.true();
        expect(result.value.toString()).to.equal(symbolExpected.toString());
      } catch (error) {
        assert.fail(`transform function for type: non global "symbol" failed. (${error})`);
      }
    });
  });

  context('given: spec with "attributes/coercion/matchers" = string(false)', () => {
    it('should: throw', () => {
      try {
        const stub = new SpecOptionService();
        sinon.stub(stub, 'fetchOption')
          .withArgs('attributes/coercion/matchers/string').returns(false);
        const transformer = new Transformer(stub);
        const subject = '/SUBJECT';

        expect(() => {
          const transform: ITransformFunction<any> = transformer.getTransform('string');
          transform.call(transformer, subject, 'foo', 'attributes');
        }).to.throw();
      } catch (error) {
        assert.fail(`transform function for type: "string" failed. (${error})`);
      }
    });
  });

  context('given: incorrectly cased matcher name', () => {
    it('should: throw', () => {
      try {
        const stub = new SpecOptionService();
        const transformer = new Transformer(stub);

        expect(() => {
          transformer.getTransform('Number' as types.MatcherStr);
        }).to.throw();
      } catch (error) {
        assert.fail(`transform function for type: "string" failed. (${error})`);
      }
    });
  });

}); // Transformer for "attributes" context

describe('Transformer.transformCollection for "attributes" context', () => {
  class Stub {
    constructor (private spec: types.ISpec) {
      this.elementLabel = '_';
      this.descendantsLabel = '_children';
      this.textLabel = '_text';
    }

    fetchOption (path: string, fallBack: boolean = true): any {
      const segments: string[] = R.split('/')(path);
      const itemLens: R.Lens = R.lensPath(segments);
      const result = fallBack ? R.defaultTo(R.view(itemLens)(Specs.fallBack),
          R.view(itemLens)(this.spec)) : R.view(itemLens)(this.spec);

      return result;
    }
    readonly elementLabel: string;
    readonly descendantsLabel: string;
    readonly textLabel: string;
    getSpec (): types.ISpec {
      return this.spec;
    }
  }

  const contextType: types.SpecContext = 'attributes';
  const matcher: types.MatcherStr = 'collection';

  context('Array collection', () => {
    const tests = [
      // [] (array of strings)
      {
        should: 'coerce as a single item array',
        raw: '!<[]>[foo]',
        expected: ['foo']
      },
      {
        should: 'coerce as a multiple item string array',
        raw: '!<[]>[foo,bar,baz]',
        expected: ['foo', 'bar', 'baz']
      },
      {
        should: 'coerce as a multiple item mix-type array',
        raw: '!<[]>[one,42,true,foo]',
        expected: ['one', 42, true, 'foo']
      },
      {
        should: 'coerce as a multiple item numeric array',
        raw: '!<[]>[1,2,3,4]',
        expected: [1, 2, 3, 4]
      },
      {
        should: 'coerce as a multiple item boolean array',
        raw: '!<[]>[true,false,true,false]',
        expected: [true, false, true, false]
      }
    ];

    tests.forEach((t) => {
      context(`given: a compound value, transformCollection (using default spec)`, () => {
        it(`should: ${t.should}`, () => {
          try {
            const transformer = new Transformer(new Stub(Specs.default));
            const transform: ITransformFunction<any> = transformer.getTransform(matcher);
            const subject = '/SUBJECT';
            const result = transform.call(transformer, subject, t.raw, contextType);

            expect(result.succeeded).to.be.true(functify(result));
            expect(result.value).to.deep.equal(t.expected, functify(result));
          } catch (error) {
            assert.fail(`transformCollection for: "${t.raw}" failed. (${error})`);
          }
        });
      });
    });

    context('given: a compound value that doesn\'t match open and close patterns', () => {
      it('should: return negative transform result', () => {
        const missingClose = '!<[]>[foo,bar,baz';
        try {
          const transformer = new Transformer(new Stub(Specs.default));
          const transform: ITransformFunction<any> = transformer.getTransform(matcher);
          const subject = '/SUBJECT';
          const result = transform.call(transformer, subject, missingClose, contextType);

          expect(result.succeeded).to.be.false(functify(result));
        } catch (error) {
          assert.fail(`transformCollection for: "${missingClose}" failed. (${error})`);
        }
      });
    });
  }); // Array collection

  context('Set collection', () => {
    it(`should: coerce as a multiple item Set`, () => {
      const raw = '!<Set>[1,2,3,4]';
      try {
        const stub = new SpecOptionService();
        sinon.stub(stub, 'fetchOption')
          .withArgs('attributes/coercion/matchers/collection/delim').returns(',')
          .withArgs('attributes/coercion/matchers/collection/open').returns('!<type>[')
          .withArgs('attributes/coercion/matchers/collection/close').returns(']')
          .withArgs('attributes/coercion/matchers/collection/elementTypes').returns(['number', 'boolean'])
          .withArgs('attributes/coercion/matchers/primitives').returns(['number', 'boolean']);

        const transformer = new Transformer(stub);
        const transform: ITransformFunction<any> = transformer.getTransform(matcher);
        const subject = '/SUBJECT';
        const result = transform.call(transformer, subject, raw, contextType);
        const expected = new Set([1, 2, 3, 4]);

        expect(result.succeeded).to.be.true(functify(result));
        expect(result.value).to.deep.equal(expected, functify(result));
      } catch (error) {
        assert.fail(`transformCollection for: '${raw}' failed. (${error})`);
      }
    });
  }); // Set collection

  // Need the same test as above, but change the assoc.valueType to 'number'
  // and the resulting set should contain numbers

  context('Map collection', () => {
    it(`should: coerce as a single item map`, () => {
      const raw = '!<Map>[foo=bar]';
      try {
        const stub = new SpecOptionService();
        sinon.stub(stub, 'fetchOption')
          .withArgs('attributes/coercion/matchers/collection/delim').returns(',')
          .withArgs('attributes/coercion/matchers/collection/open').returns('!<type>[')
          .withArgs('attributes/coercion/matchers/collection/close').returns(']')
          .withArgs('attributes/coercion/matchers/collection/assoc/delim').returns('=')
          .withArgs('attributes/coercion/matchers/collection/assoc/keyType').returns('string')
          .withArgs('attributes/coercion/matchers/collection/assoc/valueType').returns('string')
          .withArgs('attributes/coercion/matchers/string').returns(true);

        const transformer = new Transformer(stub);
        const transform: ITransformFunction<any> = transformer.getTransform(matcher);
        const subject = '/SUBJECT';
        const result: any = transform.call(transformer, subject, raw, contextType); // types.ITransformResult<any[]>

        expect(result.succeeded).to.be.true(functify(result));
        expect(result.value.size).to.equal(1, functify(result));
        expect(result.value.get('foo')).to.equal('bar', functify(result));
      } catch (error) {
        assert.fail(`transformCollection for: '${raw}' failed. (${error})`);
      }
    });

    it(`should: coerce as a multi item map`, () => {
      const raw = '!<Map>[a=one,b=two,c=three]';

      try {
        const stub = new SpecOptionService();
        sinon.stub(stub, 'fetchOption')
          .withArgs('attributes/coercion/matchers/collection/delim').returns(',')
          .withArgs('attributes/coercion/matchers/collection/open').returns('!<type>[')
          .withArgs('attributes/coercion/matchers/collection/close').returns(']')
          .withArgs('attributes/coercion/matchers/collection/assoc/delim').returns('=')
          .withArgs('attributes/coercion/matchers/collection/assoc/keyType').returns('string')
          .withArgs('attributes/coercion/matchers/collection/assoc/valueType').returns('string')
          .withArgs('attributes/coercion/matchers/string').returns(true);

        const transformer = new Transformer(stub);
        const transform: ITransformFunction<any> = transformer.getTransform(matcher);
        const subject = '/SUBJECT';
        const result = transform.call(transformer, subject, raw, contextType);

        expect(result.succeeded).to.be.true(functify(result));
        expect(result.value.size).to.equal(3, functify(result));

        expect(result.value.get('a')).to.equal('one', functify(result));
        expect(result.value.get('b')).to.equal('two', functify(result));
        expect(result.value.get('c')).to.equal('three', functify(result));
      } catch (error) {
        assert.fail(`transformCollection for: '${raw}' failed. (${error})`);
      }
    });

    context('given: malformed map entry', () => {
      it(`should: throw`, () => {
        const raw = '!<Map>[foo=bar=baz]';
        try {
          const stub = new SpecOptionService();
          sinon.stub(stub, 'fetchOption')
            .withArgs('attributes/coercion/matchers/collection/delim').returns(',')
            .withArgs('attributes/coercion/matchers/collection/open').returns('!<type>[')
            .withArgs('attributes/coercion/matchers/collection/close').returns(']')
            .withArgs('attributes/coercion/matchers/collection/assoc/delim').returns('=')
            .withArgs('attributes/coercion/matchers/collection/assoc/keyType').returns('string')
            .withArgs('attributes/coercion/matchers/collection/assoc/valueType').returns('string')
            .withArgs('attributes/coercion/matchers/string').returns(true);

          const transformer = new Transformer(stub);
          const transform: ITransformFunction<any> = transformer.getTransform(matcher);
          const subject = '/SUBJECT';

          expect(() => {
            transform.call(transformer, subject, raw, contextType);
          }).to.throw();
        } catch (error) {
          assert.fail(`transformCollection for: '${raw}' failed. (${error})`);
        }
      });
    });

    context('given: spec with invalid elementTypes', () => {
      it('should: throw', () => {
        const stub = new SpecOptionService();
        sinon.stub(stub, 'fetchOption')
          .withArgs('attributes/coercion/matchers/collection/delim').returns(',')
          .withArgs('attributes/coercion/matchers/collection/open').returns('!<type>[')
          .withArgs('attributes/coercion/matchers/collection/close').returns(']')
          .withArgs('attributes/coercion/matchers/collection/elementTypes').returns(['duff']);

        const transformer = new Transformer(stub);
        const transform: ITransformFunction<any> = transformer.getTransform('collection');
        const subject = '/SUBJECT';
        const strValue = '!<[]>[1,2,3,4]';

        expect(() => {
          transform.call(transformer, subject, strValue, 'attributes');
        }).to.throw();
      });
    });

    context('given: invalid assoc value type', () => {
      it(`should: return negative transform result`, () => {
        const raw = '!<Map>[foo=not-a-number]';
        try {
          const stub = new SpecOptionService();
          sinon.stub(stub, 'fetchOption')
            .withArgs('attributes/coercion/matchers/collection/delim').returns(',')
            .withArgs('attributes/coercion/matchers/collection/open').returns('!<type>[')
            .withArgs('attributes/coercion/matchers/collection/close').returns(']')
            .withArgs('attributes/coercion/matchers/collection/assoc/delim').returns('=')
            .withArgs('attributes/coercion/matchers/collection/assoc/keyType').returns('string')
            .withArgs('attributes/coercion/matchers/collection/assoc/valueType').returns('number')
            .withArgs('attributes/coercion/matchers/string').returns(true);

          const transformer = new Transformer(stub);
          const transform: ITransformFunction<any> = transformer.getTransform(matcher);
          const subject = '/SUBJECT';
          const result = transform.call(transformer, subject, raw, contextType);
          expect(result.succeeded).to.be.false();
        } catch (error) {
          assert.fail(`transformCollection for: '${raw}' failed. (${error})`);
        }
      });
    });

  }); // Map collection

  context('Object instance collection', () => {
    it(`should: coerce as a multiple item Object`, () => {
      const raw = '!<Object>[a=one,b=two,c=three]';

      const stub = new SpecOptionService();
      sinon.stub(stub, 'fetchOption')
        .withArgs('attributes/coercion/matchers/collection/delim').returns(',')
        .withArgs('attributes/coercion/matchers/collection/open').returns('!<type>[')
        .withArgs('attributes/coercion/matchers/collection/close').returns(']')
        .withArgs('attributes/coercion/matchers/collection/assoc/delim').returns('=')
        .withArgs('attributes/coercion/matchers/collection/assoc/keyType').returns('string')
        .withArgs('attributes/coercion/matchers/collection/assoc/valueType').returns('string')
        .withArgs('attributes/coercion/matchers/string').returns(true);

      const transformer = new Transformer(stub);
      const transform: ITransformFunction<any> = transformer.getTransform(matcher);
      const subject = '/SUBJECT';
      const result = transform.call(transformer, subject, raw, contextType);

      expect(result.succeeded).to.be.true(functify(result));
      expect(R.keys(result.value).length).to.equal(3, functify(result));

      expect(result.value['a']).to.equal('one', functify(result));
      expect(result.value['b']).to.equal('two', functify(result));
      expect(result.value['c']).to.equal('three', functify(result));
    });

    it(`should: coerce as a multiple item Object and numeric keys`, () => {
      const raw = '!<Object>[1=one,2=two,3=three]';

      const stub = new SpecOptionService();
      sinon.stub(stub, 'fetchOption')
        .withArgs('attributes/coercion/matchers/collection/delim').returns(',')
        .withArgs('attributes/coercion/matchers/collection/open').returns('!<type>[')
        .withArgs('attributes/coercion/matchers/collection/close').returns(']')
        .withArgs('attributes/coercion/matchers/collection/assoc/delim').returns('=')
        .withArgs('attributes/coercion/matchers/collection/assoc/keyType').returns('number')
        .withArgs('attributes/coercion/matchers/collection/assoc/valueType').returns('string')
        .withArgs('attributes/coercion/matchers/string').returns(true);

      const transformer = new Transformer(stub);
      const transform: ITransformFunction<any> = transformer.getTransform(matcher);
      const subject = '/SUBJECT';
      const result = transform.call(transformer, subject, raw, contextType);

      expect(result.succeeded).to.be.true(functify(result));
      expect(R.keys(result.value).length).to.equal(3, functify(result));

      expect(result.value[1]).to.equal('one', functify(result));
      expect(result.value[2]).to.equal('two', functify(result));
      expect(result.value[3]).to.equal('three', functify(result));
    });

    it(`should: coerce as a multiple item Object and numeric keys and values`, () => {
      const raw = '!<Object>[1=15,2=30,3=40]';

      const stub = new SpecOptionService();
      sinon.stub(stub, 'fetchOption')
        .withArgs('attributes/coercion/matchers/collection/delim').returns(',')
        .withArgs('attributes/coercion/matchers/collection/open').returns('!<type>[')
        .withArgs('attributes/coercion/matchers/collection/close').returns(']')
        .withArgs('attributes/coercion/matchers/collection/assoc/delim').returns('=')
        .withArgs('attributes/coercion/matchers/collection/assoc/keyType').returns('number')
        .withArgs('attributes/coercion/matchers/collection/assoc/valueType').returns('number')
        .withArgs('attributes/coercion/matchers/string').returns(true);

      const transformer = new Transformer(stub);
      const transform: ITransformFunction<any> = transformer.getTransform(matcher);
      const subject = '/SUBJECT';
      const result = transform.call(transformer, subject, raw, contextType);

      expect(result.succeeded).to.be.true(functify(result));
      expect(R.keys(result.value).length).to.equal(3, functify(result));

      expect(result.value[1]).to.equal(15, functify(result));
      expect(result.value[2]).to.equal(30, functify(result));
      expect(result.value[3]).to.equal(40, functify(result));
    });

    it(`should: coerce as a multiple item Object mixed type numeric keys and values`, () => {
      const raw = '!<Object>[1=15,2=30,3=40,4=g,deuce=adv]';

      const stub = new SpecOptionService();
      sinon.stub(stub, 'fetchOption')
        .withArgs('attributes/coercion/matchers/collection/delim').returns(',')
        .withArgs('attributes/coercion/matchers/collection/open').returns('!<type>[')
        .withArgs('attributes/coercion/matchers/collection/close').returns(']')
        .withArgs('attributes/coercion/matchers/collection/assoc/delim').returns('=')
        .withArgs('attributes/coercion/matchers/collection/assoc/keyType').returns(['number', 'string'])
        .withArgs('attributes/coercion/matchers/collection/assoc/valueType').returns(['number', 'string'])
        .withArgs('attributes/coercion/matchers/string').returns(true);

      const transformer = new Transformer(stub);
      const transform: ITransformFunction<any> = transformer.getTransform(matcher);
      const subject = '/SUBJECT';
      const result = transform.call(transformer, subject, raw, contextType);

      expect(result.succeeded).to.be.true(functify(result));
      expect(R.keys(result.value).length).to.equal(5, functify(result));

      expect(result.value[1]).to.equal(15, functify(result));
      expect(result.value[4]).to.equal('g', functify(result));
      expect(result.value['deuce']).to.equal('adv', functify(result));
    });
  }); // Object instance collection

  context('Error handling', () => {
    context('given: invalid assoc.keyType', () => {
      it(`should: throw`, () => {
        const raw = '!<Object>[1=15,2=30,3=40,4=g,deuce=adv]';
        const stub = new SpecOptionService();
        sinon.stub(stub, 'fetchOption')
          .withArgs('attributes/coercion/matchers/collection/delim').returns(',')
          .withArgs('attributes/coercion/matchers/collection/open').returns('!<type>[')
          .withArgs('attributes/coercion/matchers/collection/close').returns(']')
          .withArgs('attributes/coercion/matchers/collection/assoc/delim').returns('=')
          .withArgs('attributes/coercion/matchers/collection/assoc/keyType').returns('duff') // <-- !!
          .withArgs('attributes/coercion/matchers/collection/assoc/valueType').returns(['number', 'string'])
          .withArgs('attributes/coercion/matchers/string').returns(true);

        const transformer = new Transformer(stub);
        const transform: ITransformFunction<any> = transformer.getTransform(matcher);
        const subject = '/SUBJECT';

        expect(() => {
          transform.call(transformer, subject, raw, contextType);
        }).to.throw();
      });
    });

    context('given: invalid "collection" assoc.keyType', () => {
      it(`should: throw`, () => {
        const raw = '!<Object>[1=15,2=30,3=40,4=g,deuce=adv]';
        const stub = new SpecOptionService();
        sinon.stub(stub, 'fetchOption')
          .withArgs('attributes/coercion/matchers/collection/delim').returns(',')
          .withArgs('attributes/coercion/matchers/collection/open').returns('!<type>[')
          .withArgs('attributes/coercion/matchers/collection/close').returns(']')
          .withArgs('attributes/coercion/matchers/collection/assoc/delim').returns('=')
          .withArgs('attributes/coercion/matchers/collection/assoc/keyType').returns('collection') // <-- !!
          .withArgs('attributes/coercion/matchers/collection/assoc/valueType').returns(['number', 'string'])
          .withArgs('attributes/coercion/matchers/string').returns(true);

        const transformer = new Transformer(stub);
        const transform: ITransformFunction<any> = transformer.getTransform(matcher);
        const subject = '/SUBJECT';

        expect(() => {
          transform.call(transformer, subject, raw, contextType);
        }).to.throw();
      });
    });

    context('given: invalid assoc.valueType', () => {
      it(`should: throw`, () => {
        const raw = '!<Object>[1=15,2=30,3=40,4=g,deuce=adv]';
        const stub = new SpecOptionService();
        sinon.stub(stub, 'fetchOption')
          .withArgs('attributes/coercion/matchers/collection/delim').returns(',')
          .withArgs('attributes/coercion/matchers/collection/open').returns('!<type>[')
          .withArgs('attributes/coercion/matchers/collection/close').returns(']')
          .withArgs('attributes/coercion/matchers/collection/assoc/delim').returns('=')
          .withArgs('attributes/coercion/matchers/collection/assoc/keyType').returns('string')
          .withArgs('attributes/coercion/matchers/collection/assoc/valueType').returns(['duff', 'number', 'string']) // <-- !!
          .withArgs('attributes/coercion/matchers/string').returns(true);

        const transformer = new Transformer(stub);
        const transform: ITransformFunction<any> = transformer.getTransform(matcher);
        const subject = '/SUBJECT';

        expect(() => {
          transform.call(transformer, subject, raw, contextType);
        }).to.throw();
      });
    });

    context('given: unknown collection type', () => {
      it(`should: throw`, () => {
        const raw = '!<duff>[foo=bar]';
        const stub = new SpecOptionService();
        sinon.stub(stub, 'fetchOption')
          .withArgs('attributes/coercion/matchers/collection/delim').returns(',')
          .withArgs('attributes/coercion/matchers/collection/open').returns('!<type>[')
          .withArgs('attributes/coercion/matchers/collection/close').returns(']')
          .withArgs('attributes/coercion/matchers/collection/assoc/delim').returns('=')
          .withArgs('attributes/coercion/matchers/collection/assoc/keyType').returns('string')
          .withArgs('attributes/coercion/matchers/collection/assoc/valueType').returns('string')
          .withArgs('attributes/coercion/matchers/string').returns(true);

        const transformer = new Transformer(stub);
        const transform: ITransformFunction<any> = transformer.getTransform(matcher);
        const subject = '/SUBJECT';

        expect(() => {
          transform.call(transformer, subject, raw, contextType);
        }).to.throw();
      });
    });

    context('given: malformed object entry', () => {
      it(`should: throw`, () => {
        const raw = '!<Object>[1=15,2=30,3=40,4=g,deuce=adv=game]'; // <-- !!

        const stub = new SpecOptionService();
        sinon.stub(stub, 'fetchOption')
          .withArgs('attributes/coercion/matchers/collection/delim').returns(',')
          .withArgs('attributes/coercion/matchers/collection/open').returns('!<type>[')
          .withArgs('attributes/coercion/matchers/collection/close').returns(']')
          .withArgs('attributes/coercion/matchers/collection/assoc/delim').returns('=')
          .withArgs('attributes/coercion/matchers/collection/assoc/keyType').returns(['number', 'string'])
          .withArgs('attributes/coercion/matchers/collection/assoc/valueType').returns(['number', 'string'])
          .withArgs('attributes/coercion/matchers/string').returns(true);

        const transformer = new Transformer(stub);
        const transform: ITransformFunction<any> = transformer.getTransform(matcher);
        const subject = '/SUBJECT';

        expect(() => {
          transform.call(transformer, subject, raw, contextType);
        }).to.throw();
      });
    });

    context('given: invalid key coercion, valid value coercion', () => {
      it(`should: throw`, () => {
        const raw = '!<Object>[1=15,2=30,3=40,4=g,deuce=adv]'; // <-- !!

        const stub = new SpecOptionService();
        sinon.stub(stub, 'fetchOption')
          .withArgs('attributes/coercion/matchers/collection/delim').returns(',')
          .withArgs('attributes/coercion/matchers/collection/open').returns('!<type>[')
          .withArgs('attributes/coercion/matchers/collection/close').returns(']')
          .withArgs('attributes/coercion/matchers/collection/assoc/delim').returns('=')
          .withArgs('attributes/coercion/matchers/collection/assoc/keyType').returns('number')
          .withArgs('attributes/coercion/matchers/collection/assoc/valueType').returns(['number', 'string'])
          .withArgs('attributes/coercion/matchers/string').returns(true);

        const transformer = new Transformer(stub);
        const transform: ITransformFunction<any> = transformer.getTransform(matcher);
        const subject = '/SUBJECT';

        expect(() => {
          transform.call(transformer, subject, raw, contextType);
        }).to.throw();
      });
    });
  }); // Error handling
}); // Transformer.transformCollection for "attributes" context

describe('Transformer.getTransform for typed collection', () => {
  const tests = [
    {
      collectionType: 'Int8Array',
      value: '!<Int8Array>[1,2,3,4]'
    },
    {
      collectionType: 'Uint8Array',
      value: '!<Uint8Array>[1,2,3,4]'
    },
    {
      collectionType: 'Uint8ClampedArray',
      value: '!<Uint8ClampedArray>[1,2,3,4]'
    },
    {
      collectionType: 'Int16Array',
      value: '!<Int16Array>[1,2,3,4]'
    },
    {
      collectionType: 'Uint16Array',
      value: '!<Uint16Array>[1,2,3,4]'
    },
    {
      collectionType: 'Int32Array',
      value: '!<Int32Array>[1,2,3,4]'
    },
    {
      collectionType: 'Uint32Array',
      value: '!<Uint32Array>[1,2,3,4]'
    },
    {
      collectionType: 'Float32Array',
      value: '!<Float32Array>[1,2,3,4]'
    },
    {
      collectionType: 'Float64Array',
      value: '!<Float64Array>[1,2,3,4]'
    },
    {
      collectionType: 'Set',
      value: '!<Set>[1,2,3,4]'
    },
    // {
    //   collectionType: 'WeakSet',
    //   value: '!<WeakSet>[1,2,3,4]'
    // }
    {
      collectionType: 'Map',
      value: '!<Map>[a=one,b=two,c=three,d=four]'
    }
    // {
    //   collectionType: 'WeakMap',
    //   value: '!<WeakMap>[a=one,b=two,c=three,d=four]'
    // }
  ];

  tests.forEach((t) => {
    context(`given: "${t.collectionType}" defined as the collection type`, () => {
      it(`should: return ${t.collectionType} collection ok`, () => {
        const open = `!<${t.collectionType}>[`;
        const spec: types.ISpec = {
          name: 'collection-spec-with-custom-open-pattern',
          attributes: {
            coercion: {
              matchers: {
                collection: {
                  open: open
                }
              }
            }
          }
        };

        const options = new SpecOptionService(spec);
        const transformer = new Transformer(options);
        const transform: ITransformFunction<any> = transformer.getTransform('collection');
        const subject = '/SUBJECT';
        transform.call(transformer, subject, t.value, 'attributes');
      });
    });
  });

  context('given: non-numeric value defined in a numeric typed array', () => {
    it('should: throw', () => {
      const value = '!<Int8Array>[bad-robot,2,3,4]'; // <-- !!
      const spec: types.ISpec = {
        name: 'collection-spec-with-custom-open-pattern',
        attributes: {
          coercion: {
            matchers: {
              collection: {
                open: '!<Int8Array>['
              }
            }
          }
        }
      };

      const options = new SpecOptionService(spec);
      const transformer = new Transformer(options);
      const transform: ITransformFunction<any> = transformer.getTransform('collection');
      const subject = '/SUBJECT';

      expect(() => {
        transform.call(transformer, subject, value, 'attributes');
      }).to.throw();
    });
  });
});  // Transformer.getTransform for typed collection
