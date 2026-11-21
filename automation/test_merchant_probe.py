"""Offline regression tests for the isolated Merchant product reader."""
import contextlib
import io
import json
import unittest
from unittest.mock import Mock

from automation import merchant_probe as probe


class FakeAuthHttpResponse:
    def __init__(self, status_code, content):
        self.status_code = status_code
        self.content = content
        self.headers = {}


class FakeAuthSession:
    def __init__(self, response):
        self.response = response
        self.calls = []
        self.mounted = []
        self.trust_env = None
    def mount(self, prefix, adapter):
        self.mounted.append((prefix, adapter))
    def request(self, method, url, **kwargs):
        self.calls.append((method, url, kwargs))
        return self.response


class FakeGoogleAuthResponse:
    def __init__(self, response):
        self.status = response.status_code
        self.data = response.content


class FakeGoogleAuthRequest:
    def __init__(self, session):
        self.session = session
    def __call__(self, url, method="GET", body=None, headers=None, timeout=None, **kwargs):
        return FakeGoogleAuthResponse(self.session.request(method, url, data=body, headers=headers, timeout=timeout, **kwargs))


class FakeHTTPAdapter:
    def __init__(self, max_retries):
        self.max_retries = max_retries


class FakeRequestsModule:
    def __init__(self, session):
        self._session = session
    def Session(self):
        return self._session


