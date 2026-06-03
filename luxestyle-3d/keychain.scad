// ============================================================
//  LuxeStyle - Parametrischer Namens-Schluesselanhaenger
//  Rendern:  openscad -o out.stl -D 'txt="Mia"' keychain.scad
//  Bequemer: python3 make.py keychain "Mia"
// ============================================================

/* [Text] */
txt         = "NAME";                       // Wunschtext (per -D ueberschreiben)
font        = "Liberation Sans:style=Bold"; // System-Schrift
text_size   = 11;   // Schrifthoehe in mm
text_thick  = 2;    // Hoehe des erhabenen Textes in mm

/* [Platte] */
plate_thick = 3;    // Dicke der Grundplatte in mm
margin      = 7;    // Rand um den Text in mm
corner_r    = 4;    // Eckenradius in mm

/* [Ring-Loch] */
ring_d      = 6;    // Durchmesser des Aufhaenge-Lochs in mm

/* [Qualitaet] */
$fn = 64;

est_text_w = max(len(txt), 1) * text_size * 0.62;
ring_zone  = ring_d + margin;
plate_w    = est_text_w + 2 * margin + ring_zone;
plate_h    = text_size + 2 * margin;

module rounded_rect(w, h, r) {
    offset(r) offset(-r) square([w, h], center = true);
}

module plate() {
    difference() {
        linear_extrude(plate_thick)
            rounded_rect(plate_w, plate_h, corner_r);
        translate([-plate_w / 2 + ring_zone / 2, 0, -1])
            cylinder(d = ring_d, h = plate_thick + 2);
    }
}

module label() {
    translate([ring_zone / 2, 0, plate_thick])
        linear_extrude(text_thick)
            text(txt, size = text_size, font = font,
                 halign = "center", valign = "center");
}

union() {
    plate();
    label();
}
