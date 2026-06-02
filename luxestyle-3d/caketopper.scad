// ============================================================
//  LuxeStyle - Parametrischer Cake-Topper (Steck-Schild fuer Torten)
//  Rendern:  openscad -o out.stl -D 'txt="Happy Birthday"' caketopper.scad
//  Bequemer: python3 make.py caketopper "Happy Birthday"
//
//  Druck-Hinweis: flach liegend drucken (steht spaeter hochkant in der Torte).
// ============================================================

/* [Text] */
txt        = "Happy Birthday";
font       = "Liberation Sans:style=Bold";
text_size  = 18;   // Schrifthoehe in mm
thick      = 3;    // Materialstaerke in mm (gibt Stabilitaet)

/* [Steg & Fuesse] */
bar_h      = 3;    // Verbindungssteg unter dem Text (haelt Buchstaben zusammen)
spike_h    = 25;   // Laenge der Steckfuesse in mm
spike_w    = 3;    // Breite der Steckfuesse in mm

/* [Qualitaet] */
$fn = 48;

est_w = max(len(txt), 1) * text_size * 0.58;

linear_extrude(thick) {
    text(txt, size = text_size, font = font,
         halign = "center", valign = "baseline");

    translate([0, -bar_h / 2, 0])
        square([est_w, bar_h], center = true);

    for (x = [-1, 1])
        translate([x * est_w * 0.3 - spike_w / 2, -bar_h - spike_h, 0])
            square([spike_w, spike_h]);
}
