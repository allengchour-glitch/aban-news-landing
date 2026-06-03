// ============================================================
//  LuxeStyle - Parametrisches Namensschild (Tuer / Schreibtisch)
//  Rendern:  openscad -o out.stl -D 'txt="Familie Mueller"' nameplate.scad
//  Bequemer: python3 make.py nameplate "Familie Mueller"
// ============================================================

/* [Text] */
txt         = "NAME";
font        = "Liberation Sans:style=Bold";
text_size   = 14;   // Schrifthoehe in mm
text_thick  = 2.5;  // erhabener Text in mm

/* [Platte] */
plate_thick = 4;    // Dicke der Grundplatte in mm
margin_x    = 14;   // Rand links/rechts in mm
margin_y    = 11;   // Rand oben/unten in mm
corner_r    = 5;    // Eckenradius in mm

/* [Montage] */
holes       = false; // true = zwei Schraubloecher (fuer Tuerschild)
hole_d      = 4;     // Lochdurchmesser in mm

/* [Qualitaet] */
$fn = 64;

est_w   = max(len(txt), 1) * text_size * 0.62;
plate_w = est_w + 2 * margin_x;
plate_h = text_size + 2 * margin_y;

module rounded_rect(w, h, r) {
    offset(r) offset(-r) square([w, h], center = true);
}

module body() {
    difference() {
        linear_extrude(plate_thick)
            rounded_rect(plate_w, plate_h, corner_r);
        if (holes) {
            for (x = [-1, 1])
                translate([x * (plate_w / 2 - margin_x / 2), 0, -1])
                    cylinder(d = hole_d, h = plate_thick + 2);
        }
    }
}

module label() {
    translate([0, 0, plate_thick])
        linear_extrude(text_thick)
            text(txt, size = text_size, font = font,
                 halign = "center", valign = "center");
}

union() {
    body();
    label();
}
