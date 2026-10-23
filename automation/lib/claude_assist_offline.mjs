// Preload for the fixed, trusted offline suites. Defence in depth, not an OS sandbox.
import net from 'node:net';
import tls from 'node:tls';
import http from 'node:http';
import https from 'node:https';
import dgram from 'node:dgram';
import dns from 'node:dns';
import child from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
const blocked = () => { throw Error('LUXESTYLE_OFFLINE_CHECK: network/child process blocked'); };
globalThis.fetch = blocked;
for (const [object, methods] of [[net, ['connect','createConnection']], [tls, ['connect']], [http, ['request','get']], [https, ['request','get']], [dgram, ['createSocket']], [dns, ['lookup','resolve','resolve4','resolve6']], [dns.promises, ['lookup','resolve','resolve4','resolve6']], [child, ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork']]]) for (const name of methods) object[name] = blocked;
net.Socket.prototype.connect = blocked;
syncBuiltinESMExports();
