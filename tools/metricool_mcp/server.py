#!/usr/bin/env python3
"""Lokale, lesende Metricool-MCP-Brücke für das LuxeStyle-Projekt."""
from datetime import date, timedelta
import os

import httpx
from mcp.server.fastmcp import FastMCP

API = 'https://app.metricool.com/api'
mcp = FastMCP('metricool-local-readonly')


def credentials():
    token = os.environ.get('METRICOOL_USER_TOKEN', '').strip()
    if not token:
        raise RuntimeError(
            'METRICOOL_USER_TOKEN ist für diesen MCP-Prozess nicht verfügbar. '
            'Die vorhandene Secret-Verknüpfung in die laufende Umgebung übernehmen; '
            'den Token nicht im Chat oder in Konfigurationsdateien eintragen.')
    user = os.environ.get('METRICOOL_USER_ID') or '4801419'
    return token, user


async def read_api(path: str, params: dict):
    token, user = credentials()
    query = {'userId': user, 'integrationSource': 'MCP', **params}
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=False) as client:
            response = await client.get(API + path, params=query,
                                        headers={'X-Mc-Auth': token, 'Accept': 'application/json'})
    except httpx.HTTPError:
        raise RuntimeError('Metricool ist über den konfigurierten Netzwerkweg nicht erreichbar.') from None
    if response.status_code == 429:
        raise RuntimeError('Metricool hat die Anfrage gedrosselt. Kein automatischer Wiederholungsversuch.')
    if response.status_code != 200:
        raise RuntimeError(f'Metricool-Leseanfrage nicht erfolgreich: HTTP {response.status_code}.')
    try:
        return response.json()
    except ValueError:
        raise RuntimeError('Metricool lieferte keine gültige JSON-Antwort.') from None


@mcp.tool()
def connection_status() -> dict:
    """Token-Präsenz prüfen, ohne Geheimnisse auszugeben oder Anmeldung zu behaupten."""
    present = bool(os.environ.get('METRICOOL_USER_TOKEN', '').strip())
    return {'transport': 'stdio', 'access': 'read_only', 'token_available_in_process': present,
            'authentication': 'not_tested' if present else 'credential_not_available',
            'network': 'not_tested'}


@mcp.tool()
async def get_brands() -> dict | list:
    """Verbundene Metricool-Marken lesend abrufen; LuxeStyle vor weiteren Abfragen bestätigen."""
    return await read_api('/v2/settings/brands', {})


@mcp.tool()
async def get_scheduled_posts(start_date: str, end_date: str) -> dict:
    """LuxeStyle-Planer lesen, höchstens zwei Kalendertage, ISO-Daten YYYY-MM-DD."""
    try:
        start, end = date.fromisoformat(start_date), date.fromisoformat(end_date)
    except ValueError:
        raise ValueError('Datum muss YYYY-MM-DD entsprechen.') from None
    if end < start or end - start > timedelta(days=1):
        raise ValueError('Pro Aufruf höchstens zwei aufeinanderfolgende Kalendertage lesen.')
    blog = os.environ.get('METRICOOL_BLOG_ID') or '6227837'
    return await read_api('/v2/scheduler/posts', {
        'blogId': blog, 'start': start.isoformat() + 'T00:00:00',
        'end': end.isoformat() + 'T23:59:59', 'timezone': 'Europe/Zurich'})


if __name__ == '__main__':
    mcp.run(transport='stdio')
