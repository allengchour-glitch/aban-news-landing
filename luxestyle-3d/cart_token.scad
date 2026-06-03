// cart_token.scad — Einkaufswagen-Chip Schluesselanhaenger (LuxeStyle)
// ---------------------------------------------------------------------------
// Muenz-grosser Token (loest den Einkaufswagen aus) + Greif-Lasche + Schluessel-
// ring + Initialen/Text. Funktional, guenstig, schnell gedruckt, personalisierbar.
//
//   coin = chf1 | chf2 | chf5 | eur1 | eur2 | eur050 | custom
//   dia, thick           (nur bei coin="custom"; sonst aus Tabelle)
//   txt  = "AC"          Initialen/Text auf der Scheibe (erhaben)
//   part = all | base | text     (text = 2. Farbe fuer AMS / assemble.py)
//   ring = true          Oese in der Lasche
//
// Bauen:  openscad -o token.stl -D 'coin="chf2"' -D 'txt="AC"' cart_token.scad
// 2-farbig (AMS): part="base" und part="text" einzeln -> assemble.py
// Druck: flach, 0.2 mm, 100% Infill (muss Muenzgewicht/-dicke imitieren), KEINE Stuetzen.
// ---------------------------------------------------------------------------

coin   = "chf2";
txt    = "AC";
part   = "all";
ring   = true;

// custom-Werte (nur wenn coin="custom")
dia    = 25;
thick  = 2.2;

txt_size_f = 0.46;   // Textgroesse relativ zum Durchmesser
txt_h      = 0.6;    // Texthoehe (erhaben) mm
tab_len    = 15;     // Laenge der Greif-Lasche
tab_w_f    = 0.46;   // Laschenbreite relativ zum Durchmesser
ring_d     = 5;      // Loch-Durchmesser Oese
chamfer    = 0.6;    // Fase am Rand (leichteres Einstecken)
$fn        = 96;

// --- Muenzmasse (Durchmesser, Dicke) in mm ---
function coin_dia(c) =
   c=="chf1"  ? 23.20 : c=="chf2"  ? 27.40 : c=="chf5"  ? 31.45 :
   c=="eur1"  ? 23.25 : c=="eur2"  ? 25.75 : c=="eur050"? 24.25 : dia;
function coin_th(c) =
   c=="chf1"  ? 1.55  : c=="chf2"  ? 2.15  : c=="chf5"  ? 2.35  :
   c=="eur1"  ? 2.33  : c=="eur2"  ? 2.20  : c=="eur050"? 2.38  : thick;

D = coin_dia(coin);
T = coin_th(coin);
tab_w = D * tab_w_f;

module disc() {
  // Scheibe mit beidseitiger Fase (Token rutscht leichter in den Schlitz)
  hull() {
    cylinder(d=D, h=T - 2*chamfer, center=false, $fn=$fn);
    translate([0,0,chamfer])      cylinder(d=D, h=T-2*chamfer, center=false);
    translate([0,0,0])            cylinder(d=D-2*chamfer, h=T);
  }
}

module tab() {
  // Greif-Lasche: ragt aus der Scheibe heraus, mit Oese am Ende
  ty = -D/2 - tab_len + tab_w/2 + 3;   // ueberlappt die Scheibe -> verschmolzen
  difference() {
    hull() {
      translate([0, -D/2 + 3, 0]) cylinder(d=tab_w, h=T);
      translate([0, ty, 0])       cylinder(d=tab_w, h=T);
    }
    if (ring)
      translate([0, ty, -1]) cylinder(d=ring_d, h=T+2);
  }
}

module base() {
  union() { disc(); tab(); }
}

module label() {
  // Initialen erhaben auf der Oberseite
  translate([0, 0, T])
    linear_extrude(txt_h)
      text(txt, size=D*txt_size_f, halign="center", valign="center",
           font="Liberation Sans:style=Bold");
}

if (part=="base") {
  base();
} else if (part=="text") {
  label();
} else {
  union() { base(); label(); }
}
