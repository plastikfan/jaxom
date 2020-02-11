import { functify } from 'jinxed';
import { expect, assert, use } from 'chai';
import dirtyChai = require('dirty-chai');
use(dirtyChai);
import * as path from 'path';
import * as fs from 'fs';
import * as types from '../../lib/types';
import { ParseInfoFactory } from '../../lib/cli/parseinfo-factory.class';

describe('ParseInfoFactory', () => {
  context('given: parse info file with all top level fields', () => {
    it('should: create Parse Info instance ok', () => {
      const resolved = path.resolve(__dirname, './test.parseInfo.all.json');
      const source: string = fs.readFileSync(resolved, 'utf8');

      const factory = new ParseInfoFactory();
      const parseInfo: types.IParseInfo = factory.get(source);
      expect(parseInfo.elements.size).to.equal(3);
      expect(parseInfo.common).not.to.be.undefined();
      expect(parseInfo.def).not.to.be.undefined();
    });
  });

  context('given: parse info file with no common field', () => {
    it('should: create Parse Info instance ok', () => {
      const resolved = path.resolve(__dirname, './test.parseInfo.no-common.json');
      const source: string = fs.readFileSync(resolved, 'utf8');

      const factory = new ParseInfoFactory();
      const parseInfo: types.IParseInfo = factory.get(source);
      expect(parseInfo.elements.size).to.equal(3);
      expect(parseInfo.common).to.be.undefined();
      expect(parseInfo.def).not.to.be.undefined();
    });
  });

  context('given: parse info file with no def field', () => {
    it('should: create Parse Info instance ok', () => {
      const resolved = path.resolve(__dirname, './test.parseInfo.no-def.json');
      const source: string = fs.readFileSync(resolved, 'utf8');

      const factory = new ParseInfoFactory();
      const parseInfo: types.IParseInfo = factory.get(source);
      expect(parseInfo.elements.size).to.equal(3);
      expect(parseInfo.common).not.to.be.undefined();
      expect(parseInfo.def).to.be.undefined();
    });
  });
});
