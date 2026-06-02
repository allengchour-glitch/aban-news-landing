// ============================================================
//  LuxeStyle - Flache Kawaii-Katze (Hosentaschen-Anhaenger)
//  Flach liegend, taschentauglich. Gesicht GEZEICHNET/graviert:
//  X-Augen, Schnurrhaare, Zunge raus. Eigenes Design, frei verkaufbar.
//  Rendern: openscad -o kawaii_cat.stl kawaii_cat.scad
// ============================================================

length    = 70;   // Laenge in mm (50-90 je nach Typ)
width     = 48;   // Breite in mm
thick     = 10;   // Dicke in mm (flach fuer die Tasche)
edge_r    = 11;   // Rundung der Silhouette
face_depth = 1.3; // Gravurtiefe (Augen/Schnurrhaare/Mund)
tongue_h  = 1.2;  // Zunge erhaben (spaeter farbig)
ring_d    = 6;    // Schluesselring-Loch
$fn = 64;

// Kopf-/Gesichtszentrum (zentriert)
fx = 0;
fy = 1;
top = thick;

// ---- Silhouette: Loaf-Koerper + Ohren ----
module blob2d() {
    union() {
        offset(edge_r) offset(-edge_r) square([length, width], center = true);
        for (s = [-1, 1])                       // Ohren oben am Kopf
            translate([fx + s * 12, width / 2 - 5])
                polygon([[-9, -1], [9, -1], [s * 3, 15]]);
    }
}

// ---- Gravur-Elemente (werden vom Koerper abgezogen) ----
module bar(px, py, len, w, ang) {
    translate([px, py, top - face_depth / 2])
        rotate([0, 0, ang])
            cube([len, w, face_depth + 0.6], center = true);
}
module x_eye(px, py) { bar(px, py, 11, 2.4, 45); bar(px, py, 11, 2.4, -45); }
module whiskers(px, py, dir) {
    for (i = [-1, 0, 1]) bar(px + dir * 9, py + i * 4.5, 17, 1.5, dir * i * 9);
}
module mouth() { bar(fx, fy - 7, 9, 1.8, 0); bar(fx - 4, fy - 8.5, 5, 1.8, 55); bar(fx + 4, fy - 8.5, 5, 1.8, -55); }

module engrave() {
    x_eye(fx - 8, fy + 3);
    x_eye(fx + 8, fy + 3);
    whiskers(fx - 15, fy, -1);
    whiskers(fx + 15, fy, +1);
    mouth();
}

// ---- erhabene Zunge (unter dem Mund) ----
module tongue() {
    translate([fx, fy - 12, top])
        linear_extrude(tongue_h)
            offset(2.5) offset(-2.5) square([8, 9], center = true);
}

// ---- Zusammenbau ----
difference() {
    union() {
        difference() {
            linear_extrude(thick) blob2d();
            engrave();
        }
        tongue();
    }
    // Schluesselring-Loch oben links (Ecke), durch die Dicke
    translate([-length * 0.40, width * 0.28, -1])
        cylinder(d = ring_d, h = thick + 2);
}