class MerchantReaderTests(unittest.TestCase):
    def setUp(self):
        self.case = "nagellack-1"
        self.env = {"MERCHANT_ID": probe.ACCOUNT_ID, "REGISTRIEREN": "false"}
        self.product_calls = 0
        self.urls = []

    def account(self):
        return {"accountId": probe.ACCOUNT_ID, "accountName": probe.ACCOUNT_NAME, "name": f"accounts/{probe.ACCOUNT_ID}"}

    def product(self):
        spec = probe.CASES[self.case]
        name = f"accounts/{probe.ACCOUNT_ID}/products/{probe._encoded_product_key(spec)}"
        return {
            "name": name,
            "offerId": spec["offerId"],
            "contentLanguage": spec["contentLanguage"],
            "feedLabel": spec["feedLabel"],
            "dataSource": "accounts/5797470070/dataSources/123",
            "productAttributes": {
                "title": "fixture title", "link": "https://shop.example/p", "imageLink": "https://shop.example/i.jpg",
                "price": {"amountMicros": "12000000", "currencyCode": "CHF"}, "availability": "in_stock",
            },
            "productStatus": {
                "itemLevelIssues": [{"code": "fixture_issue"}],
                "destinationStatuses": [{"reportingContext": "SHOPPING_ADS", "approvedCountries": [], "pendingCountries": [], "disapprovedCountries": ["CH"]}],
            },
        }

    def transport(self, account=None, product=None):
        account = self.account() if account is None else account
        product = self.product() if product is None else product

        def get(url, **kwargs):
            self.urls.append((url, kwargs))
            if "/accounts/v1/" in url:
                return Mock(status_code=200, json=Mock(return_value=account))
            self.product_calls += 1
            if isinstance(product, BaseException):
                raise product
            if isinstance(product, int):
                return Mock(status_code=product, json=Mock(side_effect=AssertionError("must not parse error body")))
            return Mock(status_code=200, json=Mock(return_value=product))
        return get

    def run_reader(self, get):
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            code = probe._reader(self.case, self.env, "synthetic-token", get)
        lines = out.getvalue().strip().splitlines()
        return code, json.loads(lines[-1]) if lines else None

    def test_success_binds_csv_components_and_emits_only_selected_fields(self):
        code, result = self.run_reader(self.transport())
        self.assertEqual(code, 0)
        self.assertEqual(result["marker"], "LUXE_MERCHANT_READ_V1")
        self.assertEqual(result["offerId"], probe.CASES[self.case]["offerId"])
        self.assertEqual(result["issuecodes"], ["fixture_issue"])
        self.assertEqual(result["result"], "read")
        self.assertNotIn("state", result["destinations"][0])
        self.assertEqual(result["destinations"][0]["disapprovedCountries"], ["CH"])
        self.assertEqual(result["dataSource"], "accounts/5797470070/dataSources/123")
        self.assertEqual(set(result), {"marker", "accountId", "accountName", "case", "resourceName", "offerId", "lang", "feedLabel", "dataSource", "title", "link", "imageLink", "price", "availability", "result", "destinations", "destinationState", "actualstatus", "issueState", "issuecodes"})
        self.assertEqual(len(self.urls), 2)
        self.assertTrue(all(x[0].startswith("https://merchantapi.googleapis.com/") for x in self.urls))
        self.assertTrue(all(x[1]["timeout"] == 20 and x[1]["allow_redirects"] is False for x in self.urls))


    def test_all_three_whitelisted_case_urls_and_response_identities(self):
        for case, spec in probe.CASES.items():
            with self.subTest(case=case):
                self.case = case
                self.urls.clear()
                self.product_calls = 0
                code, result = self.run_reader(self.transport())
                expected_key = probe._encoded_product_key(spec)
                self.assertEqual(code, 0)
                self.assertEqual(result["offerId"], spec["offerId"])
                self.assertEqual(result["lang"], spec["contentLanguage"])
                self.assertEqual(result["feedLabel"], spec["feedLabel"])
                self.assertEqual(self.urls[0][0], f"https://{probe.API_HOST}/accounts/v1/accounts/{probe.ACCOUNT_ID}")
                self.assertEqual(self.urls[1][0], f"https://{probe.API_HOST}/products/v1/accounts/{probe.ACCOUNT_ID}/products/{expected_key}")

    def test_foreign_datasource_account_is_rejected(self):
        bad = self.product() | {"dataSource": "accounts/9999999999/dataSources/123"}
        code, result = self.run_reader(self.transport(product=bad))
        self.assertEqual((code, result["errorCode"]), (2, "product_response_mismatch"))
        self.assertNotIn("dataSource", result)

    def test_missing_or_null_product_status_is_unknown(self):
        for status in (None, {}, {"itemLevelIssues": [], "destinationStatuses": None}, {"itemLevelIssues": None, "destinationStatuses": []}, {"itemLevelIssues": [], "destinationStatuses": []}):
            with self.subTest(status=status):
                product = self.product() | {"productStatus": status}
                code, result = self.run_reader(self.transport(product=product))
                self.assertEqual(code, 2)
                self.assertEqual(result["result"], "partial_read")
                issues = status.get("itemLevelIssues") if isinstance(status, dict) else None
                self.assertEqual(result["issuecodes"], issues if isinstance(issues, list) else None)
                self.assertEqual(result["issueState"], "known" if isinstance(issues, list) else "unknown")
                self.assertIsNone(result["destinations"])
                self.assertIsNone(result["actualstatus"])
                self.assertEqual(result["title"], "fixture title")
                self.urls.clear()
                self.product_calls = 0

    def test_documented_destination_shape_without_country_fields_is_partial_unknown(self):
        product = self.product() | {"productStatus": {"itemLevelIssues": [], "destinationStatuses": [{"reportingContext": "SHOPPING_ADS"}]}}
        code, result = self.run_reader(self.transport(product=product))
        self.assertEqual(code, 2)
        self.assertEqual(result["result"], "partial_read")
        self.assertEqual(result["destinationState"], "unknown")
        self.assertIsNone(result["actualstatus"])
        self.assertIsNone(result["destinations"][0]["approvedCountries"])
        self.assertIsNone(result["destinations"][0]["pendingCountries"])
        self.assertIsNone(result["destinations"][0]["disapprovedCountries"])
        self.assertEqual(result["title"], "fixture title")

    def test_credentials_refresh_uses_one_bounded_oauth_post(self):
        response = FakeAuthHttpResponse(200, b'{"access_token":"synthetic-access"}')
        session = FakeAuthSession(response)
        calls = []

        class Credentials:
            token = None
            def refresh(self, transport):
                result = transport(probe.AUTH_URL, method="POST", body=b"synthetic assertion", headers={"Content-Type": "application/x-www-form-urlencoded"})
                if result.status != 200:
                    raise RuntimeError("synthetic refresh rejection")
                self.token = json.loads(result.data)["access_token"]

        class FakeServiceAccountCredentials:
            factory_calls = []
            @classmethod
            def from_service_account_info(cls, service_account_info, scopes=None):
                cls.factory_calls.append((service_account_info, scopes))
                return Credentials()

        raw = json.dumps({"token_uri": probe.AUTH_URL, "private_key": "synthetic", "client_email": "synthetic@example.invalid"})
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            code = probe._reader_with_credentials(self.case, self.env, raw, FakeServiceAccountCredentials.from_service_account_info, lambda: probe._make_google_auth_transport(FakeGoogleAuthRequest, FakeRequestsModule(session), FakeHTTPAdapter), self.transport())
        self.assertEqual(FakeServiceAccountCredentials.factory_calls[0][1], [probe.SCOPE])
        self.assertEqual(code, 0)
        self.assertEqual(json.loads(out.getvalue())["marker"], "LUXE_MERCHANT_READ_V1")
        self.assertEqual(len(session.calls), 1)
        self.assertEqual(len(self.urls), 2)
        self.assertEqual(session.calls[0][0:2], ("POST", probe.AUTH_URL))
        self.assertFalse(session.trust_env)
        self.assertEqual(session.mounted[0][0], "https://")
        self.assertEqual(session.mounted[0][1].max_retries, 0)
        self.assertEqual(session.calls[0][2]["timeout"], 20)
        self.assertFalse(session.calls[0][2]["allow_redirects"])

    def test_oauth_redirect_failure_stops_before_api_and_is_not_followed(self):
        session = FakeAuthSession(FakeAuthHttpResponse(302, b"SECRET redirect"))
        request = FakeGoogleAuthRequest(session)
        class Credentials:
            token = None
            def refresh(self, transport):
                result = transport(probe.AUTH_URL, method="POST", body=b"assertion")
                if result.status != 200:
                    raise RuntimeError("SECRET oauth response")
        raw = json.dumps({"token_uri": probe.AUTH_URL})
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            code = probe._reader_with_credentials(self.case, self.env, raw, lambda info, scopes=None: Credentials(), lambda: probe._one_shot_oauth_request(request), self.transport())
        self.assertEqual(code, 2)
        self.assertEqual(len(session.calls), 1)
        self.assertEqual(self.urls, [])
        self.assertNotIn("SECRET", out.getvalue())
        self.assertFalse(session.calls[0][2]["allow_redirects"])

    def test_second_oauth_attempt_is_rejected_before_network(self):
        session = FakeAuthSession(FakeAuthHttpResponse(200, b'{"access_token":"first"}'))
        transport = probe._one_shot_oauth_request(FakeGoogleAuthRequest(session))
        transport(probe.AUTH_URL, method="POST")
        with self.assertRaises(probe.AuthTransportError):
            transport(probe.AUTH_URL, method="POST")
        self.assertEqual(len(session.calls), 1)

    def test_oauth_wrong_host_and_method_are_rejected_before_network(self):
        session = FakeAuthSession(FakeAuthHttpResponse(200, b"{}"))
        transport = probe._one_shot_oauth_request(FakeGoogleAuthRequest(session))
        with self.assertRaises(probe.AuthTransportError):
            transport("https://attacker.example/token", method="POST")
        with self.assertRaises(probe.AuthTransportError):
            transport(probe.AUTH_URL, method="GET")
        self.assertEqual(session.calls, [])

    def test_bad_token_uri_is_rejected_before_credential_factory_or_transport(self):
        invoked = []
        raw = json.dumps({"token_uri": "https://attacker.example/token"})
        bearer, error = probe._refresh_bearer(raw, lambda *args: invoked.append("credentials"), lambda: invoked.append("transport"))
        self.assertEqual((bearer, error), (None, "auth_endpoint_blocked"))
        self.assertEqual(invoked, [])

    def test_auth_failure_does_not_reach_merchant_api(self):
        session = FakeAuthSession(FakeAuthHttpResponse(503, b"SECRET error body"))
        request = FakeGoogleAuthRequest(session)
        class Credentials:
            token = None
            def refresh(self, transport):
                result = transport(probe.AUTH_URL, method="POST", body=b"assertion")
                if result.status != 200:
                    raise RuntimeError("SECRET response body")
        raw = json.dumps({"token_uri": probe.AUTH_URL})
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            code = probe._reader_with_credentials(self.case, self.env, raw, lambda info, scopes=None: Credentials(), lambda: probe._one_shot_oauth_request(request), self.transport())
        self.assertEqual(code, 2)
        self.assertEqual(len(session.calls), 1)
        self.assertEqual(self.urls, [])
        self.assertNotIn("SECRET", out.getvalue())

    def test_account_response_mismatch_stops_before_product(self):
        bad = self.account() | {"accountName": "Other account"}
        code, result = self.run_reader(self.transport(account=bad))
        self.assertEqual((code, result["errorCode"]), (2, "account_response_mismatch"))
        self.assertEqual(len(self.urls), 1)
        self.assertEqual(self.product_calls, 0)

    def test_offer_mismatch_is_unknown_and_does_not_expose_product_data(self):
        bad = self.product() | {"offerId": "foreign-offer"}
        code, result = self.run_reader(self.transport(product=bad))
        self.assertEqual((code, result["errorCode"]), (2, "product_response_mismatch"))
        self.assertNotIn("title", result)
        self.assertEqual(len(self.urls), 2)

    def test_registration_flag_is_blocked_before_transport(self):
        self.env["REGISTRIEREN"] = "true"
        code, result = self.run_reader(self.transport())
        self.assertEqual((code, result["errorCode"]), (2, "registration_blocked"))
        self.assertEqual(self.urls, [])

    def test_wrong_account_input_is_blocked_before_transport(self):
        self.env["MERCHANT_ID"] = "5797470071"
        code, result = self.run_reader(self.transport())
        self.assertEqual((code, result["errorCode"]), (2, "account_input_mismatch"))
        self.assertEqual(self.urls, [])

    def test_redirect_is_not_followed(self):
        code, result = self.run_reader(self.transport(product=302))
        self.assertEqual((code, result["errorCode"]), (2, "redirect_blocked"))
        self.assertEqual(len(self.urls), 2)
        self.assertFalse(self.urls[-1][1]["allow_redirects"])

    def test_429_stops_without_retry(self):
        code, result = self.run_reader(self.transport(product=429))
        self.assertEqual((code, result["errorCode"]), (2, "http_429"))
        self.assertEqual(len(self.urls), 2)
        self.assertEqual(self.product_calls, 1)

    def test_auth_failures_stop_without_fallback_or_retry(self):
        for status in (401, 403):
            with self.subTest(status=status):
                self.urls.clear()
                self.product_calls = 0
                code, result = self.run_reader(self.transport(product=status))
                self.assertEqual((code, result["errorCode"]), (2, f"http_{status}"))
                self.assertEqual(len(self.urls), 2)
                self.assertEqual(self.product_calls, 1)

    def test_timeout_is_unknown_without_retry(self):
        code, result = self.run_reader(self.transport(product=TimeoutError("SECRET payload")))
        self.assertEqual((code, result["errorCode"]), (2, "timeout"))
        self.assertEqual(len(self.urls), 2)
        self.assertNotIn("SECRET", json.dumps(result))

    def test_nodata_is_unknown_without_fallback(self):
        code, result = self.run_reader(self.transport(product=404))
        self.assertEqual((code, result["errorCode"]), (2, "http_unknown"))
        self.assertEqual(len(self.urls), 2)
        self.assertNotIn("shoppingcontent.googleapis.com", " ".join(url for url, _ in self.urls))

    def test_transport_exception_text_is_never_emitted(self):
        code, result = self.run_reader(self.transport(product=RuntimeError("secret token and customer data")))
        self.assertEqual((code, result["errorCode"]), (2, "transport"))
        self.assertNotIn("secret", json.dumps(result).lower())



