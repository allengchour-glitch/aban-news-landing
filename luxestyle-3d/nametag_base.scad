// ============================================================
//  LuxeStyle - Grundplatte fuer MEHRFARBIGE Namens-Anhaenger
//  (fuer X1C + AMS). Text ist hier ABSICHTLICH nicht enthalten -
//  den setzt du in Bambu Studio mit dem Text-Werkzeug in einer
//  zweiten Farbe drauf (siehe README, Abschnitt "Mehrfarbig").
//
//  Einmal rendern, immer wiederverwenden:
//    openscad -o base.stl -D width=70 nametag_base.scad
// ============================================================

width       = 70;   // Plattenbreite in mm (genug fuer ~10 Zeichen)
height      = 24;   // Plattenhoehe in mm
plate_thick = 3;    // Dicke in mm
corner_r    = 5;    // Eckenradius in mm

ring_d      = 6;    // Aufhaenge-Loch-Durchmesser in mm
ring_margin = 7;    // Abstand des Lochs vom linken Rand in mm

$fn = 64;

module rounded_rect(w, h, r) {
    offset(r) offset(-r) square([w, h], center = true);
}

difference() {
    linear_extrude(plate_thick)
        rounded_rect(width, height, corner_r);
    translate([-width / 2 + ring_margin, 0, -1])
        cylinder(d = ring_d, h = plate_thick + 2);
}
