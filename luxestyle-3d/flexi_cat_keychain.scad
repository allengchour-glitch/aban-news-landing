// flexi_cat_keychain.scad — Flexi Cat-Loaf Schluesselanhaenger (LuxeStyle, dein IP)
// ---------------------------------------------------------------------------
// EIN Druckstueck, beweglich (Print-in-Place). Kurze, rundliche "Loaf"-Form:
// grosser Kopf + Gesicht, kompakter beweglicher Koerper, runder Hintern mit
// Schwaenzchen, Oese. KEIN Teller/Boden. Auf die Seite legen, KEINE Stuetzen.
//
//   look = mimi | pancake | dog | bear | seal     (Kopf/Ohren/Gesicht)
//   part = all | body | white | black | rosa | orange       (Farb-Regionen)
//   txt  = ""  -> optionaler Name, in die Seite graviert (personalisiert)
//   part = caltest -> Toleranz-Kalibrierstreifen (4 Flexi-Rods, clear 0.30..0.45)
//
// Bauen (einfarbig):  openscad -o flexi.stl -D 'look="mimi"' flexi_cat_keychain.scad
// Mit Name:           openscad -o flexi.stl -D 'look="dog"' -D 'txt="Rex"' flexi_cat_keychain.scad
// Kalibrierstreifen:  openscad -o caltest.stl -D 'part="caltest"' flexi_cat_keychain.scad
// Mehrfarbige 3MF:    python3 flexi_build.py mimi Mia   (nutzt part=... + assemble.py)
// Druck: 0.2 mm, KEINE Stuetzen, auf die Seite legen.
// ---------------------------------------------------------------------------

look    = "mimi";   // mimi | pancake | dog | bear | seal
part    = "all";
txt     = "";       // optionaler Name (graviert in die +X-Seite)
txt_size= 4.2;
txt_deep= 0.7;      // Gravurtiefe mm

n_joint = 2;        // nur 2 Gelenke -> kurz & kompakt
seglen  = 8;
gap     = 0.9;
ball_r  = 3.2;
neck_r  = 1.8;
clear   = 0.4;      // Gelenk-Spalt (Default; per X1C-Kalibrierung feinjustieren)
edep    = 1.9;
BIG     = 42;
$fn     = 56;

ycut0   = 6;                                 // Schnitt erst hinter dem Kopf
pitch   = seglen + gap;
yrump   = ycut0 + seglen + n_joint*pitch;    // hinterer (runder) Po

module C_body()   if (part=="all"||part=="body")   children();
module C_white()  if (part=="all"||part=="white")  children();
module C_black()  if (part=="all"||part=="black")  children();
module C_rosa()   if (part=="all"||part=="rosa")   color([0.95,0.6,0.66]) children();
module C_orange() if (part=="all"||part=="orange") color([0.9,0.45,0.1]) children();

// ---- Ohren je Tierart (Koerperfarbe) ----
module ears() {
  if (look=="dog") {
    for (sx=[-1,1]) translate([sx*8,-12,3]) rotate([6,sx*34,0])
      scale([0.5,1.0,1.5]) sphere(3.6);                       // Schlappohren seitlich
  } else if (look=="bear") {
    for (sx=[-1,1]) translate([sx*6.2,-13,10]) sphere(3.4);   // kleine runde Ohren oben
  } else if (look=="seal") {
    // Robbe: keine Ohren
  } else {
    for (sx=[-1,1]) translate([sx*6,-13,9.5]) rotate([-16,0,sx*9])
      cylinder(h=6,r1=3.8,r2=0.9);                            // spitze Katzenohren
  }
}

