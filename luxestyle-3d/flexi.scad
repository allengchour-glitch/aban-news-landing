// flexi.scad — Print-in-Place Flexi-Tier (LuxeStyle)
// ---------------------------------------------------------------------------
// Druckt in EINEM Stück, beweglich OHNE Montage. Kugel-Pfannen-Gelenke mit
// definiertem Spalt (clear). Wackelnder Schlüsselanhänger.
//
//   kind = "cat" | "snake" | "caterpillar"
//
// Bauen (headless):
//   openscad -o flexi_cat.stl   -D 'kind="cat"'            flexi.scad
//   openscad -o flexi_snake.stl -D 'kind="snake"' -D 'n=14' flexi.scad
//
// DRUCK (Bambu X1C, PLA): 0.2 mm Schicht, KEINE Stützen, flach hinlegen
//   (Kette entlang der Bett-Achse). Gelenke mit hohem Infill/Wänden.
//   ERST einen 4-Segment-Test (n=3) drucken und das Spiel prüfen, DANN Serie.
// Spalt clear (FDM): 0.30–0.40. Zu klein = fusioniert (starr), zu gross = fällt aus.
//
// Ehrlich: Segmente sind bewusst ~gleich gross. Ein dünn auslaufender Schwanz
// geht NICHT, weil jedes Segment die Gelenkpfanne umschliessen muss (Material).
// ---------------------------------------------------------------------------

kind  = "cat";     // cat | snake | caterpillar
n     = 8;         // Anzahl Körper-Segmente (Kopf kommt dazu)
seg_r = 7;         // Segment-Radius (mm)
ball_r= 3.4;       // Gelenk-Kugel-Radius
neck_r= 2.0;       // Hals-Radius (Steg Segment -> Kugel)
clear = 0.35;      // Spalt Kugel <-> Pfanne
loop  = true;      // Schlüsselring-Öse am Kopf
$fn   = 48;        // 48 = guter Kompromiss; für Glanzstück 72 (langsamer)

// --- Gelenk-Geometrie (für ALLE Segmente identisch, sonst passt die Kette nicht) ---
yr     = seg_r*1.06;             // Y-Radius des (leicht eiförmigen) Körpers
d_sock = 2.0;                    // Pfannen-Mitte tief im Körper (umschlossen)
gap    = 0.7;                    // Luft zwischen zwei Körpern (kein Fusionieren)
pitch  = 2*yr + gap;             // Segment-Abstand
d_ball = pitch - d_sock;         // Kugel sitzt in der Pfanne des nächsten Segments

module body(r) scale([1, 1.06, 0.92]) sphere(r);

// Hals + Kugel nach +Y
module ball_arm() {
  hull() {
    translate([0, yr-1.0, 0]) sphere(neck_r);
    translate([0, d_ball, 0]) sphere(neck_r);
  }
  translate([0, d_ball, 0]) sphere(ball_r);
}

// Pfanne (Hohlraum für Kugel des Vorgängers) + nach -Y öffnender Kegel-Kanal
module socket_cut() {
  translate([0, -d_sock, 0]) sphere(ball_r + clear);
  hull() {
    translate([0, -d_sock, 0])               sphere(neck_r + clear + 0.5);
    translate([0, -d_sock - seg_r*1.6, 0])   sphere(neck_r + clear + 1.9);
  }
}

module segment(r, with_ball=true, with_socket=true) {
  difference() {
    union() { body(r); if (with_ball) ball_arm(); }
    if (with_socket) socket_cut();
  }
}

// --- Katzen-Kopf: gleiche Gelenk-Basis wie ein Segment (Kugel +Y), plus Gesicht ---
module cat_head() {
  difference() {
    union() {
      body(seg_r);
      ball_arm();                              // dockt an Körper an (+Y)
      // Ohren oben
      for (s=[-1,1])
        translate([s*seg_r*0.55, -seg_r*0.15, seg_r*0.78]) rotate([12,0,0])
          cylinder(h=seg_r*0.85, r1=seg_r*0.42, r2=0.6);
      // Schlüsselring-Öse oben
      if (loop)
        translate([0, -seg_r*0.1, seg_r*1.25]) rotate([90,0,0])
          difference(){ cylinder(h=2.6, r=4.2, center=true); cylinder(h=3, r=2.2, center=true); }
    }
    // runde Augen-Mulden (FESTE REGEL: runde Augen, kein X) auf der -Y-Front
    for (s=[-1,1]) translate([s*seg_r*0.42, -yr*0.92, seg_r*0.12]) sphere(seg_r*0.2);
    // Näschen
    translate([0, -yr*1.02, -seg_r*0.18]) sphere(seg_r*0.14);
  }
}

module flexi() {
  // Kopf (oder schlichtes Front-Segment) am -Y-Ende, Kugel zeigt +Y
  if (kind == "cat") cat_head();
  else segment(seg_r, with_ball=true, with_socket=false);

  // Körper-Segmente: Kugel +Y (in nächste Pfanne), Pfanne -Y (für vorige Kugel)
  for (i = [1 : n]) {
    last = (i == n);
    translate([0, i*pitch, 0])
      segment(seg_r, with_ball=!last, with_socket=true);   // letztes = runde Schwanzspitze
  }
}

flexi();
