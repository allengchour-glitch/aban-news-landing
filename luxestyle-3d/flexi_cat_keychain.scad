// flexi_cat_keychain.scad — Süßer Flexi-Katzen-Schlüsselanhänger (LuxeStyle, dein IP)
// ---------------------------------------------------------------------------
// EIN druckfertiges Stück: niedlicher Katzen-Kopf (Ohren, runde Augen, Näschen)
// + liegender Körper, der mit eingebauten Kugel-Pfannen-Gelenken FLEXT, + Öse.
// KEIN Teller/Boden. Print-in-Place, beweglich ohne Montage.
//
//   part = all | body | white | black   (für Mehrfarb-Export via assemble.py)
//
// Bauen:  openscad -o flexi_cat_keychain.stl flexi_cat_keychain.scad
// Druck:  0.2 mm, KEINE Stützen, flach (auf die Seite) legen.
// ---------------------------------------------------------------------------

part   = "all";
n_joint= 4;       // Gelenke im Körper/Schwanz
seglen = 8;       // Segmentlänge
gap    = 0.9;     // Spalt zwischen Segmenten
ball_r = 2.8;     // Gelenk-Kugel
neck_r = 1.6;
clear  = 0.4;     // Spalt Kugel<->Pfanne
edep   = 1.8;     // Pfannentiefe (fängt Kugel)
BIG    = 40;
$fn    = 56;

ycut0  = 4;                       // Körper-Schnitt beginnt hinter dem Kopf
pitch  = seglen + gap;

module C_body()  if (part=="all"||part=="body")  children();
module C_white() if (part=="all"||part=="white") children();
module C_black() if (part=="all"||part=="black") children();

// ---- solider Katzenkörper (liegend entlang +Y, Kopf bei -Y) ----
module cat_solid() {
  // Körper: Hull aus Kugeln, leicht flachgedrückt
  scale([1,1,0.86]) hull() {
    translate([0, 0,0])  sphere(8);
    translate([0,12,0])  sphere(7);
    translate([0,24,0])  sphere(5.5);
    translate([0,36,0])  sphere(4);
    translate([0,45,0])  sphere(2.8);
  }
  // Kopf vorne
  translate([0,-7,1.5]) sphere(8);
  // Ohren
  for (sx=[-1,1]) translate([sx*5,-9,7]) rotate([-18,0,sx*10]) cylinder(h=7,r1=3.6,r2=0.7);
  // Vorderpfötchen
  for (sx=[-1,1]) translate([sx*6,-2,-4.5]) scale([1,1.4,0.8]) sphere(3);
  // Öse oben am Kopf
  translate([0,-9,10]) rotate([90,0,0]) difference(){ cylinder(h=3,r=4.4,center=true); cylinder(h=4,r=2.3,center=true); }
}

// ---- Flexi-Cutter (Negativ) für den Körper, Segmente entlang +Y ----
module discY(yc,r,h) translate([0,yc,0]) rotate([90,0,0]) cylinder(h=h,r=r,center=true);
module seg_solid(i) {
  yc = ycut0 + seglen/2 + i*pitch;
  difference() {
    union() {
      discY(yc, BIG, seglen);
      if (i<n_joint) { bc=yc+seglen/2+gap+edep;
        translate([0,bc,0]) sphere(ball_r);
        hull(){ translate([0,yc+seglen/2-0.4,0]) sphere(neck_r); translate([0,bc,0]) sphere(neck_r);} }
    }
    if (i>0) { sc=yc-seglen/2+edep;
      translate([0,sc,0]) sphere(ball_r+clear);
      hull(){ translate([0,sc,0]) sphere(neck_r+clear+0.4); translate([0,sc-seglen*1.3,0]) sphere(neck_r+clear+1.6);} }
  }
}
module cutter() {
  ya=ycut0; yb=ycut0+seglen+n_joint*pitch;
  difference() {
    translate([0,(ya+yb)/2,0]) rotate([90,0,0]) cylinder(h=yb-ya, r=BIG, center=true);
    union(){ for(i=[0:n_joint]) seg_solid(i); }
  }
}

// ---- zusammenbauen ----
module head_eyes() {                 // grosse weisse Augen + schwarze Pupille + Nase
  for (sx=[-1,1]) {
    C_white() translate([sx*3.2,-12.5,2.5]) sphere(2.3);
    C_black() translate([sx*3.2,-13.7,2.5]) sphere(1.2);
  }
  C_black() translate([0,-14.2,-0.3]) sphere(1.1);     // Nase
}

C_body() difference() { cat_solid(); cutter(); }       // Körper geschnitten = flexi
// Augen-Mulden in den Kopf, damit weiss/schwarz nesten
//  (für Einfarbdruck egal; für Mehrfarb sitzen die Kugeln vorn auf)
head_eyes();
