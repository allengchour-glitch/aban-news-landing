/* Nur Test-HTML: Spiel-/UI-/Zeit-/Transportlogik bleibt aktiv, renderBloom pausiert. */
'use strict';
function injectNetworkRenderFixture(html){
  // Inline-Marker statt exaktem Asset-Tag: ?v= an JS/CSS-Verweisen ist unerheblich.
  const marker='window.__ns={';
  if(html.split(marker).length!==2)throw Error('Arena-Render-Fixture: Inline-Marker fehlt oder ist mehrdeutig');
  const hook=`
var arenaOriginalDraw=renderBloom;
window.__arenaNetRender={suppressed:true,draws:0,skipped:0,
  draw:function(){arenaOriginalDraw();this.draws++;},
  restore:function(){renderBloom=arenaOriginalDraw;this.suppressed=false;}};
renderBloom=function(){if(window.__arenaNetRender.suppressed)window.__arenaNetRender.skipped++;else window.__arenaNetRender.draw();};
`;
  return html.replace(marker,hook+marker);
}
module.exports={injectNetworkRenderFixture};
