// flexi_cat_keychain.scad — Flexi Cat-Loaf Schlüsselanhänger (LuxeStyle, dein IP)
// ---------------------------------------------------------------------------
// EIN Druckstück, beweglich (Print-in-Place). KURZE, rundliche "Cat-Loaf"
// (Katzen-Laib) — KEINE Schlange: grosser Kopf + Öhrchen, kompakter runder
// Körper, runder Hintern mit kleinem Schwänzchen, angedeutete Pfötchen, Öse.
// KEIN Teller/Boden. Volle Figuren (sitzend) gehen nicht flexi (Beine fallen ab)
// -> Loaf-Form ist Absicht; nur die muss kurz/rund sein, sonst wirkt's wie Schlange.
//
//   look = "mimi"  (runde Augen, rosa Ohren)  |  "pancake" (X-Augen, Zunge)
//   part = all | body | white | black | rosa | orange
//
// Bauen: openscad -o flexi_cat.stl -D 'look="mimi"' flexi_cat_keychain.scad
// Druck: 0.2 mm, KEINE Stützen, auf die Seite legen.
// ---------------------------------------------------------------------------

look   = "mimi";   // mimi | pancake
part   = "all";
n_joint= 2;        // nur 2 Gelenke -> kurz & kompakt
seglen = 8;
gap    = 0.9;
ball_r = 3.2;
neck_r = 1.8;
clear  = 0.4;
edep   = 1.9;
BIG    = 42;
$fn    = 56;

ycut0  = 6;                                  // Schnitt erst deutlich hinter dem Kopf
pitch  = seglen + gap;
yrump  = ycut0 + seglen + n_joint*pitch;     // hinterer (runder) Po

module C_body()   if (part=="all"||part=="body")   children();
module C_white()  if (part=="all"||part=="white")  children();
module C_black()  if (part=="all"||part=="black")  children();
module C_rosa()   if (part=="all"||part=="rosa")   color([0.95,0.6,0.66]) children();
module C_orange() if (part=="all"||part=="orange") color([0.9,0.45,0.1]) children();

// ---- kompakte Cat-Loaf (kurz, rund, runder Hintern) ----
module cat_solid() {
  scale([1.05,1,0.92]) hull() {              // chunky, kaum verjüngt
    translate([0,-1,0]) sphere(9.5);
    translate([0, 7,0]) sphere(9.2);
    translate([0,14,0]) sphere(8.8);
    translate([0,yrump,0]) sphere(7.8);       // runder Po (NICHT spitz)
  }
  // grosser runder Kopf
  translate([0,-11,2]) sphere(10.5);
  // Öhrchen
  for (sx=[-1,1]) C_body() translate([sx*6,-13,9.5]) rotate([-16,0,sx*9]) cylinder(h=6,r1=3.8,r2=0.9);
  // Vorderpfötchen (am Kopf-Block, angedeutet)
  for (sx=[-1,1]) translate([sx*7,-5,-6]) scale([1.1,1.5,0.7]) sphere(3);
  // kleines Schwänzchen am Po (kurz, gekringelt zur Seite, solide mit dem Po)
  translate([0,yrump,0]) hull(){ translate([6,2,2]) sphere(2.6); translate([10,-2,6]) sphere(2.0); }
  // Öse am Po oben
  translate([0,yrump+3,4]) rotate([90,0,0]) difference(){ cylinder(h=3,r=4.2,center=true); cylinder(h=4,r=2.2,center=true); }
}

// ---- Flexi-Cutter (Negativ) ----
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

// ---- Gesicht: zwei Looks ----
module face() {
  if (look=="pancake") {
    // schwarze X-Augen + orange Zunge
    for (sx=[-1,1]) C_black() translate([sx*4,-17.5,3.5]) rotate([0,0,45]) {
      cube([5,1.2,1.4],center=true); cube([1.2,5,1.4],center=true); }
    C_orange() translate([0,-18.5,-2]) scale([1,1.4,0.6]) sphere(1.8);   // Zunge
    C_black() translate([0,-19,0.5]) sphere(1.1);                        // Nase
  } else {
    // Mimi: grosse runde Augen (weiss+schwarz) + rosa Innenohr + orange Nase
    for (sx=[-1,1]) { C_white() translate([sx*4.2,-17,3.5]) sphere(3.1);
                      C_black() translate([sx*4.2,-18.7,3.5]) sphere(1.6); }
    C_orange() translate([0,-19.3,0.3]) sphere(1.3);                     // Näschen
    for (sx=[-1,1]) C_rosa() translate([sx*6,-13.4,9.3]) rotate([-16,0,sx*9]) cylinder(h=5,r1=2.3,r2=0.6); // Innenohr
  }
}

C_body() difference() { cat_solid(); cutter(); }
face();
