
import { expect, assert, use } from 'chai';
import dirtyChai from 'dirty-chai';
use(dirtyChai);
import * as R from 'ramda';
import * as xp from 'xpath-ts';
import 'xmldom-ts';
const parser = new DOMParser();
const { functify } = require('jinxed');
import * as types from '../../lib/types';
import { Specs } from '../../lib/specs';
import * as Helpers from '../test-helpers';
import { Transformer, ITransformFunction } from '../../lib/transformer/transformer.class';

const testSpec: types.ISpec = Object.freeze({
  name: 'test-spec-with-attributes',
  labels: {
    element: '_',
    descendants: '_children',
    text: '_text'
  },
  attributes: {
    trim: true,
    coercion: {
      matchers: {
        primitives: ['number', 'boolean'],
        collection: {
          delim: ',',
          open: '!<type>[',
          close: ']',
          assoc: {
            delim: '=',
            keyType: 'string',
            valueType: 'string'
          }
        },
        date: {
          format: 'YYYY-MM-DD'
        },
        symbol: {
          prefix: '$',
          global: true
        },
        string: true
      }
    }
  },
  textNodes: {
    trim: true,
    coercion: {
      matchers: {
        primitives: ['number', 'boolean'],
        collection: {
          assoc: {
            delim: '=',
            keyType: 'string',
            valueType: 'string'
          }
        },
        date: {
          format: 'YYYY-MM-DD'
        },
        symbol: {
          prefix: '$',
          global: true
        },
        string: true
      }
    }
  }
});

class Stub {
  constructor (private spec: types.ISpec) {
    //
  }
  fetchSpecOption (path: string, fallBack: boolean = true): any {
    const segments: string[] = R.split('/')(path);
    const itemLens: R.Lens = R.lensPath(segments);

    const result = fallBack
      ? R.defaultTo(R.view(itemLens)(Specs.fallBack), R.view(itemLens)(this.spec))
      : R.view(itemLens)(this.spec);

    return result;
  }
}

