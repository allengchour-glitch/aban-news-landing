// ============================================================
//  LuxeStyle - Tier-Silhouetten-Anhaenger (eigene, generische Formen)
//  Einfache Umrisse aus Grundformen - gehoeren dir, frei verkaufbar.
//  Rendern:  openscad -o out.stl -D 'kind="cat"' -D 'col="Gold"' animal.scad
// ============================================================

kind  = "cat";    // cat, bear, rabbit, fish, paw, dog, heart, star, butterfly
col   = "Gold";   // Vorschau-Farbe (CSS-Farbname)
thick = 4;        // Materialstaerke in mm
ring_d = 5;       // Aufhaenge-Loch in mm
$fn = 72;

module sh_cat() {
    union() {
        circle(d = 42);
        for (s = [-1, 1]) translate([s * 13, 13])
            polygon([[-9, -2], [9, -2], [s * 3, 17]]);
    }
}
module sh_bear() {
    union() {
        circle(d = 42);
        for (s = [-1, 1]) translate([s * 16, 16]) circle(d = 20);
    }
}
module sh_rabbit() {
    union() {
        circle(d = 38);
        for (s = [-1, 1]) translate([s * 9, 28]) scale([1, 2.2]) circle(d = 12);
    }
}
module sh_fish() {
    union() {
        scale([1.3, 1]) circle(d = 40);
        translate([-30, 0]) polygon([[0, 0], [-15, 13], [-15, -13]]);
    }
}
module sh_paw() {
    union() {
        translate([0, -4]) scale([1.25, 1]) circle(d = 30);
        for (a = [-26, -9, 9, 26]) rotate(a) translate([0, 22]) circle(d = 12);
    }
}
module sh_dog() {
    union() {
        circle(d = 40);
        for (s = [-1, 1]) translate([s * 20, 2]) scale([1, 1.8]) circle(d = 16);
    }
}
module sh_heart() {
    union() {
        for (s = [-1, 1]) translate([s * 11, 8]) circle(d = 24);
        polygon([[-22, 7], [22, 7], [0, -26]]);
    }
}
module sh_star() {
    r1 = 24; r2 = 10;
    points = [for (i = [0:9]) let(a = i * 36, r = (i % 2 == 0) ? r1 : r2)
        [r * cos(a + 90), r * sin(a + 90)]];
    polygon(points);
}
module sh_butterfly() {
    union() {
        // schlanker Koerper (Ellipse)
        scale([0.45, 1.9]) circle(d = 18);
        // obere Fluegel (gross), untere Fluegel (kleiner)
        for (s = [-1, 1]) {
            translate([s * 13, 8])  circle(d = 26);
            translate([s * 12, -9]) circle(d = 22);
        }
        // Fuehler: kurze, dicke Stiele mit Knubbel (druckstabil)
        for (s = [-1, 1]) translate([0, 16]) rotate(s * 22)
            hull() {
                circle(d = 2.6);
                translate([0, 9]) circle(d = 3.4);
            }
    }
}

module shape2d() {
    if (kind == "cat") sh_cat();
    else if (kind == "bear") sh_bear();
    else if (kind == "rabbit") sh_rabbit();
    else if (kind == "fish") sh_fish();
    else if (kind == "paw") sh_paw();
    else if (kind == "dog") sh_dog();
    else if (kind == "heart") sh_heart();
    else if (kind == "star") sh_star();
    else if (kind == "butterfly") sh_butterfly();
}

function hole_pos() =
    (kind == "fish") ? [6, 4] :
    (kind == "paw")  ? [0, -2] :
    (kind == "heart")? [0, -2] :
    (kind == "star") ? [0, 6] :
    (kind == "butterfly") ? [0, 8] :
    [0, 10];

color(col)
linear_extrude(thick)
difference() {
    shape2d();
    translate(hole_pos()) circle(d = ring_d);
}
