// flexi.scad — Print-in-Place Flexi-Tier v3 (LuxeStyle)
// ---------------------------------------------------------------------------
// Druckt in EINEM Stück, beweglich OHNE Montage. Kugel-Pfannen-Gelenke:
// die PFANNE sitzt im grösseren (vorderen) Segment und fängt die kleinere
// Kugel des nächsten -> Körper darf sich verjüngen, Gelenk bleibt stabil.
//
//   kind = "cat" | "fox" | "snake" | "bear" | "panda" | "pig"
//     cat/fox/snake = länglich, spitze Ohren (oder keine)
//     bear/panda/pig = pummelig (kurz, dick), runde Ohren, kleine Pfötchen
//
// MEHRFARBIG (Bambu/AMS): per `part` einzelne Farbteile exportieren, dann mit
//   assemble.py zu EINER 3MF. Augen sind weiss + schwarze Pupille getrennt.
//     openscad -o body.stl  -D 'kind="bear"' -D 'part="body"'  flexi.scad
//     openscad -o white.stl -D 'kind="bear"' -D 'part="white"' flexi.scad
//     openscad -o black.stl -D 'kind="bear"' -D 'part="black"' flexi.scad
//   Einfarbig/Vorschau:  -D 'part="all"'  (Default)
//
// DRUCK (Bambu X1C, PLA): 0.2 mm, KEINE Stützen, flach. ERST n=3 testen!
// ---------------------------------------------------------------------------

kind   = "bear";   // cat|fox|snake|bear|panda|pig
part   = "all";    // all | body | white | black
n      = 4;        // Körper-Segmente nach dem Kopf (pummelig: 3–4; lang: 8–12)
seg_r  = 9;        // Kopf-/Front-Radius (mm)
s_min  = 4.0;      // kleinster Segment-Radius
ball_k = 0.32;     // Kugel-Radius als Anteil der Segmentgrösse
neck_k = 0.17;     // Hals-Radius als Anteil
clear  = 0.35;     // Spalt Kugel <-> Pfanne
gapy   = 0.6;      // Luft zwischen zwei Körpern
edep   = 1.9;      // Pfannen-Tiefe (fängt die Kugel)
ys     = 1.06;     // Körper-Streckung Y
loop   = true;     // Schlüsselring-Öse
$fn    = 48;

// abgeleitete Eigenschaften je Tierart
chunky    = (kind=="bear"||kind=="panda"||kind=="pig");
ear_round = (kind=="bear"||kind=="panda");
ear_none  = (kind=="snake"||kind=="pig");
taper     = chunky ? 0.965 : 0.90;     // -D taper=... überschreibt

function yr(s) = s*ys;
module bodyshape(s) scale([1, ys, 0.92]) sphere(s);

// --- Farb-Gates ---
module C_body()  if (part=="all"||part=="body")  children();
module C_white() if (part=="all"||part=="white") children();
module C_black() if (part=="all"||part=="black") children();

// --- Augen (genestet: Körper hat Mulde, Weiss füllt sie, Pupille sitzt vorn) ---
function eye_r(s) = s*(kind=="fox"?0.34: chunky?0.3 : 0.28);
module eye_pos(s) for (sx=[-1,1]) translate([sx*s*0.44, -yr(s)*0.8, s*0.18]) children();
module pupil_pos(s) for (sx=[-1,1]) translate([sx*s*0.44, -yr(s)*0.8 - eye_r(s)*0.55, s*0.18]) children();

// --- Ohren ---
module ears(s) {
  if (ear_round) {                      // Bär/Panda: runde Ohren oben
    for (sx=[-1,1]) translate([sx*s*0.6, -s*0.1, s*0.78]) sphere(s*0.42);
  } else if (!ear_none) {               // Katze/Fuchs: spitze Ohren
    eh=s*(kind=="fox"?1.3:1.0); eb=s*(kind=="fox"?0.5:0.42);
    for (sx=[-1,1]) translate([sx*s*0.55,-s*0.15,s*0.7]) rotate([15,0,sx*8]) cylinder(h=eh,r1=eb,r2=0.6);
  }
}
// kleine Pfötchen-Nubs an einem (pummeligen) Segment
module paws(s) if (chunky) for (sx=[-1,1]) translate([sx*s*0.92,0,-s*0.45]) sphere(s*0.3);

// --- ein Segment i (lokaler Ursprung) ---
module segment(i, s, s_next) {
  rb_here=ball_k*s; nk_here=neck_k*s; rb_next=ball_k*s_next; nk_next=neck_k*s_next;
  // KÖRPER-Farbe
  C_body() difference() {
    union() {
      bodyshape(s);
      if (i>0) {                                  // vordere Kugel + Hals
        bc=yr(s)+gapy+edep;
        translate([0,-bc,0]) sphere(rb_here);
        hull(){ translate([0,-(yr(s)-0.6),0]) sphere(nk_here); translate([0,-bc,0]) sphere(nk_here); }
      }
      if (i==0) ears(s);
      paws(s);
    }
    if (s_next>0) {                               // hintere Pfanne + Kanal
      sc=yr(s)-edep;
      translate([0,sc,0]) sphere(rb_next+clear);
      hull(){ translate([0,sc,0]) sphere(nk_next+clear+0.4); translate([0,sc+yr(s)*1.3,0]) sphere(nk_next+clear+1.4); }
    }
    if (i==0) {                                   // Augen-Mulden + Nasen-Mulde aus Körper
      eye_pos(s) sphere(eye_r(s));
      translate([0,-yr(s)*1.0,-s*0.12]) sphere(s*0.17);
    }
  }
  if (i==0) {
    // WEISS: Augäpfel füllen Mulde, minus Pupillen-Mulde
    C_white() eye_pos(s) difference(){ sphere(eye_r(s)); translate([0,-eye_r(s)*0.55,0]) sphere(eye_r(s)*0.55); }
    // SCHWARZ: Pupillen + Nase
    C_black() { pupil_pos(s) sphere(eye_r(s)*0.5); translate([0,-yr(s)*1.0,-s*0.12]) sphere(s*0.17); }
  }
}

module chain(i, y, s) {
  s_next=(i<n)?max(s*taper,s_min):0;
  translate([0,y,0]) segment(i,s,s_next);
  if (i<n) chain(i+1, y+yr(s)+yr(s_next)+gapy, s_next);
}

chain(0,0,seg_r);
