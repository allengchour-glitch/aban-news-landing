"""Regression des von Claude gefundenen Zustandsfehlers F8, ohne Netzwerk."""
import sys
import unittest
from unittest.mock import patch
import labor as L


class Zustandsfehler(unittest.TestCase):
    def strom(self):
        s = L.SignalStrom()
        for i in range(230):
            s.schritt(100.0 + i / 10)
        return s

    def zustand(self, s):
        return s.anzahl, tuple(s._historie)

    def test_extremkurs_wird_vor_uebernahme_abgewiesen(self):
        a, referenz = self.strom(), self.strom()
        vorher = self.zustand(a)
        for kurs in (sys.float_info.min, 1e308, 1e-300, 1e300, 10 ** 400):
            with self.subTest(kurs=kurs), self.assertRaises(ValueError):
                a.schritt(kurs)
            self.assertEqual(self.zustand(a), vorher)
        self.assertEqual(a.schritt(123.0), referenz.schritt(123.0))

    def test_extremkurs_auch_ohne_vorgaenger_abgewiesen(self):
        for kurs in (sys.float_info.min, 1e308):
            s = L.SignalStrom()
            with self.subTest(kurs=kurs), self.assertRaises(ValueError):
                s.schritt(kurs)
            self.assertEqual(self.zustand(s), (0, ()))

    def test_rechenfehler_veraendert_keinen_zustand(self):
        s = self.strom()
        vorher = self.zustand(s)
        with patch.object(L, "stdev", side_effect=ArithmeticError("Erfundener Rechenfehler")):
            with self.assertRaises(ArithmeticError):
                s.schritt(123.0)
        self.assertEqual(self.zustand(s), vorher)
        self.assertEqual(s.schritt(123.0), self.strom().schritt(123.0))

    def test_nichtendliche_rechnung_veraendert_keinen_zustand(self):
        s = self.strom()
        vorher = self.zustand(s)
        with patch.object(L, "stdev", return_value=float("nan")):
            with self.assertRaises(ValueError):
                s.schritt(123.0)
        self.assertEqual(self.zustand(s), vorher)

    def test_unplausibler_sprung_wird_auch_innerhalb_des_preisbereichs_abgewiesen(self):
        s = self.strom()
        vorher = self.zustand(s)
        for kurs in (1e-10, 1e10):
            with self.subTest(kurs=kurs), self.assertRaises(ValueError):
                s.schritt(kurs)
            self.assertEqual(self.zustand(s), vorher)


if __name__ == "__main__":
    unittest.main()