class CssProductLimitTests(unittest.TestCase):
    def setUp(self):
        self.env = {"MERCHANT_ID": probe.ACCOUNT_ID, "REGISTRIEREN": "false"}
        self.resource = f"accounts/{probe.ACCOUNT_ID}/limits/products~ADS_EEA"
        self.account = {"accountId": probe.ACCOUNT_ID, "accountName": probe.ACCOUNT_NAME,
                        "name": f"accounts/{probe.ACCOUNT_ID}"}
        self.limit = {"name": self.resource, "products": {"scope": "ADS_EEA", "limit": "150000"}}

    def read(self, account=None, limit=None, status=200):
        def reply(code, body):
            return Mock(status_code=code, json=Mock(return_value=body))

        send = Mock(side_effect=[
            reply(200, self.account if account is None else account),
            reply(status, self.limit if limit is None else limit),
        ])
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            code = probe._reader(probe.CSS_LIMIT_CASE, self.env, "stub-secret", send)
        return code, json.loads(output.getvalue()), send

    def test_css_limit_is_read_only_and_reports_no_usage(self):
        code, result, send = self.read()
        self.assertEqual(code, 0)
        self.assertEqual(result["scope"], "ADS_EEA")
        self.assertEqual(result["productLimit"], "150000")
        self.assertNotIn("quotaUsage", result)
        self.assertNotIn("stub-secret", json.dumps(result))
        self.assertEqual([c.args[0] for c in send.call_args_list], [
            f"https://merchantapi.googleapis.com/accounts/v1/accounts/{probe.ACCOUNT_ID}",
            f"https://merchantapi.googleapis.com/quota/v1/{self.resource}",
        ])
        self.assertTrue(all(c.kwargs["allow_redirects"] is False for c in send.call_args_list))

    def test_wrong_account_never_reads_limit(self):
        code, result, send = self.read(account={**self.account, "accountName": "Other"})
        self.assertEqual((code, result["errorCode"], send.call_count), (2, "account_response_mismatch", 1))

    def test_scope_and_value_are_validated(self):
        for scope, value in [("FREE_LISTINGS", "150000"), ("ADS_EEA", "-1"),
                             ("ADS_EEA", "unknown"), ("ADS_EEA", 150000)]:
            with self.subTest(scope=scope, value=value):
                response = {"name": self.resource, "products": {"scope": scope, "limit": value}}
                code, result, _ = self.read(limit=response)
                self.assertEqual((code, result["errorCode"]), (2, "limit_response_mismatch"))

    def test_http_failures_never_become_empty_or_zero(self):
        for status, field in [(401, "http_401"), (403, "http_403"), (429, "http_429"),
                              (302, "redirect_blocked")]:
            with self.subTest(status=status):
                code, result, _ = self.read(status=status)
                self.assertEqual((code, result["errorCode"]), (2, field))
                self.assertNotIn("productLimit", result)

    def test_registration_is_blocked_for_limit_mode(self):
        self.env["REGISTRIEREN"] = "true"
        code, result, send = self.read()
        self.assertEqual((code, result["errorCode"], send.call_count), (2, "registration_blocked", 0))



