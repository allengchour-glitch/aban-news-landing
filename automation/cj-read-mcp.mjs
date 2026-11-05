#!/usr/bin/env node
import { serveMcp } from './lib/claude_assist_mcp.mjs';
import { createCjReadOnlyClient } from './lib/cj_readonly.mjs';
import { CJ_MCP_TOOLS, CJ_MCP_SERVER, CJ_MCP_INSTRUCTIONS,
  validateCjMcpArguments, createCjMcpHandlers } from './lib/cj_read_mcp.mjs';

const client = createCjReadOnlyClient();
await serveMcp({ input: process.stdin, output: process.stdout, handlers: createCjMcpHandlers(client),
  tools: CJ_MCP_TOOLS, validateArguments: validateCjMcpArguments,
  serverInfo: CJ_MCP_SERVER, instructions: CJ_MCP_INSTRUCTIONS });
