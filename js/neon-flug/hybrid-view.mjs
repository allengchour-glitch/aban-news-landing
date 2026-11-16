import { FastFlightView } from "./fast-view.mjs";
import { FlightView as WebGLFlightView } from "./view.mjs";
export class FlightView {
  constructor(container) {
    this.container = container;
    this.fast = new FastFlightView(container);
    this.high = null;
    this.active = this.fast;
    this.reduced = false;
    this.warning = "";
  }
  get renderer() {
    return this.active.renderer;
  }
  get backend() {
    return this.active === this.fast ? this.fast.backend : null;
  }
  quality(mode) {
    this.warning = "";
    if (mode === "high") {
      try {
        if (!this.high) this.high = new WebGLFlightView(this.container);
        this.active = this.high;
        this.high.quality("high");
      } catch {
        this.active = this.fast;
        this.fast.quality("auto");
        this.warning =
          "3D ist hier nicht verfügbar. Der Schnellmodus bleibt aktiv.";
      }
    } else {
      this.active = this.fast;
      this.fast.quality(mode);
    }
    this.fast.canvas.hidden = this.active !== this.fast;
    if (this.high)
      this.high.renderer.domElement.hidden = this.active !== this.high;
  }
  update(...args) {
    this.active.reduced = this.reduced;
    this.active.update(...args);
  }
  burst(...args) {
    this.active.burst(...args);
  }
}