class MerchantSourceTests(unittest.TestCase):
    def test_source_response_omits_source_credentials_and_file_settings(self):
        source = {"name": f"accounts/{probe.ACCOUNT_ID}/dataSources/123", "dataSourceId": "123",
                  "input": "API", "fileInput": {"privateUrl": "mock-secret"},
                  "primaryProductDataSource": {"contentLanguage": "de", "countries": ["CH", "LI"],
                      "destinations": [{"destination": "SHOPPING_ADS", "state": "ENABLED"}]}}
        query = Mock(return_value=Mock(status_code=200,
                    json=Mock(return_value={"dataSources": [source], "nextPageToken": "hidden-token"})))
        captured = io.StringIO()
        with contextlib.redirect_stdout(captured):
            code = probe._read_data_sources("mock-token", query)
        self.assertEqual(code, 0)
        result = json.loads(captured.getvalue())
        self.assertTrue(result["truncated"])
        self.assertEqual(result["sources"][0]["countries"], ["CH", "LI"])
        self.assertEqual(result["sources"][0]["destinations"],
                         [{"destination": "SHOPPING_ADS", "state": "ENABLED"}])
        self.assertNotIn("secret", captured.getvalue())
        self.assertNotIn("hidden-token", captured.getvalue())
        self.assertEqual(query.call_count, 1)
        self.assertEqual(query.call_args.args[0],
                         f"https://merchantapi.googleapis.com/datasources/v1/accounts/{probe.ACCOUNT_ID}/dataSources?pageSize=10")
        self.assertFalse(query.call_args.kwargs["allow_redirects"])

    def test_untrusted_source_account_cannot_be_reported(self):
        data = {"dataSources": [{"name": "accounts/1/dataSources/123", "dataSourceId": "123"}]}
        query = Mock(return_value=Mock(status_code=200, json=Mock(return_value=data)))
        captured = io.StringIO()
        with contextlib.redirect_stdout(captured):
            code = probe._read_data_sources("mock-token", query)
        self.assertEqual(code, 2)
        self.assertEqual(json.loads(captured.getvalue())["errorCode"], "data_source_identity_mismatch")

    def test_failed_source_read_is_not_an_empty_list(self):
        query = Mock(return_value=Mock(status_code=429))
        captured = io.StringIO()
        with contextlib.redirect_stdout(captured):
            code = probe._read_data_sources("mock-token", query)
        self.assertEqual(code, 2)
        result = json.loads(captured.getvalue())
        self.assertEqual(result["errorCode"], "http_429")
        self.assertNotIn("sourceCount", result)



