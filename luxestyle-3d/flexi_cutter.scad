// flexi_cutter.scad — EIGENER Flexi-Gelenk-Cutter (LuxeStyle, dein IP)
// ---------------------------------------------------------------------------
// Negativ-Werkzeug: legt eine Reihe Kugel-Pfannen-Gelenke als "Negativ-Teil"
// über den Schwanz/Körper eines beliebigen soliden Modells (z. B. Meshy-Tier).
// In Bambu Studio abgezogen entstehen Print-in-Place-Flexi-Gelenke -- die
// AUSSENFORM des Modells bleibt erhalten (grosse Body-Scheiben schneiden nichts,
// nur die Spalt-Ringe + Pfannen werden ausgehöhlt).
//
//   mode = "cutter"  -> nur das Negativ-Werkzeug (das exportierst & nutzt du)
//   mode = "demo"    -> Beispiel: ein konischer Schwanz, schon geschnitten
//
// SO BENUTZT DU ES (Bambu Studio):
//   1) flexi_cutter.stl importieren, neben dein Tier legen.
//   2) Cutter so SKALIEREN, dass er etwas DICKER als der Schwanz ist
//      (Schwanz muss komplett in den Cutter-Querschnitt passen) und entlang
//      des Schwanzes ausrichten.
//   3) Cutter als Teil dem Tier-Objekt zuordnen -> Typ "Negativ-Teil".
//   4) Slice/Vorschau -> Schwanz ist jetzt gegliedert & beweglich.
//
// Bauen:
//   openscad -o flexi_cutter.stl -D 'mode="cutter"' flexi_cutter.scad
//   openscad -o flexi_demo.stl   -D 'mode="demo"'   flexi_cutter.scad
//
// DRUCK: 0.2 mm, keine Stützen. ERST mit n_joint=2 an einem Test-Schwanz prüfen.
// ---------------------------------------------------------------------------

mode    = "cutter";  // cutter | demo
n_joint = 6;         // Anzahl Gelenke (Segmente = n_joint+1)
seglen  = 8;         // Länge eines Segments (mm) -> Gelenk-Abstand
gap     = 0.8;       // Spalt zwischen Segmenten
ball_r  = 3.0;       // Gelenk-Kugel-Radius
neck_r  = 1.7;       // Hals-Radius
clear   = 0.4;       // Spalt Kugel <-> Pfanne (FDM 0.35–0.45)
edep    = 1.9;       // Pfannen-Tiefe (fängt die Kugel: Öffnung < Kugel)
BIG     = 50;        // "unendliche" Body-Scheibe (>= dickster Schwanz)
$fn     = 56;

pitch = seglen + gap;
striplen = n_joint*pitch + seglen;
midy = (n_joint*pitch)/2;

module discY(yc, r, h) translate([0,yc,0]) rotate([90,0,0]) cylinder(h=h, r=r, center=true);

// Ein Segment-Solid: grosse Body-Scheibe (+ Kugel/Hals vorne) − Pfanne hinten
module seg_solid(i) {
  yc = i*pitch;
  difference() {
    union() {
      discY(yc, BIG, seglen);                      // volle Body-Scheibe (erhält Form)
      if (i < n_joint) {                           // Kugel + Hals nach +Y
        bc = yc + seglen/2 + gap + edep;
        translate([0,bc,0]) sphere(ball_r);
        hull() { translate([0,yc+seglen/2-0.4,0]) sphere(neck_r); translate([0,bc,0]) sphere(neck_r); }
      }
    }
    if (i > 0) {                                   // Pfanne (für Kugel des Vorgängers) + Kanal
      sc = yc - seglen/2 + edep;
      translate([0,sc,0]) sphere(ball_r + clear);
      hull() {
        translate([0,sc,0])               sphere(neck_r + clear + 0.4);
        translate([0,sc - seglen*1.3,0])  sphere(neck_r + clear + 1.6);
      }
    }
  }
}

// Cutter = umschliessender Block − alle Segment-Solids (= das zu entfernende Material)
module flexi_cutter() {
  difference() {
    discY(midy, BIG, striplen + 2);
    union() { for (i=[0:n_joint]) seg_solid(i); }
  }
}

// Demo: konischer "Schwanz" minus Cutter -> sichtbares Flexi-Ergebnis
module demo() {
  difference() {
    // Schwanz: Kegel entlang Y (dick vorne, dünn hinten)
    translate([0,-seglen*0.6,0]) rotate([-90,0,0]) cylinder(h=striplen+1, r1=11, r2=4.5);
    flexi_cutter();
  }
}

if (mode == "demo") demo(); else flexi_cutter();
