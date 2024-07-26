// This file is a register for custom loader for Mocha.
// The .mocharc.json file should use this file as the loader flag.

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('ts-node/esm', pathToFileURL('./'));