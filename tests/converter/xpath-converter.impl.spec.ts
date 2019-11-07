
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
import { XpathConverterImpl as Impl } from '../../lib/converter/xpath-converter.impl';

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

      const document = parser.parseFromString(data, 'text/xml');
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

      const document = parser.parseFromString(data, 'text/xml');
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

      const document = parser.parseFromString(data, 'text/xml');
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

      const document = parser.parseFromString(data, 'text/xml');
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
                  </Dummy>
                </Pattern>
              </Expression>
            </Expressions>
          </Application>`;

      const document = parser.parseFromString(data, 'text/xml');
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
