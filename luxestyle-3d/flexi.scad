// flexi.scad — Print-in-Place Flexi-Tier v4 (LuxeStyle)
// ---------------------------------------------------------------------------
// Druckt in EINEM Stück, beweglich OHNE Montage. KEIN Perlen-/Schlangen-Look:
// pummeliges TIER mit Kopf, 4 Gliedmassen (Ärmchen + Beine mit Pfoten-Pads),
// flexendem Körper (Kugel-Pfannen-Gelenke) und 3-farbigen Augen.
//
//   kind = "husky" | "cat" | "bear" | "panda" | "fox"
//
// MEHRFARBIG (Bambu/AMS): Farbteile einzeln exportieren -> assemble.py -> 1 3MF.
//   part = all | body | white | iris | black
//     openscad -o body.stl  -D 'kind="husky"' -D 'part="body"'  flexi.scad
//     openscad -o white.stl -D 'kind="husky"' -D 'part="white"' flexi.scad
//     openscad -o iris.stl  -D 'kind="husky"' -D 'part="iris"'  flexi.scad
//     openscad -o black.stl -D 'kind="husky"' -D 'part="black"' flexi.scad
//   Einfarbig/Vorschau:  -D 'part="all"'
//
// DRUCK (Bambu X1C, PLA): 0.2 mm, KEINE Stützen, flach. ERST n=2 testen!
// Ehrlich: "niedlich & einfach", KEIN Profi-Sculpt-Niveau.
// ---------------------------------------------------------------------------

kind   = "husky";  // husky|cat|bear|panda|fox
part   = "all";    // all|body|white|iris|black
n      = 3;        // Körper-Segmente nach dem Kopf (pummelig: 2–3)
seg_r  = 10;       // Kopf-/Front-Radius (mm)
s_min  = 5.5;      // kleinster Segment-Radius
ball_k = 0.3;      // Gelenk-Kugel-Anteil
neck_k = 0.16;
clear  = 0.35;
gapy   = 0.6;
edep   = 2.2;
loop   = true;
$fn    = 44;

ear_round = (kind=="bear"||kind=="panda");
iris_on   = (kind=="husky"||kind=="cat"||kind=="fox");   // blaue Iris
taper     = 0.95;

// Körper-Form: breit (X) und flacher (Z) -> Tier-Bauch statt Kugel
sx_=1.18; sy_=1.04; sz_=0.82;
function yr(s) = s*sy_;
module bodyshape(s) scale([sx_,sy_,sz_]) sphere(s);

module C_body()  if (part=="all"||part=="body")  children();
module C_white() if (part=="all"||part=="white") children();
module C_iris()  if (part=="all"||part=="iris")  color([0.2,0.45,0.8]) children();
module C_black() if (part=="all"||part=="black") children();

function eye_r(s) = s*0.3;
module eye_at(s) for (sx=[-1,1]) translate([sx*s*0.46, -yr(s)*0.74, s*0.2]) children();

// Ohren
module ears(s) {
  if (ear_round) for (sx=[-1,1]) translate([sx*s*0.62,-s*0.05,s*0.62]) scale([1,0.7,1]) sphere(s*0.4);
  else { eh=s*(kind=="fox"?1.15:0.95); eb=s*0.46;
    for (sx=[-1,1]) translate([sx*s*0.5,-s*0.05,s*0.55]) rotate([12,0,sx*10]) cylinder(h=eh,r1=eb,r2=0.8); }
}
// Gliedmasse: Stummel + Pfote, paw = Pfoten-Pad (schwarz) unten
module limb(s, len, down, fwd, pad) {
  rotate([fwd,0,0]) {
    C_body() hull(){ sphere(s*0.34); translate([0,0,-len]) sphere(s*0.26); }
    translate([0,0,-len]) {
      C_body() sphere(s*0.3);
      if (pad) C_black() translate([0,-s*0.12,-s*0.12]) scale([1,1,0.5]) sphere(s*0.17);
    }
  }
  // 'down' nur Doku; Ausrichtung via fwd + globaler Platzierung
}
module arms(s)  for (sx=[-1,1]) translate([sx*s*0.95,-s*0.1,-s*0.15]) rotate([0,0,sx*18]) limb(s, s*0.7, 1, 25, true);
module legs(s)  for (sx=[-1,1]) translate([sx*s*1.0, s*0.15,-s*0.2]) rotate([0,0,sx*12]) limb(s, s*0.85,1,-15, true);

// Ein Segment
module segment(i, s, s_next, is_last) {
  rb_here=ball_k*s; nk_here=neck_k*s; rb_next=ball_k*s_next; nk_next=neck_k*s_next;
  C_body() difference() {
    union() {
      bodyshape(s);
      if (i>0){ bc=yr(s)+gapy+edep;
        translate([0,-bc,0]) sphere(rb_here);
        hull(){ translate([0,-(yr(s)-0.6),0]) sphere(nk_here); translate([0,-bc,0]) sphere(nk_here);} }
      if (i==0) ears(s);
    }
    if (s_next>0){ sc=yr(s)-edep;
      translate([0,sc,0]) sphere(rb_next+clear);
      hull(){ translate([0,sc,0]) sphere(nk_next+clear+0.4); translate([0,sc+yr(s)*1.3,0]) sphere(nk_next+clear+1.4);} }
    if (i==0){ eye_at(s) sphere(eye_r(s)); translate([0,-yr(s)*0.96,-s*0.05]) sphere(s*0.15); }  // Augen+Nasen-Mulde
  }
  if (i==1) arms(s);
  if (is_last) legs(s);
  if (i==0) {
    // Augen 3-farbig: weiss (Mulde) - Iris-Mulde ; Iris (blau) - Pupillen-Mulde ; Pupille schwarz
    er=eye_r(s);
    C_white() eye_at(s) difference(){ sphere(er); translate([0,-er*0.5,0]) sphere(er*0.62); }
    if (iris_on) C_iris() eye_at(s) translate([0,-er*0.5,0]) difference(){ sphere(er*0.62); translate([0,-er*0.35,0]) sphere(er*0.4); }
    C_black() { eye_at(s) translate([0,-er*0.85,0]) sphere(er*0.4);
                translate([0,-yr(s)*0.96,-s*0.05]) sphere(s*0.15); }   // Pupille + Nase
    if (loop) C_body() translate([0,s*0.4,s*0.95]) rotate([90,0,0]) difference(){ cylinder(h=3,r=4.6,center=true); cylinder(h=4,r=2.4,center=true);}
  }
}

module chain(i,y,s){
  s_next=(i<n)?max(s*taper,s_min):0;
  translate([0,y,0]) segment(i,s,s_next,(i==n));
  if(i<n) chain(i+1, y+yr(s)+yr(s_next)+gapy, s_next);
}
chain(0,0,seg_r);
