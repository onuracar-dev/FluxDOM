#!/usr/bin/env node

import { create } from './commands/create.js';
import { dev } from './commands/dev.js';
import { build } from './commands/build.js';

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'create':
    try {
      create(args.slice(1));
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
    break;
  case 'dev':
    dev(args.slice(1));
    break;
  case 'build':
    build(args.slice(1));
    break;
  default:
    console.log(`
FluxDOM CLI

Usage:
  flow create <project-name>   Create a new FluxDOM project
  flow dev                     Start the development server
  flow build                   Build for production
    `);
    break;
}
