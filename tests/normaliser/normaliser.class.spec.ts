/// <reference types="../../lib/declarations" />

import { expect, assert, use } from 'chai';
import dirtyChai from 'dirty-chai';
use(dirtyChai);
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';
use(sinonChai);
import * as xp from 'xpath-ts';
import * as R from 'ramda';
const { functify } = require('jinxed');
import * as types from '../../lib/types';
import * as e from '../../lib/exceptions';
import { Normaliser } from '../../lib/normaliser/normaliser.class';
import { SpecOptionService } from '../../lib/specService/spec-option-service.class';
import { XpathConverterImpl as Impl } from '../../lib/converter/xpath-converter.impl';
const parser = new DOMParser();
// import data from './app.zenobia.njoy.config.xml';

const testParseInfo: types.IParseInfo = {
  elements: new Map<string, types.IElementInfo>([
    ['Command', {
      id: 'name',
      recurse: 'inherits'
    }],
    ['Argument', {
      id: 'ref'
    }]
  ]),
  common: {
    id: '',
    discards: ['inherits', 'abstract'],
    descendants: {
      by: 'index',
      throwIfCollision: false,
      throwIfMissing: false
    }
  },
  def: {
    id: ''
  }
};

describe('Normaliser', () => {
  context('TODO, create some meaningful tests', () => {
    it('should normalise children', () => {
      // const document: Document = parser.parseFromString(data, 'text/xml');
      // const commandNode = xp.select(
      //   '/Application/Cli/Commands/Command[@name="rename"]',
      //   document,
      //   true
      // );

      // if (commandNode && commandNode instanceof Node) {
      //   const options = new SpecOptionService();
      //   const converter = new Impl(options);
      //   const commandElement = converter.buildElement(commandNode, testParseInfo);
      //   const normaliser = new Normaliser(options);
      //   console.log(`>>> TEST result: ${functify(commandElement)}`);
      // } else {
      //   assert.fail("Couldn't get rename command");
      // }
    });
  });
});
