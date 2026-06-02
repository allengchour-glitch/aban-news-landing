// flexi.scad — Print-in-Place Flexi-Tier v2 (LuxeStyle)
// ---------------------------------------------------------------------------
// Druckt in EINEM Stück, beweglich OHNE Montage. Verjüngter, gegliederter
// Körper (Fuchs/Katzen-Stil) statt gleicher Perlen. Kugel-Pfannen-Gelenke:
// die PFANNE sitzt im grösseren (vorderen) Segment und fängt die kleinere
// Kugel des nächsten -> der Schwanz darf schrumpfen, Gelenk bleibt stabil.
//
//   kind = "cat" | "fox" | "snake"
//
// Bauen (headless):
//   openscad -o flexi_cat.stl   -D 'kind="cat"'             flexi.scad
//   openscad -o flexi_fox.stl   -D 'kind="fox"' -D 'n=10'   flexi.scad
//   openscad -o flexi_snake.stl -D 'kind="snake"' -D 'n=14'  flexi.scad
//
// DRUCK (Bambu X1C, PLA): 0.2 mm Schicht, KEINE Stützen, flach hinlegen.
//   ERST n=4 testen, Gelenk-Spiel prüfen, DANN volle Länge.
// Spalt clear (FDM): 0.30–0.40. Augen ggf. in 2. Farbe (AMS) oder anmalen.
// ---------------------------------------------------------------------------

kind   = "cat";    // cat | fox | snake
n      = 9;        // Körper-Segmente nach dem Kopf
seg_r  = 8;        // Kopf-/Front-Radius (mm)
taper  = 0.90;     // Verjüngung pro Segment
s_min  = 3.6;      // kleinster Segment-Radius (Gelenk braucht Material)
ball_k = 0.34;     // Kugel-Radius als Anteil der Segment-Grösse
neck_k = 0.17;     // Hals-Radius als Anteil
clear  = 0.35;     // Spalt Kugel <-> Pfanne
gapy   = 0.6;      // Luft zwischen zwei Körpern
edep   = 1.8;      // Pfannen-Tiefe unter der Oberfläche (fängt die Kugel)
ys     = 1.06;     // Körper-Streckung in Y (leicht eiförmig)
loop   = true;     // Schlüsselring-Öse am Kopf
$fn    = 48;       // 48 = ~2 Min; 72 = Glanzstück (langsamer)

function yr(s) = s*ys;

module bodyshape(s) scale([1, ys, 0.92]) sphere(s);

// Kopf-Merkmale (Ohren, Kulleraugen, Nase, Öse) — Front zeigt -Y
module head_extra(s) {
  big = (kind=="fox");
  // Ohren: spitz, nach oben, leicht nach vorn
  eh = s*(big?1.35:1.05); eb = s*(big?0.5:0.42);
  for (sx=[-1,1])
    translate([sx*s*0.55, -s*0.15, s*0.7]) rotate([15,0,sx*8])
      cylinder(h=eh, r1=eb, r2=0.6);
  // Schlüsselring-Öse oben hinten
  if (loop)
    translate([0, s*0.35, s*1.15]) rotate([90,0,0])
      difference(){ cylinder(h=2.8, r=4.4, center=true); cylinder(h=3.4, r=2.3, center=true); }
}
module head_eyes(s) {                  // grosse konvexe Augen (union)
  er = s*(kind=="fox"?0.34:0.3);
  for (sx=[-1,1]) translate([sx*s*0.42, -yr(s)*0.82, s*0.16]) sphere(er);
}
module head_cuts(s) {                  // Augen-Mulde-Rand + Nase + Pupillen-Punkt
  // Nase
  translate([0, -yr(s)*1.02, -s*0.18]) sphere(s*0.16);
  // Innenohr-Vertiefung
  big = (kind=="fox"); eh = s*(big?1.35:1.05); eb = s*(big?0.5:0.42);
  for (sx=[-1,1])
    translate([sx*s*0.55, -s*0.22, s*0.95]) rotate([15,0,sx*8])
      cylinder(h=eh*0.8, r1=eb*0.55, r2=0.4);
}

// Ein Segment i an lokalem Ursprung. s = eigene Grösse, s_next = nächste (0 = Ende)
module segment(i, s, s_next) {
  rb_here = ball_k*s;            // eigene vordere Kugel (i>0): zeigt -Y in die vorige Pfanne
  nk_here = neck_k*s;
  rb_next = ball_k*s_next;       // Kugel, die DIESE hintere Pfanne fängt
  nk_next = neck_k*s_next;
  difference() {
    union() {
      bodyshape(s);
      if (i>0) {                 // vordere Kugel + Hals nach -Y
        bc = yr(s)+gapy+edep;
        translate([0,-bc,0]) sphere(rb_here);
        hull() {
          translate([0,-(yr(s)-0.6),0]) sphere(nk_here);
          translate([0,-bc,0])          sphere(nk_here);
        }
      }
      if (i==0 && kind!="snake") head_extra(s);
      if (i==0) head_eyes(s);
    }
    if (s_next>0) {              // hintere Pfanne nach +Y (fängt nächste Kugel)
      sc = yr(s)-edep;
      translate([0,sc,0]) sphere(rb_next+clear);
      hull() {                  // Kanal öffnet nach +Y -> Hals des Nächsten + Beweglichkeit
        translate([0,sc,0])               sphere(nk_next+clear+0.4);
        translate([0,sc+yr(s)*1.3,0])     sphere(nk_next+clear+1.4);
      }
    }
    if (i==0) head_cuts(s);
  }
}

// Kette rekursiv: Segmente so platzieren, dass Oberflächen gapy auseinander sind
module chain(i, y, s) {
  s_next = (i<n) ? max(s*taper, s_min) : 0;
  translate([0,y,0]) segment(i, s, s_next);
  if (i<n) chain(i+1, y + yr(s) + yr(s_next) + gapy, s_next);
}

chain(0, 0, seg_r);
