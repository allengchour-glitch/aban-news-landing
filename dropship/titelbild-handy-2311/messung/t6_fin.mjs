// T6: Videofehler vor Modulstart -> bleibt die Schaltflaeche «Video abspielen» verborgen? (neu vs. fix2 mit error-Handler im Inline-Skript)
import { browserStart, oeffne, zustand } from './lib.mjs';
const b = await browserStart();
for (const v of ['vor', 'fin']) for (const opts of [{ blockMp4: true }, {}]) {
  const { ctx, p, mp4 } = await oeffne(b, 'handy', v, opts);
  await p.waitForTimeout(6000);
  const z = await zustand(p);
  console.log(v, opts.blockMp4 ? '404' : 'ok', JSON.stringify({ controlsHidden: z.controlsHidden, hasFrame: z.hasFrame, src: z.video.src, error: z.video.error, paused: z.video.paused, mp4 }));
  await ctx.close();
}
await b.close();
