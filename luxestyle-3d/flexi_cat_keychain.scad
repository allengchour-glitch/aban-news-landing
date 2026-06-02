// flexi_cat_keychain.scad — Süßer Flexi-Katzen-Schlüsselanhänger (LuxeStyle, dein IP)
// ---------------------------------------------------------------------------
// EIN druckfertiges Stück, beweglich (Print-in-Place): pummelige Laib-Katze
// (Loaf) mit grossem Kopf, runden Augen, Näschen, Öhrchen + Öse am Schwanz.
// KEIN Teller/Boden. Körper segmentiert -> flext. Laib-Form ist Absicht: nur so
// fallen keine Gliedmassen ab (volle Figuren wie der sitzende Kater gehen NICHT).
//
//   part = all | body | white | black   (für Mehrfarb-Export via assemble.py)
//
// Bauen: openscad -o flexi_cat_keychain.stl flexi_cat_keychain.scad
// Druck: 0.2 mm, KEINE Stützen, auf die Seite legen.
// ---------------------------------------------------------------------------

part   = "all";
n_joint= 3;        // weniger Gelenke -> kürzer/pummeliger
seglen = 7;
gap    = 0.9;
ball_r = 3.0;
neck_r = 1.7;
clear  = 0.4;
edep   = 1.85;
BIG    = 40;
$fn    = 56;

ycut0  = 5;                       // Schnitt beginnt hinter dem (grossen) Kopf
pitch  = seglen + gap;
ytail  = ycut0 + seglen + n_joint*pitch;   // Schwanzende

module C_body()  if (part=="all"||part=="body")  children();
module C_white() if (part=="all"||part=="white") children();
module C_black() if (part=="all"||part=="black") children();

// ---- pummeliger Laib-Körper (liegend +Y, grosser Kopf bei -Y) ----
module cat_solid() {
  scale([1,1,0.92]) hull() {          // dicker, kürzerer Laib
    translate([0, 0,0]) sphere(9);
    translate([0, 9,0]) sphere(8.4);
    translate([0,18,0]) sphere(6.6);
    translate([0,26,0]) sphere(4.6);
    translate([0,ytail-2,0]) sphere(3.2);
  }
  // GROSSER runder Kopf
  translate([0,-9,2]) sphere(10);
  // Öhrchen (klein, rund-spitz)
  for (sx=[-1,1]) translate([sx*6,-11,9]) rotate([-16,0,sx*9]) cylinder(h=6.5,r1=3.6,r2=0.8);
  // winzige Vorderpfötchen (angedeutet, NICHT abstehend)
  for (sx=[-1,1]) translate([sx*6.5,-3,-5]) scale([1,1.3,0.7]) sphere(2.6);
  // Öse am SCHWANZENDE
  translate([0,ytail+2,1]) rotate([90,0,0]) difference(){ cylinder(h=3,r=4.2,center=true); cylinder(h=4,r=2.2,center=true); }
}

// ---- Flexi-Cutter (Negativ) entlang +Y ----
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

// ---- grosse Kulleraugen + Nase (3-farbig fähig) ----
module head_eyes() {
  for (sx=[-1,1]) {
    C_white() translate([sx*4,-15,3]) sphere(3.0);
    C_black() translate([sx*4,-16.6,3]) sphere(1.5);
  }
  C_black() translate([0,-17.4,0.2]) sphere(1.3);     // Näschen
}

C_body() difference() { cat_solid(); cutter(); }       // Körper geschnitten = flexi
head_eyes();
