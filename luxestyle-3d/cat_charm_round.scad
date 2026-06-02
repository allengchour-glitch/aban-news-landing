// ============================================================
//  LuxeStyle - Flacher Kawaii-Katzen-Charm, RUNDE Augen (kein X)
//  Mehrfarbig (AMS): weiss + rosa Ohren, schwarze runde Augen + Nase,
//  orange Zunge. Mit Schluesselring-Loch. Flach/taschentauglich.
//  Rendern: openscad -o cat_charm_round.stl cat_charm_round.scad
// ============================================================

length = 64;   // mm
width  = 46;   // mm
thick  = 9;    // Dicke mm
edge_r = 11;
ring_d = 6;
eye_dx = 11;   // Augenabstand
eye_y  = 2;
eye_d  = 12;   // Augendurchmesser
emb    = 1.5;  // Erhebung der Farbteile
$fn = 72;

module body2d() {
    union() {
        offset(edge_r) offset(-edge_r) square([length, width], center = true);
        for (s = [-1, 1]) translate([s * 13, width / 2 - 5]) rotate(s * 16)
            polygon([[-9, -1], [9, -1], [s * 3, 15]]);   // Ohren
    }
}

// ---- weisser Koerper + Loch (oben links) ----
color("white")
difference() {
    linear_extrude(thick) body2d();
    translate([-length * 0.40, width * 0.26, -1]) cylinder(d = ring_d, h = thick + 2);
}

// ---- rosa Ohr-Innenseiten ----
color([1, 0.72, 0.76])
for (s = [-1, 1]) translate([s * 13, width / 2 - 4, thick])
    linear_extrude(emb * 0.6) rotate(s * 16) polygon([[-5, 0], [5, 0], [s * 1.5, 9]]);

// ---- schwarze runde Augen ----
color("black")
for (s = [-1, 1]) translate([s * eye_dx, eye_y, thick])
    linear_extrude(emb) circle(d = eye_d);

// ---- kleine schwarze Nase ----
color("black")
translate([0, eye_y - 7.5, thick]) linear_extrude(emb) resize([4.5, 3]) circle(d = 10);

// ---- orange Zunge (haengt raus) ----
color("orange")
translate([0, eye_y - 13, thick]) linear_extrude(emb * 1.1) resize([7, 10]) circle(d = 20);
