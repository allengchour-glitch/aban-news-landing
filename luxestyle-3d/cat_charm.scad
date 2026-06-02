// ============================================================
//  LuxeStyle - Flacher Kawaii-Katzen-Charm, MEHRFARBIG (AMS)
//  Koerper weiss + orange Flecken, Augen schwarz (X), Zunge orange.
//  Flach/taschentauglich. Eigenes Design, frei verkaufbar.
//  Druck (Bambu Studio + AMS): Koerper weiss, Flecken/Zunge orange,
//  Augen/Mund schwarz. Farbteile sind eigene erhabene Geometrie.
//  Rendern: openscad -o cat_charm.stl cat_charm.scad
// ============================================================

length = 64;   // mm
width  = 46;   // mm
thick  = 9;    // Dicke mm (flach)
edge_r = 11;
ring_d = 6;
eye_dx = 11;   // Augenabstand
eye_y  = 3;
emb    = 1.4;  // Erhebung der Farbteile
$fn = 64;

module body2d() {
    union() {
        offset(edge_r) offset(-edge_r) square([length, width], center = true);
        for (s = [-1, 1]) translate([s * 13, width / 2 - 5]) rotate(s * 16)
            polygon([[-9, -1], [9, -1], [s * 3, 15]]);   // Ohren
    }
}

// ---- weisser Koerper (mit Loch oben links, weg vom Gesicht) ----
color("white")
difference() {
    linear_extrude(thick) body2d();
    translate([-length * 0.40, width * 0.26, -1]) cylinder(d = ring_d, h = thick + 2);
}

// ---- orange Flecken (Calico-Look, 2 ausgewogen) ----
color("orange") {
    translate([16, 15, thick]) linear_extrude(emb * 0.7) resize([15, 13]) circle(d = 20);
    translate([-16, -10, thick]) linear_extrude(emb * 0.7) resize([13, 11]) circle(d = 20);
}

// ---- schwarze X-Augen (erhaben) ----
module xbar(px, py, ang)
    translate([px, py, thick]) rotate([0, 0, ang]) linear_extrude(emb)
        square([11, 2.6], center = true);
color("black")
for (s = [-1, 1]) { xbar(s * eye_dx, eye_y, 45); xbar(s * eye_dx, eye_y, -45); }

// ---- schwarzer Mund (klein, offen) ----
color("black") {
    translate([0, eye_y - 9, thick]) linear_extrude(emb) resize([8, 2]) circle(d = 10);
    for (s = [-1, 1]) translate([s * 3.5, eye_y - 10.5, thick]) rotate(s * -55)
        linear_extrude(emb) square([5, 2], center = true);
}

// ---- orange Zunge (erhaben, haengt raus) ----
color("orange")
translate([0, eye_y - 15, thick]) linear_extrude(emb * 1.1) resize([8, 11]) circle(d = 20);
