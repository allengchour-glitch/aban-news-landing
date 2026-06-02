// ============================================================
//  LuxeStyle - Print-in-Place Gliederkette (eigenes Design)
//  Bewegliche Kette, in EINEM Stück gedruckt - frei verkaufbar.
//
//  Rendern:  openscad -o flexi_chain.stl flexi_chain.scad
//
//  WICHTIG (Tuning, einmal auf dem X1C testen):
//   - Glieder VERKLEBEN nach dem Druck -> pitch ERHOEHEN (mehr Spalt).
//   - Kette FAELLT AUSEINANDER (Glieder nicht verhakt) -> pitch VERRINGERN.
//   - Geprueft: pitch 11-11.5 = alle Glieder getrennt UND verhakt.
//   - Verhakt bleibt nur solange pitch < 2*R - r (hier < 13.8).
// ============================================================

links  = 6;     // Anzahl beweglicher Glieder
R      = 8;     // Ring-Radius (Mitte des Rohrs) in mm
r      = 2.2;   // Rohrdicke (Radius) in mm
pitch  = 11.5;  // Abstand der Glieder entlang X in mm (geprueft beweglich)
$fn    = 56;

module link() {
    rotate_extrude() translate([R, 0, 0]) circle(r = r);
}

// Kette: jedes 2. Glied um 90 Grad gedreht -> ineinander verhakt
for (i = [0 : links - 1]) {
    translate([i * pitch, 0, 0])
        rotate([(i % 2) * 90, 0, 0])
            link();
}
