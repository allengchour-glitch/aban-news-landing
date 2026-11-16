"""Offline regression fixtures for the product-scoped CHF price gate."""
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from urllib.request import Request

from verify_product_details import (
    StrictRedirectHandler, cache_busted_url, evaluate_main_price_gate,
    guarded_browser_route, main_price_selector, parse_chf,
    validate_browser_request_url, validate_product_url, validate_targets,
)


PRODUCT = "15524879008129"
VARIANT = "68122741047687"
OTHER_PRODUCT = "15449463751041"
DETAILS = {"withinProductInformationDetails": True, "insideRecommendation": False}


class MainProductPriceGateTests(unittest.TestCase):
    def check_gate(self, snapshot):
        return evaluate_main_price_gate(snapshot, product_id=PRODUCT,
                                        expected_variant_id=VARIANT,
                                        expected_price_chf="28.90")

    def test_correct_main_price_wins_over_wrong_recommendation_price(self):
        fixture = {
            "variantId": VARIANT,
            "mainProductPrices": [{"productId": PRODUCT, "text": "CHF 28.90", "visible": True, **DETAILS}],
            "recommendationPrices": [{"productId": OTHER_PRODUCT, "text": "CHF 99.90", "visible": True}],
            "stickyProductPrices": ["CHF 28.90"],
        }
        self.assertTrue(self.check_gate(fixture)["passed"])

    def test_missing_main_price_does_not_fall_back_to_correct_sticky_price(self):
        fixture = {"variantId": VARIANT, "mainProductPrices": [], "stickyProductPrices": ["CHF 28.90"]}
        result = self.check_gate(fixture)
        self.assertFalse(result["passed"])
        self.assertEqual(result["reason"], "main_product_price_missing_or_invisible")
        self.assertEqual(result["parsedMainPricesCHF"], [])

    def test_wrong_main_price_does_not_fall_back_to_correct_sticky_price(self):
        fixture = {"variantId": VARIANT,
                   "mainProductPrices": [{"productId": PRODUCT, "text": "CHF 99.90", "visible": True, **DETAILS}],
                   "stickyProductPrices": ["CHF 28.90"]}
        result = self.check_gate(fixture)
        self.assertFalse(result["passed"])
        self.assertEqual(result["reason"], "main_product_price_mismatch")

    def test_matching_price_from_wrong_product_id_cannot_pass(self):
        fixture = {"variantId": VARIANT,
                   "mainProductPrices": [{"productId": OTHER_PRODUCT, "text": "CHF 28.90", "visible": True, **DETAILS}]}
        result = self.check_gate(fixture)
        self.assertFalse(result["passed"])
        self.assertEqual(result["reason"], "main_product_price_missing_or_invisible")

    def test_wrong_variant_id_cannot_pass_even_if_main_price_matches(self):
        fixture = {"variantId": "68122741014919",
                   "mainProductPrices": [{"productId": PRODUCT, "text": "CHF 28.90", "visible": True, **DETAILS}]}
        result = self.check_gate(fixture)
        self.assertFalse(result["passed"])
        self.assertEqual(result["reason"], "selected_variant_id_mismatch")

    def test_empty_ambiguous_or_non_chf_price_is_unknown_not_zero(self):
        for text in ("", "CHF —", "CHF 28.90 CHF 99.90", "EUR 28.90",
                     "CHF28.90", "CHF 28.90abc", "CHF 28.90/99.90", "CHF 28.901", "CHF 28.9"):
            self.assertIsNone(parse_chf(text), text)

    def test_malformed_price_text_cannot_pass_the_gate(self):
        for text in ("CHF 28.90abc", "CHF 28.90/99.90", "CHF 28.901"):
            fixture = {"variantId": VARIANT,
                       "mainProductPrices": [{"productId": PRODUCT, "text": text, "visible": True, **DETAILS}]}
            with self.subTest(text=text):
                result = self.check_gate(fixture)
                self.assertFalse(result["passed"])
                self.assertEqual(result["reason"], "main_product_price_unknown_or_ambiguous")

    def test_strict_parser_accepts_complete_swiss_amounts(self):
        self.assertEqual(parse_chf("CHF 28.90"), parse_chf("CHF 28,90"))
        self.assertEqual(parse_chf("CHF 1’234.50"), parse_chf("CHF 1234.50"))

    def test_repeated_or_mixed_grouping_separators_cannot_pass_price_gate(self):
        for text in ("CHF 1’’234.50", "CHF 1''234.50", "CHF 1’234'567.00"):
            with self.subTest(text=text):
                self.assertIsNone(parse_chf(text))
                fixture = {"variantId": VARIANT,
                           "mainProductPrices": [{"productId": PRODUCT, "text": text, "visible": True, **DETAILS}]}
                result = evaluate_main_price_gate(fixture, product_id=PRODUCT,
                                                  expected_variant_id=VARIANT,
                                                  expected_price_chf="1234.50")
                self.assertFalse(result["passed"])
                self.assertEqual(result["reason"], "main_product_price_unknown_or_ambiguous")

    def test_same_id_recommendation_cannot_replace_missing_main_price(self):
        # Offline DOM snapshot: the recommendation happens to reuse this product ID.
        fixture = {"variantId": VARIANT, "mainProductPrices": [
            {"productId": PRODUCT, "text": "CHF 28.90", "visible": True,
             "withinProductInformationDetails": False, "insideRecommendation": True},
        ], "stickyProductPrices": ["CHF 28.90"]}
        result = self.check_gate(fixture)
        self.assertFalse(result["passed"])
        self.assertEqual(result["reason"], "main_product_price_missing_or_invisible")

    def test_main_selector_is_nested_under_actual_pdp_details_ancestor(self):
        self.assertEqual(main_price_selector(PRODUCT),
                         f'[data-testid="product-information-details"] product-price[data-product-id="{PRODUCT}"] .price')

    def test_canonical_product_urls_reject_query_fragment_userinfo_and_ports(self):
        self.assertEqual(validate_product_url("https://luxestyle.ch/products/example"), "https://luxestyle.ch/products/example")
        for url in (
            "https://user:pass@luxestyle.ch/products/example",
            "https://luxestyle.ch:8443/products/example",
            "https://luxestyle.ch/products/example?x=1",
            "https://luxestyle.ch/products/example#variant",
            "http://luxestyle.ch/products/example",
            "https://evil.example/products/example",
        ):
            with self.subTest(url=url), self.assertRaises(ValueError):
                validate_product_url(url)

    def test_redirect_handler_rejects_untrusted_targets_before_following(self):
        handler = StrictRedirectHandler()
        request = Request("https://luxestyle.ch/products/example")
        # redirect_request performs validation before its superclass constructs
        # a follow-up request; no network/socket is involved.
        for target in (
            "https://evil.example/steal",
            "//evil.example/steal",
            "http://luxestyle.ch/products/example",
            "https://user:pass@luxestyle.ch/products/example",
            "https://luxestyle.ch:8443/products/example",
            "https://luxestyle.ch/products/example#fragment",
            "https://luxestyle.ch/cart",
        ):
            with self.subTest(target=target), self.assertRaises(ValueError):
                handler.redirect_request(request, None, 302, "Found", {}, target)
        accepted = handler.redirect_request(request, None, 302, "Found", {}, "/products/example?redirected=1")
        self.assertEqual(accepted.full_url, "https://luxestyle.ch/products/example?redirected=1")

    def test_browser_request_guard_rejects_unsafe_initial_urls(self):
        for url in (
            "http://luxestyle.ch/products/example",
            "https://evil.example/products/example",
            "https://luxestyle.ch:8443/products/example",
            "https://user@luxestyle.ch/products/example",
            "https://luxestyle.ch/cart",
        ):
            with self.subTest(url=url), self.assertRaises(ValueError):
                validate_browser_request_url(url)

    def test_browser_route_disables_redirect_following_and_aborts_3xx(self):
        class FakeRequest:
            method = "GET"
            url = "https://luxestyle.ch/products/example"

        class FakeResponse:
            status = 302

        class FakeRoute:
            request = FakeRequest()
            def __init__(self):
                self.fetch_kwargs = None
                self.aborted = False
                self.fulfilled = False
            def fetch(self, **kwargs):
                self.fetch_kwargs = kwargs
                return FakeResponse()
            def abort(self):
                self.aborted = True
            def fulfill(self, **kwargs):
                self.fulfilled = True

        route, blocked = FakeRoute(), []
        guarded_browser_route(route, blocked)
        self.assertEqual(route.fetch_kwargs, {"max_redirects": 0})
        self.assertTrue(route.aborted)
        self.assertFalse(route.fulfilled)
        self.assertEqual(blocked[0]["reason"], "redirect_rejected")

    def test_browser_route_fulfills_safe_response_without_continue(self):
        class FakeRequest:
            method = "GET"
            url = "https://cdn.shopify.com/s/files/example.jpg"

        class FakeResponse:
            status = 200

        class FakeRoute:
            request = FakeRequest()
            def __init__(self):
                self.fulfilled_with = None
                self.continued = False
            def fetch(self, **kwargs):
                self.fetch_kwargs = kwargs
                return FakeResponse()
            def abort(self):
                raise AssertionError("safe response unexpectedly aborted")
            def fulfill(self, **kwargs):
                self.fulfilled_with = kwargs["response"]

        route = FakeRoute()
        guarded_browser_route(route, [])
        self.assertEqual(route.fetch_kwargs, {"max_redirects": 0})
        self.assertIsInstance(route.fulfilled_with, FakeResponse)

    def test_cache_buster_uses_url_components_not_string_concatenation(self):
        result = cache_busted_url("https://luxestyle.ch/products/example", suffix=".js", stamp="test", product_id=PRODUCT)
        self.assertEqual(result, f"https://luxestyle.ch/products/example.js?qa_cache_bust=test-{PRODUCT}-.js")

    def test_explicit_target_input_is_bounded_and_deduplicated(self):
        self.assertEqual(validate_targets({"products": [{"productId": PRODUCT, "selectedOptions": ["Kirsche 1400ml"]}]})[0]["productId"], PRODUCT)
        with self.assertRaises(ValueError):
            validate_targets({"products": [{"productId": PRODUCT, "selectedOptions": ["x"]}] * 5})
        with self.assertRaises(ValueError):
            validate_targets({"products": [{"productId": PRODUCT, "selectedOptions": ["x"]}] * 2})


if __name__ == "__main__":
    unittest.main()
