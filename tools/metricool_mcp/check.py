#!/usr/bin/env python3
"""Echten MCP-Handshake und lesende Werkzeuge lokal prüfen; kein Konto-Write."""
import asyncio
from datetime import timedelta
import json
import os
from pathlib import Path
import sys

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


async def main():
    server = Path(__file__).with_name('server.py')
    params = StdioServerParameters(command=sys.executable, args=[str(server)], env=os.environ.copy())
    async with stdio_client(params) as (reader, writer):
        async with ClientSession(reader, writer, read_timeout_seconds=timedelta(seconds=10)) as session:
            await session.initialize()
            names = sorted(t.name for t in (await session.list_tools()).tools)
            assert names == ['connection_status', 'get_brands', 'get_scheduled_posts'], names
            status = await session.call_tool('connection_status', {})
            assert not status.isError
            present = bool(os.environ.get('METRICOOL_USER_TOKEN'))
            guard = None
            if not present:
                result = await session.call_tool('get_brands', {})
                assert result.isError
                guard = 'Fehlendes Credential als Fehler gemeldet, keine vorgetäuschte Anmeldung'
            result = await session.call_tool('get_scheduled_posts', {
                'start_date': '2026-11-15', 'end_date': '2026-11-18'})
            assert result.isError
            report = {'mcp_initialize': 'bestanden', 'tools': names,
                      'token_available_in_process': present, 'authentication': 'nicht bestätigt',
                      'missing_credential_guard': guard, 'two_day_limit': 'bestanden', 'account_writes': 0}
            server.with_name('protocol-check.json').write_text(json.dumps(report, indent=2, ensure_ascii=False)+'\n')
            print(json.dumps(report, indent=2, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    asyncio.run(main())