describe('Transformer for "attributes" context', () => {
  const tests = [
    // ['number]
    {
      given: 'spec with "attributes/coercion/matchers/primitives" = number',
      context: 'attributes',
      spec: () => {
        return R.set(R.lensPath(['attributes', 'coercion', 'matchers', 'primitives']),
          ['number'])(testSpec);
      },
      valueType: 'number',
      raw: 42,
      expected: 42
    },
    // ['boolean']
    {
      given: 'spec with "attributes/coercion/matchers/primitives" = boolean, value=true',
      context: 'attributes',
      spec: () => {
        return R.set(R.lensPath(['attributes', 'coercion', 'matchers', 'primitives']),
          ['boolean'])(testSpec);
      },
      valueType: 'boolean',
      raw: true,
      expected: true
    },
    {
      given: 'spec with "attributes/coercion/matchers/primitives" = boolean, value=false',
      context: 'attributes',
      spec: () => {
        return R.set(R.lensPath(['attributes', 'coercion', 'matchers', 'primitives']),
          ['boolean'])(testSpec);
      },
      valueType: 'boolean',
      raw: false,
      expected: false
    },
    {
      given: 'spec with "attributes/coercion/matchers/primitives" = boolean, value(string)="true"',
      context: 'attributes',
      spec: () => {
        return R.set(R.lensPath(['attributes', 'coercion', 'matchers', 'primitives']),
          ['boolean'])(testSpec);
      },
      valueType: 'boolean',
      raw: 'true',
      expected: true
    },
    {
      given: 'spec with "attributes/coercion/matchers/primitives" = boolean, value(string)="false"',
      context: 'attributes',
      spec: () => {
        return R.set(R.lensPath(['attributes', 'coercion', 'matchers', 'primitives']),
          ['boolean'])(testSpec);
      },
      valueType: 'boolean',
      raw: 'false',
      expected: false
    },
    // ['string']
    {
      given: 'spec with "attributes/coercion/matchers" = string(true)',
      context: 'attributes',
      spec: () => {
        return R.set(R.lensPath(['attributes', 'coercion', 'matchers']), {
          string: true
        })(testSpec);
      },
      valueType: 'string',
      raw: 'foo',
      expected: 'foo'
    },
    {
      given: 'spec without a final string matcher and unhandled string value',
      context: 'attributes',
      spec: () => {
        return R.set(R.lensPath(['attributes', 'coercion', 'matchers']), {
          primitives: ['number', 'boolean'],
          date: {
            format: 'YYYY-MM-DD'
          }
        })(testSpec);
      },
      valueType: 'string',
      raw: 'foo',
      expected: 'foo'
    }
  ];

  tests.forEach((t) => {
    context(`given: ${t.given}`, () => {
      it(`should: coerce "${t.valueType}" value ok`, () => {
        try {
          const transformer = new Transformer(new Stub(t.spec()));
          const transform: ITransformFunction<any> = transformer.getTransform(t.valueType as types.MatcherType);
          const subject = '/SUBJECT';
          const result = transform.call(transformer, subject, t.raw, t.context as types.ContextType);

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
        const transformer = new Transformer(new Stub(testSpec));
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

  context('given: spec with "attributes/coercion/matchers/primitives" = symbol', () => {
    it('should coerce "symbol" value ok:', () => {
      try {
        const transformer = new Transformer(new Stub(testSpec));
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

  context('given: spec with "attributes/coercion/matchers" = string(false)', () => {
    it('should: throw', () => {
      try {
        const spec = R.set(R.lensPath(['attributes', 'coercion', 'matchers']), {
          string: false
        })(testSpec);
        const transformer = new Transformer(new Stub(spec));

        expect(() => {
          const transform: ITransformFunction<any> = transformer.getTransform('string');
          transform.call(transformer, 'foo', 'attributes');
        }).to.throw();
      } catch (error) {
        assert.fail(`transform function for type: "string" failed. (${error})`);
      }
    });
  });
}); // Transformer for "attributes" context

describe('Transformer.transformCollection for "attributes" context', () => {

  const contextType: types.ContextType = 'attributes';
  const matcher: types.MatcherType = 'collection';

  context('Array collection', () => {
    const tests = [
      // []
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
        should: 'coerce as a multiple item numeric array',
        raw: '!<[]>[1,2,3,4]',
        expected: [1, 2, 3, 4]
      },
      {
        should: 'coerce as a multiple item boolean array',
        raw: '!<[]>[true,false,true,false]',
        expected: [true, false, true, false]
      },
      {
        should: 'coerce as a multiple item mix-type array',
        raw: '!<[]>[one,42,true,foo]',
        expected: ['one', 42, true, 'foo']
      },
      // TypedArrays
      {
        should: 'coerce as a multiple item Int8Array array',
        raw: '!<Int8Array>[1,2,3,4]',
        expected: [1, 2, 3, 4]
      },
      {
        should: 'coerce as a multiple item Uint8Array array',
        raw: '!<Uint8Array>[1,2,3,4]',
        expected: [1, 2, 3, 4]
      }
    ];

    tests.forEach((t) => {
      context(`given: a compound value, transformCollection (using default spec)`, () => {
        it(`should: ${t.should}`, () => {
          try {
            const converter = new Transformer(new Stub(Specs.default));
            const transform: ITransformFunction<any> = converter.getTransform(matcher);
            const subject = '/SUBJECT';
            const result = transform.call(converter, subject, t.raw, contextType);

            expect(result.succeeded).to.be.true(functify(result));
            expect(result.value).to.deep.equal(t.expected, functify(result));
          } catch (error) {
            assert.fail(`transformCollection for: "${t.raw}" failed. (${error})`);
          }
        });
      });
    });
  }); // Array collection

  context('Set collection', () => {
    // TODO: This test has exposed a bug in the extraction of collection items. When
    // values are extracted and coercion is active, they should be extracted as native type,
    // not just strings.
    //
    it(`should: coerce as a multiple item Set`, () => {
      const raw = '!<Set>[1,2,3,4]';
      try {
        const converter = new Transformer(new Stub(Specs.default));
        const transform: ITransformFunction<any> = converter.getTransform(matcher);
        const subject = '/SUBJECT';
        const result = transform.call(converter, subject, raw, contextType);
        // const expected = new Set([1, 2, 3, 4]);
        // const expected = ['1', '2', '3', '4'];
        const expected = [1, 2, 3, 4];
        const resultAsArray = Array.from(result.value);

        expect(result.succeeded).to.be.true(functify(result));
        expect(resultAsArray.length).to.equal(4);
        expect(resultAsArray).to.deep.equal(expected, functify(result));
      } catch (error) {
        assert.fail(`transformCollection for: '${raw}' failed. (${error})`);
      }
    });
  }); // Set collection

  // Need the same test as above, but change the assoc.valueType to 'number'
  // and the resulting set should contain numbers

  context('Map collection', () => {
    const spec = R.set(
      R.lensPath(['attributes', 'coercion', 'matchers', 'collection', 'assoc']),
      {
        delim: '=',
        keyType: 'string',
        valueType: 'string'
      }
    )(testSpec);

    it(`should: coerce as a single item map`, () => {
      const raw = '!<Map>[foo=bar]';
      try {
        const converter = new Transformer(new Stub(spec));
        const transform: ITransformFunction<any> = converter.getTransform(matcher);
        const subject = '/SUBJECT';
        const result: any = transform.call(converter, subject, raw, contextType); // types.ITransformResult<any[]>

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
        const converter = new Transformer(new Stub(spec));
        const transform: ITransformFunction<any> = converter.getTransform(matcher);
        const subject = '/SUBJECT';
        const result = transform.call(converter, subject, raw, contextType);

        expect(result.succeeded).to.be.true(functify(result));
        expect(result.value.size).to.equal(3, functify(result));

        expect(result.value.get('a')).to.equal('one', functify(result));
        expect(result.value.get('b')).to.equal('two', functify(result));
        expect(result.value.get('c')).to.equal('three', functify(result));
      } catch (error) {
        assert.fail(`transformCollection for: '${raw}' failed. (${error})`);
      }
    });
  }); // Map collection

  context('Object instance collection', () => {
    it(`should: coerce as a multiple item Object`, () => {
      const raw = '!<Object>[a=one,b=two,c=three]';
      const spec = R.set(
        R.lensPath(['attributes', 'coercion', 'matchers', 'collection', 'assoc']),
        {
          delim: '=',
          keyType: 'string',
          valueType: 'string'
        })(testSpec);

      const converter = new Transformer(new Stub(spec));
      const transform: ITransformFunction<any> = converter.getTransform(matcher);
      const subject = '/SUBJECT';
      const result = transform.call(converter, subject, raw, contextType);

      expect(result.succeeded).to.be.true(functify(result));
      expect(R.keys(result.value).length).to.equal(3, functify(result));

      expect(result.value['a']).to.equal('one', functify(result));
      expect(result.value['b']).to.equal('two', functify(result));
      expect(result.value['c']).to.equal('three', functify(result));
    });

    it(`should: coerce as a multiple item Object and numeric keys`, () => {
      const raw = '!<Object>[1=one,2=two,3=three]';
      const spec = R.set(
        R.lensPath(['attributes', 'coercion', 'matchers', 'collection', 'assoc']),
        {
          delim: '=',
          keyType: 'number',
          valueType: 'string'
        })(testSpec);

      const converter = new Transformer(new Stub(spec));
      const transform: ITransformFunction<any> = converter.getTransform(matcher);
      const subject = '/SUBJECT';
      const result = transform.call(converter, subject, raw, contextType);

      expect(result.succeeded).to.be.true(functify(result));
      expect(R.keys(result.value).length).to.equal(3, functify(result));

      expect(result.value[1]).to.equal('one', functify(result));
      expect(result.value[2]).to.equal('two', functify(result));
      expect(result.value[3]).to.equal('three', functify(result));
    });

    it(`should: coerce as a multiple item Object and numeric keys and values`, () => {
      const raw = '!<Object>[1=15,2=30,3=40]';
      const spec = R.set(
        R.lensPath(['attributes', 'coercion', 'matchers', 'collection', 'assoc']),
        {
          delim: '=',
          keyType: ['number'],
          valueType: ['number']
        })(testSpec);

      const converter = new Transformer(new Stub(spec));
      const transform: ITransformFunction<any> = converter.getTransform(matcher);
      const subject = '/SUBJECT';
      const result = transform.call(converter, subject, raw, contextType);

      expect(result.succeeded).to.be.true(functify(result));
      expect(R.keys(result.value).length).to.equal(3, functify(result));

      expect(result.value[1]).to.equal(15, functify(result));
      expect(result.value[2]).to.equal(30, functify(result));
      expect(result.value[3]).to.equal(40, functify(result));
    });

    it(`should: coerce as a multiple item Object mixed type numeric keys and values`, () => {
      const raw = '!<Object>[1=15,2=30,3=40,4=g,deuce=adv]';
      const spec = R.set(
        R.lensPath(['attributes', 'coercion', 'matchers', 'collection', 'assoc']), {
          delim: '=',
          keyType: ['number', 'string'],
          valueType: ['number', 'string']
        })(testSpec);

      const converter = new Transformer(new Stub(spec));
      const transform: ITransformFunction<any> = converter.getTransform(matcher);
      const subject = '/SUBJECT';
      const result = transform.call(converter, subject, raw, contextType);

      expect(result.succeeded).to.be.true(functify(result));
      expect(R.keys(result.value).length).to.equal(5, functify(result));

      expect(result.value[1]).to.equal(15, functify(result));
      expect(result.value[4]).to.equal('g', functify(result));
      expect(result.value['deuce']).to.equal('adv', functify(result));
    });
  }); // Object instance collection

  context('Error handling', () => {
    context('given: invalid assoc.keyType', () => {
      const raw = '!<Object>[1=15,2=30,3=40,4=g,deuce=adv]';
      it(`should: throw`, () => {
        const spec = R.set(
          R.lensPath(['attributes', 'coercion', 'matchers', 'collection', 'assoc']), {
            delim: '=',
            keyType: 'duff',
            valueType: ['number', 'string']
          })(testSpec);

        const converter = new Transformer(new Stub(spec));
        const transform: ITransformFunction<any> = converter.getTransform(matcher);
        const subject = '/SUBJECT';

        expect(() => {
          transform.call(converter, subject, raw, contextType);
        }).to.throw();
      });
    });

    context('given: invalid "collection" assoc.keyType', () => {
      const raw = '!<Object>[1=15,2=30,3=40,4=g,deuce=adv]';
      it(`should: throw`, () => {
        const spec = R.set(
          R.lensPath(['attributes', 'coercion', 'matchers', 'collection', 'assoc']), {
            delim: '=',
            keyType: 'collection',
            valueType: ['number', 'string']
          })(testSpec);

        const converter = new Transformer(new Stub(spec));
        const transform: ITransformFunction<any> = converter.getTransform(matcher);
        const subject = '/SUBJECT';

        expect(() => {
          transform.call(converter, subject, raw, contextType);
        }).to.throw();
      });
    });

    context('given: invalid assoc.valueType', () => {
      const raw = '!<Object>[1=15,2=30,3=40,4=g,deuce=adv]';
      it(`should: throw`, () => {
        const spec = R.set(
          R.lensPath(['attributes', 'coercion', 'matchers', 'collection', 'assoc']), {
            delim: '=',
            keyType: 'string',
            valueType: ['duff', 'number', 'string']
          })(testSpec);

        const converter = new Transformer(new Stub(spec));
        const transform: ITransformFunction<any> = converter.getTransform(matcher);
        const subject = '/SUBJECT';

        expect(() => {
          transform.call(converter, subject, raw, contextType);
        }).to.throw();
      });
    });
  }); // Error handling
}); // XpathConverterImpl.transformCollection for "attributes" context
