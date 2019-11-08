
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

import { XpathConverterImpl as Impl, ITransformFunction } from '../../lib/converter/xpath-converter.impl';

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
      const applicationNode = xp.select('/Application', document, true);

      if (applicationNode) {
        const converter = new Impl(Specs.attributesAsArray);
        const directoryNode = Helpers.selectElementNodeById(
          'Directory', 'name', 'archive', applicationNode) || {};
        const directory = converter.buildElement(directoryNode, applicationNode,
          testParseInfo);

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
}); // convert.impl [transforms]
