
import { functify } from 'jinxed';
import { expect, assert, use } from 'chai';
import dirtyChai = require('dirty-chai');
use(dirtyChai);
import * as path from 'path';
import * as fs from 'fs';
import { Application } from '../../lib/cli/application.class';
import { CommandLine } from '../../lib/cli/command-line.class';
import { ICommandLineInputs } from '../../lib/cli/cli-types';

// describe('CommandLine', () => {
//   context('given: ', () => {
//     it.only('should: ', () => {
//       const resolvedParseInfoFile = path.resolve(__dirname, './test.parseInfo.all.json');
//       const parseInfoContent: string = fs.readFileSync(resolvedParseInfoFile, 'utf8');

//       const resolvedXmlFile = path.resolve(__dirname, './commands.content.xml');
//       const xmlContent: string = fs.readFileSync(resolvedXmlFile, 'utf8');

//       const inputs: ICommandLineInputs = {
//         xmlContent: xmlContent,
//         query: '/Application/Cli/Commands',
//         parseInfoContent: parseInfoContent,
//         out: '',
//         argv: {}
//       };
//     });
//   });
// });
