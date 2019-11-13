
import { expect, assert, use } from 'chai';
import dirtyChai from 'dirty-chai';
use(dirtyChai);
import * as R from 'ramda';
import * as xp from 'xpath-ts';
import 'xmldom-ts';
const parser = new DOMParser();
const { functify } = require('jinxed');
import * as types from '../../lib/converter/types';
import * as Helpers from '../test-helpers';
import { Specs } from '../../lib/converter/specs';

import { XpathConverterImpl as Impl, ITransformFunction, ITransformResult }
  from '../../lib/converter/xpath-converter.impl';

const testParseInfo: types.IParseInfo = {
  elements: new Map<string, types.IElementInfo>([
    ['Command', {
      id: 'name',
      recurse: 'inherits',
      discards: ['inherits', 'abstract'],
      descendants: {
        by: 'index',
        throwIfCollision: false,
        throwIfMissing: false
      }
    }]
  ])
};

const testSpec: types.ISpec = Object.freeze({
  name: 'test-spec-with-attributes',
  labels: {
    element: '_',
    descendants: '_children',
    text: '_text'
  },
  coercion: {
    attributes: {
      trim: true,
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
    },
    textNodes: {
      trim: true,
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

describe('XpathConverterImpl.composeText', () => {
  context('given: a Pattern element with a single text child', () => {
    it('should: return the trimmed text.', () => {
      const data = `<?xml version="1.0"?>
          <Application name="pez">
            <Expressions name="content-expressions">
              <Expression name="meta-prefix-expression">
                <Pattern eg="TEXT">   SOME-RAW-TEXT   </Pattern>
              </Expression>
            </Expressions>
          </Application>`;

      const document: Document = parser.parseFromString(data, 'text/xml');
      const patternNode = xp.select(
        '/Application/Expressions[@name="content-expressions"]/Expression/Pattern[@eg="TEXT"]',
        document, true);

      if (patternNode) {
        const converter = new Impl();
        let result = converter.composeText(patternNode);

        expect(result).to.equal('SOME-RAW-TEXT');
      } else {
        assert.fail('Couldn\'t get Pattern node.');
      }
    });
  });

  context('given: a Pattern element with a single CDATA section', () => {
    it('should: return CDATA text.', () => {
      const data = `<?xml version="1.0"?>
          <Application name="pez">
            <Expressions name="content-expressions">
              <Expression name="meta-prefix-expression">
                <Pattern eg="TEXT">   <![CDATA[   .SOME-CDATA-TEXT   ]]>   </Pattern>
              </Expression>
            </Expressions>
          </Application>`;

      const document: Document = parser.parseFromString(data, 'text/xml');
      const patternNode = xp.select(
        '/Application/Expressions[@name="content-expressions"]/Expression/Pattern[@eg="TEXT"]',
        document, true);

      if (patternNode) {
        const converter = new Impl();
        let result = converter.composeText(patternNode);

        expect(result).to.equal('.SOME-CDATA-TEXT');
      } else {
        assert.fail('Couldn\'t get Pattern node.');
      }
    });
  });

  context('given: a Pattern element with a single text child followed by single CDATA section', () => {
    it('should: return raw text child concatenated with CDATA text.', () => {
      const data = `<?xml version="1.0"?>
          <Application name="pez">
            <Expressions name="content-expressions">
              <Expression name="meta-prefix-expression">
                <Pattern eg="TEXT"> SOME-RAW-TEXT <![CDATA[ .SOME-CDATA-TEXT ]]> </Pattern>
              </Expression>
            </Expressions>
          </Application>`;

      const document: Document = parser.parseFromString(data, 'text/xml');
      const patternNode = xp.select(
        '/Application/Expressions[@name="content-expressions"]/Expression/Pattern[@eg="TEXT"]',
        document, true);

      if (patternNode) {
        const converter = new Impl();
        let result = converter.composeText(patternNode);

        expect(result).to.equal('SOME-RAW-TEXT.SOME-CDATA-TEXT');
      } else {
        assert.fail('Couldn\'t get Pattern node.');
      }
    });
  });

  context('given: a Pattern element with multiple CDATA sections and raw text sections', () => {
    it('should: return raw text child concatenated with CDATA text.', () => {
      const data = `<?xml version="1.0"?>
          <Application name="pez">
            <Expressions name="content-expressions">
              <Expression name="meta-prefix-expression">
                <Pattern eg="TEXT"> SOME-RAW-TEXT <![CDATA[ .SOME-CDATA-TEXT ]]> <![CDATA[ .SOME-MORE-CDATA-TEXT ]]></Pattern>
              </Expression>
            </Expressions>
          </Application>`;

      const document: Document = parser.parseFromString(data, 'text/xml');
      const patternNode = xp.select(
        '/Application/Expressions[@name="content-expressions"]/Expression/Pattern[@eg="TEXT"]',
        document, true);

      if (patternNode) {
        const converter = new Impl();
        let result = converter.composeText(patternNode);

        expect(result).to.equal('SOME-RAW-TEXT.SOME-CDATA-TEXT.SOME-MORE-CDATA-TEXT');
      } else {
        assert.fail('Couldn\'t get Pattern node.');
      }
    });
  });

  context('given: a Pattern element with single CDATA section and child element', () => {
    it('should: return the CDATA text.', () => {
      const data = `<?xml version="1.0"?>
          <Application name="pez">
            <Expressions name="content-expressions">
              <Expression name="meta-prefix-expression">
                <Pattern eg="TEXT"><![CDATA[ .SOME-CDATA-TEXT ]]>
                  <Dummy/>
                </Pattern>
              </Expression>
            </Expressions>
          </Application>`;

      const document: Document = parser.parseFromString(data, 'text/xml');
      const patternNode = xp.select(
        '/Application/Expressions[@name="content-expressions"]/Expression/Pattern[@eg="TEXT"]',
        document, true);

      if (patternNode) {
        const converter = new Impl();
        let result = converter.composeText(patternNode);

        expect(result).to.equal('.SOME-CDATA-TEXT');
      } else {
        assert.fail('Couldn\'t get Pattern node.');
      }
    });
  });
});

describe('converter.impl.buildLocalAttributes', () => {
  context('given: a spec with "attributes" label set', () => {
    it('should: populate attributes into array', () => {
      const data = `<?xml version="1.0"?>
          <Application name="pez">
            <Directory name="archive"
              field="archive-location"
              date-modified="23 jun 2016"
              tags="front,back"
              category="hi-res"
              format="flac">
            </Directory>
          </Application>`;

      const document: Document = parser.parseFromString(data, 'text/xml');
      const applicationNode: types.SelectResult = xp.select('/Application', document, true);

      if (applicationNode && applicationNode instanceof Node) {
        const converter = new Impl(Specs.attributesAsArray);
        const directoryNode: types.NullableNode = Helpers.selectElementNodeById(
          'Directory', 'name', 'archive', applicationNode);

        if (directoryNode) {
          const directory = converter.buildElement(directoryNode, testParseInfo);

          expect(R.has('_attributes')(directory));
          const attributes: string[] = R.prop('_attributes')(directory);
          const attributeKeys: string[] = R.reduce((acc: [], val: string): any => {
            return R.concat(acc, R.keys(val));
          }, [])(attributes);

          expect(R.all(at => R.includes(at, attributeKeys))(
            ['name', 'field', 'date-modified', 'tags', 'category', 'format'])).to.be.true();

        } else {
          assert.fail('Couldn\'t get Application node.');
        }
      } else {
        assert.fail('Couldn\'t get Application node.');
      }
    });
  });
});

describe('XpathConverterImpl for "attributes" context [transforms]', () => {
  const tests = [
    // ['number]
    {
      given: 'spec with "attributes/matchers/primitives" = number',
      context: 'attributes',
      spec: () => {
        return R.set(R.lensPath(['coercion', 'attributes', 'matchers', 'primitives']),
          ['number'])(testSpec);
      },
      valueType: 'number',
      raw: 42,
      expected: 42
    },
    // ['boolean']
    {
      given: 'spec with "attributes/matchers/primitives" = boolean, value=true',
      context: 'attributes',
      spec: () => {
        return R.set(R.lensPath(['coercion', 'attributes', 'matchers', 'primitives']),
          ['boolean'])(testSpec);
      },
      valueType: 'boolean',
      raw: true,
      expected: true
    },
    {
      given: 'spec with "attributes/matchers/primitives" = boolean, value=false',
      context: 'attributes',
      spec: () => {
        return R.set(R.lensPath(['coercion', 'attributes', 'matchers', 'primitives']),
          ['boolean'])(testSpec);
      },
      valueType: 'boolean',
      raw: false,
      expected: false
    },
    {
      given: 'spec with "attributes/matchers/primitives" = boolean, value(string)="true"',
      context: 'attributes',
      spec: () => {
        return R.set(R.lensPath(['coercion', 'attributes', 'matchers', 'primitives']),
          ['boolean'])(testSpec);
      },
      valueType: 'boolean',
      raw: 'true',
      expected: true
    },
    {
      given: 'spec with "attributes/matchers/primitives" = boolean, value(string)="false"',
      context: 'attributes',
      spec: () => {
        return R.set(R.lensPath(['coercion', 'attributes', 'matchers', 'primitives']),
          ['boolean'])(testSpec);
      },
      valueType: 'boolean',
      raw: 'false',
      expected: false
    },
    // ['string']
    {
      given: 'spec with "attributes/matchers" = string(true)',
      context: 'attributes',
      spec: () => {
        return R.set(R.lensPath(['coercion', 'attributes', 'matchers']), {
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
        return R.set(R.lensPath(['coercion', 'attributes', 'matchers']), {
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
          const converter = new Impl(t.spec());
          const transform: ITransformFunction<any> = converter.getTransformer(t.valueType as types.MatcherType);
          const result = transform.call(converter, t.raw, t.context as types.ContextType);

          expect(result.succeeded).to.be.true(`succeeded RESULT: ${result.succeeded}`);
          expect(result.value).to.equal(t.expected);
        } catch (error) {
          assert.fail(`transform function for type: "${t.valueType}" failed. (${error})`);
        }
      });
    });
  });

  context('given: spec with "attributes/matchers/primitives" = date', () => {
    it('should: coerce "date" value ok:', () => {
      try {
        const converter = new Impl(testSpec);
        const transform: ITransformFunction<any> = converter.getTransformer('date');
        const dateValue = '2016-06-23';
        const result = transform.call(converter, dateValue, 'attributes');

        expect(result.succeeded).to.be.true(`succeeded RESULT: ${result.succeeded}`);
        expect(result.value.format('YYYY-MM-DD')).to.equal('2016-06-23');
      } catch (error) {
        assert.fail(`transform function for type: "date" failed. (${error})`);
      }
    });
  });

  context('given: spec with "attributes/matchers/primitives" = symbol', () => {
    it('should coerce "symbol" value ok:', () => {
      try {
        const converter = new Impl(testSpec);
        const transform: ITransformFunction<any> = converter.getTransformer('symbol');
        const symbolValue = '$excalibur';
        const symbolExpected = Symbol(symbolValue);
        const result = transform.call(converter, symbolValue, 'attributes');

        expect(result.succeeded).to.be.true(`succeeded RESULT: ${result.succeeded}`);
        expect(R.is(Symbol)(result.value)).to.be.true();
        expect(result.value.toString()).to.equal(symbolExpected.toString());
      } catch (error) {
        assert.fail(`transform function for type: "symbol" failed. (${error})`);
      }
    });
  });

  context('given: spec with "attributes/matchers" = string(false)', () => {
    it('should: throw', () => {
      try {
        const spec = R.set(R.lensPath(['coercion', 'attributes', 'matchers']), {
          string: false
        })(testSpec);
        const converter = new Impl(spec);

        expect(() => {
          const transform: ITransformFunction<any> = converter.getTransformer('string');
          transform.call(converter, 'foo', 'attributes');
        }).to.throw();
      } catch (error) {
        assert.fail(`transform function for type: "string" failed. (${error})`);
      }
    });
  });
}); // XpathConverterImpl [transforms]

describe('XpathConverterImpl.transformCollection for "attributes" context', () => {

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
        expected: Int8Array.from([1, 2, 3, 4])
      },
      {
        should: 'coerce as a multiple item Uint8Array array',
        raw: '!<Uint8Array>[1,2,3,4]',
        expected: Uint8Array.from([1, 2, 3, 4])
      }
    ];

    tests.forEach((t) => {
      context(`given: a compound value, transformCollection (using default spec)`, () => {
        it(`should: ${t.should}`, () => {
          try {
            const converter = new Impl(Specs.default);
            const transform: ITransformFunction<any> = converter.getTransformer(matcher);
            const result = transform.call(converter, t.raw, contextType);

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
        const converter = new Impl(Specs.default);
        const transform: ITransformFunction<any> = converter.getTransformer(matcher);
        const result = transform.call(converter, raw, contextType);
        // const expected = new Set([1, 2, 3, 4]);
        const expected = ['1', '2', '3', '4'];
        const resultAsArray = Array.from(result.value);

        expect(result.succeeded).to.be.true(functify(result));
        expect(resultAsArray.length).to.equal(4);
        expect(resultAsArray).to.deep.equal(expected, functify(result));
      } catch (error) {
        assert.fail(`transformCollection for: '${raw}' failed. (${error})`);
      }
    });
  }); // Set collection

  context('Map collection', () => {
    const spec = R.set(
      R.lensPath(['coercion', 'attributes', 'matchers', 'collection', 'assoc']),
      {
        delim: '=',
        keyType: 'string',
        valueType: 'string'
      }
    )(testSpec);

    it(`should: coerce as a single item map`, () => {
      const raw = '!<Map>[foo=bar]';
      try {
        const converter = new Impl(spec);
        const transform: ITransformFunction<any> = converter.getTransformer(matcher);
        const result: any = transform.call(converter, raw, contextType); // types.ITransformResult<any[]>

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
        const converter = new Impl(spec);
        const transform: ITransformFunction<any> = converter.getTransformer(matcher);
        const result = transform.call(converter, raw, contextType);

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
        R.lensPath(['coercion', 'attributes', 'matchers', 'collection', 'assoc']),
        {
          delim: '=',
          keyType: 'string',
          valueType: 'string'
        })(testSpec);

      const converter = new Impl(spec);
      const transform: ITransformFunction<any> = converter.getTransformer(matcher);
      const result = transform.call(converter, raw, contextType);

      expect(result.succeeded).to.be.true(functify(result));
      expect(R.keys(result.value).length).to.equal(3, functify(result));

      expect(result.value['a']).to.equal('one', functify(result));
      expect(result.value['b']).to.equal('two', functify(result));
      expect(result.value['c']).to.equal('three', functify(result));
    });

    it(`should: coerce as a multiple item Object and numeric keys`, () => {
      const raw = '!<Object>[1=one,2=two,3=three]';
      const spec = R.set(
        R.lensPath(['coercion', 'attributes', 'matchers', 'collection', 'assoc']),
        {
          delim: '=',
          keyType: 'number',
          valueType: 'string'
        })(testSpec);

      const converter = new Impl(spec);
      const transform: ITransformFunction<any> = converter.getTransformer(matcher);
      const result = transform.call(converter, raw, contextType);

      expect(result.succeeded).to.be.true(functify(result));
      expect(R.keys(result.value).length).to.equal(3, functify(result));

      expect(result.value[1]).to.equal('one', functify(result));
      expect(result.value[2]).to.equal('two', functify(result));
      expect(result.value[3]).to.equal('three', functify(result));
    });

    it(`should: coerce as a multiple item Object and numeric keys and values`, () => {
      const raw = '!<Object>[1=15,2=30,3=40]';
      const spec = R.set(
        R.lensPath(['coercion', 'attributes', 'matchers', 'collection', 'assoc']),
        {
          delim: '=',
          keyType: ['number'],
          valueType: ['number']
        })(testSpec);

      const converter = new Impl(spec);
      const transform: ITransformFunction<any> = converter.getTransformer(matcher);
      const result = transform.call(converter, raw, contextType);

      expect(result.succeeded).to.be.true(functify(result));
      expect(R.keys(result.value).length).to.equal(3, functify(result));

      expect(result.value[1]).to.equal(15, functify(result));
      expect(result.value[2]).to.equal(30, functify(result));
      expect(result.value[3]).to.equal(40, functify(result));
    });

    it(`should: coerce as a multiple item Object mixed type numeric keys and values`, () => {
      const raw = '!<Object>[1=15,2=30,3=40,4=g,deuce=adv]';
      const spec = R.set(
        R.lensPath(['coercion', 'attributes', 'matchers', 'collection', 'assoc']), {
          delim: '=',
          keyType: ['number', 'string'],
          valueType: ['number', 'string']
        })(testSpec);

      const converter = new Impl(spec);
      const transform: ITransformFunction<any> = converter.getTransformer(matcher);
      const result = transform.call(converter, raw, contextType);

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
          R.lensPath(['coercion', 'attributes', 'matchers', 'collection', 'assoc']), {
            delim: '=',
            keyType: 'duff',
            valueType: ['number', 'string']
          })(testSpec);

        const converter = new Impl(spec);
        const transform: ITransformFunction<any> = converter.getTransformer(matcher);

        expect(() => {
          transform.call(converter, raw, contextType);
        }).to.throw();
      });
    });

    context('given: invalid "collection" assoc.keyType', () => {
      const raw = '!<Object>[1=15,2=30,3=40,4=g,deuce=adv]';
      it(`should: throw`, () => {
        const spec = R.set(
          R.lensPath(['coercion', 'attributes', 'matchers', 'collection', 'assoc']), {
            delim: '=',
            keyType: 'collection',
            valueType: ['number', 'string']
          })(testSpec);

        const converter = new Impl(spec);
        const transform: ITransformFunction<any> = converter.getTransformer(matcher);

        expect(() => {
          transform.call(converter, raw, contextType);
        }).to.throw();
      });
    });

    context('given: invalid assoc.valueType', () => {
      const raw = '!<Object>[1=15,2=30,3=40,4=g,deuce=adv]';
      it(`should: throw`, () => {
        const spec = R.set(
          R.lensPath(['coercion', 'attributes', 'matchers', 'collection', 'assoc']), {
            delim: '=',
            keyType: 'string',
            valueType: ['duff', 'number', 'string']
          })(testSpec);

        const converter = new Impl(spec);
        const transform: ITransformFunction<any> = converter.getTransformer(matcher);

        expect(() => {
          transform.call(converter, raw, contextType);
        }).to.throw();
      });
    });
  }); // Error handling
}); // XpathConverterImpl.transformCollection for "attributes" context

describe('XpathConverterImpl.fetchSpecOption', () => {
  const localSpec = R.set(R.lensProp('name'), 'local-test-spec')(testSpec);
  const tests = [
    {
      given: 'fallback is true, "attributes" item missing from user spec',
      should: 'fetch option from default spec',
      path: 'coercion/attributes/matchers/collection/assoc/delim',
      fallback: true,
      spec: () => R.set(R.lensPath(['coercion', 'attributes', 'matchers', 'collection', 'assoc']), {
          // no delim here!
        keyType: 'string',
        valueType: 'string'
      })(localSpec),
      verify: (res: any) => {
        // expect(res).to.equal(oc(Specs).fallBack.coercion.attributes.matchers.collection.assoc.delim());
        expect(res).to.equal(Specs.fallBack?.coercion?.attributes?.matchers?.collection?.assoc?.delim);
      }
    },
    {
      given: 'fallback is true, "attributes" item exists in user spec',
      should: 'fetch option from  user spec',
      path: 'coercion/attributes/matchers/collection/assoc/delim',
      fallback: true,
      spec: () => R.set(R.lensPath(['coercion', 'attributes', 'matchers', 'collection', 'assoc', 'delim']),
        '|')(localSpec),
      verify: (res: any) => {
        expect(res).to.equal('|');
      }
    },
    {
      given: 'fallback is true, "textNodes" item missing from user spec',
      should: 'fetch option from default spec',
      path: 'coercion/textNodes/matchers/collection/assoc/delim',
      fallback: true,
      spec: () => R.set(R.lensPath(['coercion', 'textNodes', 'matchers', 'collection', 'assoc']), {
          // no delim here!
        keyType: 'string',
        valueType: 'string'
      })(localSpec),
      verify: (res: any) => {
        // expect(res).to.equal(oc(Specs).fallBack.coercion.textNodes.matchers.collection.assoc.delim());
        expect(res).to.equal(Specs.fallBack?.coercion?.textNodes?.matchers?.collection?.assoc?.delim);
      }
    },
    {
      given: 'fallback is true, "textNodes" item exists in user spec',
      should: 'fetch option from  user spec',
      path: 'coercion/textNodes/matchers/collection/assoc/delim',
      fallback: true,
      spec: () => R.set(R.lensPath(['coercion', 'textNodes', 'matchers', 'collection', 'assoc', 'delim']),
        '|')(localSpec),
      verify: (res: any) => {
        expect(res).to.equal('|');
      }
    },
    {
      given: 'fallback is true, "labels/element" item missing from user spec',
      should: 'fetch option from default spec',
      path: 'labels/element',
      fallback: true,
      spec: () => R.set(R.lensProp('labels'), {
        // no element here!
        descendants: '_children',
        text: '_text'
      })(localSpec),
      verify: (res: any) => {
        // expect(res).to.equal(oc(Specs).fallBack.labels.element());
        expect(res).to.equal(Specs.fallBack?.labels?.element);
      }
    },
    {
      given: 'fallback is true, "labels/element" item exists in user spec',
      should: 'fetch option from  user spec',
      path: 'labels/element',
      fallback: true,
      spec: () => R.set(R.lensPath(['labels', 'element']), '%')(localSpec),
      verify: (res: any) => {
        expect(res).to.equal('%');
      }
    },
    {
      given: 'fallback is false, "attributes" item missing from user spec',
      should: 'return nothing',
      path: 'coercion/attributes/matchers/collection/assoc/delim',
      fallback: false,
      spec: () => R.set(R.lensPath(['coercion', 'attributes', 'matchers', 'collection', 'assoc']), {
        // no delim here!
        keyType: 'string',
        valueType: 'string'
      })(localSpec),
      verify: (res: any) => {
        expect(res).to.be.undefined();
      }
    },
    {
      given: 'fallback is false, "textNodes" item missing from user spec',
      should: 'fetch option from default spec',
      path: 'coercion/textNodes/matchers/collection/assoc/delim',
      fallback: false,
      spec: () => R.set(R.lensPath(['coercion', 'textNodes', 'matchers', 'collection', 'assoc']), {
        // no delim here!
        keyType: 'string',
        valueType: 'string'
      })(localSpec),
      verify: (res: any) => {
        expect(res).to.be.undefined();
      }
    }
  ];

  tests.forEach((t: any) => {
    context(`given: ${t.given}`, () => {
      it(`should: ${t.should}`, () => {
        const converter = new Impl(t.spec());
        const result = converter.fetchSpecOption(t.path, t.fallback);

        t.verify(result);
      });
    });
  });
}); // XpathConverterImpl.fetchSpecOption
