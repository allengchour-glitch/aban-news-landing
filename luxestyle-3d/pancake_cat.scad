// ============================================================
//  LuxeStyle - Flache Kawaii-PFANNKUCHEN-Katze (gespreizt)
//  Gespreizte Liege-Pose + graviertes Gesicht (X-Augen, Zunge raus).
//  Flach/taschentauglich. Eigenes Design, frei verkaufbar.
//  Rendern: openscad -o pancake_cat.stl pancake_cat.scad
//  Farbe: einfarbig ODER AMS in Bambu Studio (Koerper/Flecken/Zunge).
// ============================================================

thick      = 9;     // Dicke in mm (flach)
face_depth = 1.2;   // Gravurtiefe
tongue_h   = 1.4;   // Zunge erhaben
ring_d     = 6;
$fn = 56;

hy = -26;   // Kopf-Mitte y
top = thick;

// ---- Silhouette (Draufsicht): Koerper + Kopf + 4 Pfoten + Schwanz ----
module silhouette() {
    offset(4) offset(-4)            // weiche Rundung
    union() {
        translate([0, 10]) scale([1.35, 0.92]) circle(d = 56);          // Koerper (flach/breit)
        translate([0, hy]) circle(d = 44);                            // Kopf (gross)
        for (s = [-1, 1]) translate([s * 12, hy + 16]) rotate(s * 16) // Ohren
            polygon([[-9, -2], [9, -2], [s * 2, 16]]);
        hull() { translate([0, hy]) circle(d = 22); translate([-30, hy - 12]) circle(d = 18); } // Vorderpfote L
        hull() { translate([0, hy]) circle(d = 22); translate([ 30, hy - 12]) circle(d = 18); } // Vorderpfote R
        hull() { translate([0, 10]) circle(d = 32); translate([-36, 28]) circle(d = 18); }       // Hinterpfote L
        hull() { translate([0, 10]) circle(d = 32); translate([ 36, 28]) circle(d = 18); }       // Hinterpfote R
        // Schwanz (geschwungener Haken, rechts oben)
        hull() { translate([30, 14]) circle(d = 15); translate([42, 24]) circle(d = 12); }
        hull() { translate([42, 24]) circle(d = 12); translate([47, 36]) circle(d = 9); }
        hull() { translate([47, 36]) circle(d = 9);  translate([40, 44]) circle(d = 7); }
    }
}

// ---- Gravur-Helfer ----
module bar(px, py, len, w, ang) {
    translate([px, py, top - face_depth / 2]) rotate([0, 0, ang])
        cube([len, w, face_depth + 0.6], center = true);
}
module x_eye(px, py) { bar(px, py, 11, 2.4, 45); bar(px, py, 11, 2.4, -45); }

module face() {
    x_eye(-9, hy + 4);
    x_eye( 9, hy + 4);
    // Schnurrhaare
    for (s = [-1, 1]) for (i = [-1, 0, 1])
        bar(s * 23, hy - 1 + i * 4.5, 16, 1.4, s * i * 8);
    // offener Mund (Bogen)
    bar(0, hy - 8, 9, 1.8, 0);
    bar(-4, hy - 9.5, 5, 1.8, 55);
    bar( 4, hy - 9.5, 5, 1.8, -55);
}

// ---- erhabene Zunge (haengt unten aus dem Mund) ----
module tongue() {
    translate([0, hy - 14, top]) linear_extrude(tongue_h)
        offset(3) offset(-3) square([8, 12], center = true);
}

difference() {
    union() {
        difference() {
            linear_extrude(thick) silhouette();
            face();
        }
        tongue();
    }
    // Schluesselring-Loch oben (zwischen Hinterpfoten)
    translate([0, 34, -1]) cylinder(d = ring_d, h = thick + 2);
}