class ShoppingIssueReportTests(unittest.TestCase):
    def report(self, payload, status=200):
        send = Mock(return_value=Mock(status_code=status, json=Mock(return_value=payload)))
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            rc = probe._read_shopping_report("stub-secret", send)
        return rc, [json.loads(line) for line in output.getvalue().splitlines()], send

    def test_report_sample_is_bounded_to_shopping_ads(self):
        rc, records, send = self.report({"results": [{"productView": {
            "offerId": "sku-123", "languageCode": "de", "feedLabel": "CH",
            "itemIssues": [{"type": {"code": "mock_css_issue"}}],
        }}], "nextPageToken": "hidden-token"})
        self.assertEqual(rc, 0)
        self.assertEqual(records[0]["issueCodes"], ["mock_css_issue"])
        self.assertEqual(records[-1]["rowCount"], 1)
        self.assertTrue(records[-1]["nextPageExists"])
        self.assertNotIn("hidden-token", json.dumps(records))
        self.assertNotIn("stub-secret", json.dumps(records))
        self.assertEqual(send.call_count, 1)
        self.assertEqual(send.call_args.args[0],
                         f"https://merchantapi.googleapis.com/reports/v1/accounts/{probe.ACCOUNT_ID}/reports:search")
        self.assertEqual(send.call_args.kwargs["json"]["pageSize"], 25)
        self.assertIn("reporting_context = 'SHOPPING_ADS'", send.call_args.kwargs["json"]["query"])
        self.assertIn("LIMIT 25", send.call_args.kwargs["json"]["query"])
        self.assertFalse(send.call_args.kwargs["allow_redirects"])

    def test_permission_failure_has_no_row_count(self):
        rc, records, _ = self.report({}, status=403)
        self.assertEqual((rc, records[0]["errorCode"]), (2, "http_403"))
        self.assertNotIn("rowCount", records[0])

    def test_report_case_requires_matching_account_before_post(self):
        get = Mock(return_value=Mock(status_code=200, json=Mock(return_value={
            "accountId": probe.ACCOUNT_ID, "accountName": "Other", "name": f"accounts/{probe.ACCOUNT_ID}",
        })))
        post = Mock()
        env = {"MERCHANT_ID": probe.ACCOUNT_ID, "REGISTRIEREN": "false"}
        with contextlib.redirect_stdout(io.StringIO()):
            code = probe._reader(probe.REPORT_CASE, env, "stub-secret", get, post)
        self.assertEqual(code, 2)
        post.assert_not_called()


if __name__ == "__main__":
    unittest.main()