// ---- kompakte Loaf (kurz, rund, runder Hintern) ----
module cat_solid() {
  scale([1.05,1,0.92]) hull() {
    translate([0,-1,0]) sphere(9.5);
    translate([0, 7,0]) sphere(9.2);
    translate([0,14,0]) sphere(8.8);
    translate([0,yrump,0]) sphere(7.8);
  }
  translate([0,-11,2]) sphere(10.5);                          // grosser runder Kopf
  ears();
  for (sx=[-1,1]) translate([sx*7,-5,-6]) scale([1.1,1.5,0.7]) sphere(3); // Pfoetchen
  // Schwaenzchen am Po
  translate([0,yrump,0]) hull(){ translate([6,2,2]) sphere(2.6); translate([10,-2,6]) sphere(2.0); }
  // Oese am Po oben
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

// ---- Namens-Gravur in die +X-Seite des Koerpers ----
module name_cut() {
  if (txt != "")
    translate([9.6, 7, 0]) rotate([90,0,90])
      linear_extrude(height=2*txt_deep, center=true)
        text(txt, size=txt_size, halign="center", valign="center",
             font="Liberation Sans:style=Bold");
}

// ---- Gesicht je Tierart ----
module face() {
  if (look=="pancake") {
    for (sx=[-1,1]) C_black() translate([sx*4,-17.5,3.5]) rotate([0,0,45]) {
      cube([5,1.2,1.4],center=true); cube([1.2,5,1.4],center=true); }   // X-Augen
    C_orange() translate([0,-18.5,-2]) scale([1,1.4,0.6]) sphere(1.8);   // Zunge
    C_black()  translate([0,-19,0.5]) sphere(1.1);                       // Nase
  } else if (look=="dog") {
    for (sx=[-1,1]) C_black() translate([sx*4,-18,4]) sphere(1.7);       // runde Augen
    C_black()  translate([0,-20,1.2]) scale([1.3,1,0.9]) sphere(2.2);    // grosse Schnauze/Nase
    C_orange() translate([0,-19.5,-2.2]) scale([1,1.4,0.5]) sphere(1.6); // Zunge
  } else if (look=="bear") {
    for (sx=[-1,1]) C_black() translate([sx*3.8,-18,4.5]) sphere(1.6);   // Knopfaugen
    C_body()   translate([0,-20.2,-0.5]) scale([1.2,1,1]) sphere(3.2);   // helle Schnauze
    C_black()  translate([0,-21.8,0.6]) sphere(1.4);                     // Nase
  } else if (look=="seal") {
    for (sx=[-1,1]) C_black() translate([sx*4.2,-18,4.5]) sphere(2.4);   // grosse Kulleraugen
    C_black()  translate([0,-20.4,1]) scale([1.3,1,0.8]) sphere(1.5);    // Nase
    for (sx=[-1,1]) for (k=[0:2]) C_black()                              // Schnurrhaar-Punkte
      translate([sx*(2.5+k*1.6),-19.6,-1.2]) sphere(0.45);
  } else {
    for (sx=[-1,1]) { C_white() translate([sx*4.2,-17,3.5]) sphere(3.1);
                      C_black() translate([sx*4.2,-18.7,3.5]) sphere(1.6); }  // runde Augen
    C_orange() translate([0,-19.3,0.3]) sphere(1.3);                          // Naeschen
    for (sx=[-1,1]) C_rosa() translate([sx*6,-13.4,9.3]) rotate([-16,0,sx*9]) cylinder(h=5,r1=2.3,r2=0.6); // Innenohr
  }
}

// ===========================================================================
// Toleranz-Kalibrierstreifen: 4 kurze Flexi-Rods bei clear 0.30/0.35/0.40/0.45.
// Einmal drucken -> der lockerste, der NICHT auseinanderfaellt, ist deine Toleranz.
// ===========================================================================
module flexi_rod(cl, rod=6, seg=7, g=0.9, br=3.0, nr=1.7, ed=1.8, nj=2) {
  p = seg + g;
  module segS(i) {
    yc = seg/2 + i*p;
    difference() {
      union() {
        translate([0,yc,0]) rotate([90,0,0]) cylinder(h=seg, r=rod, center=true);
        if (i<nj) { bc=yc+seg/2+g+ed;
          translate([0,bc,0]) sphere(br);
          hull(){ translate([0,yc+seg/2-0.4,0]) sphere(nr); translate([0,bc,0]) sphere(nr);} }
      }
      if (i>0) { sc=yc-seg/2+ed;
        translate([0,sc,0]) sphere(br+cl);
        hull(){ translate([0,sc,0]) sphere(nr+cl+0.4); translate([0,sc-seg*1.3,0]) sphere(nr+cl+1.6);} }
    }
  }
  difference() {
    translate([0,(seg+nj*p)/2,0]) rotate([90,0,0]) cylinder(h=seg+nj*p, r=rod, center=true);
    union(){ for(i=[0:nj]) segS(i); }
  }
}
module caltest() {
  cls = [0.30, 0.35, 0.40, 0.45];
  for (k=[0:3]) translate([k*16, 0, 0]) {
    flexi_rod(cls[k]);
    // Zahl (30/35/40/45) flach an den Kopf des Rods graviert/erhaben
    translate([0,-3,5.6]) linear_extrude(0.8)
      text(str(round(cls[k]*100)), size=4, halign="center", font="Liberation Sans:style=Bold");
  }
}

// ===========================================================================
if (part=="caltest") {
  caltest();
} else {
  C_body() difference() { cat_solid(); cutter(); name_cut(); }
  face();
}
