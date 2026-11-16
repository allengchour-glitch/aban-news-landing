# R265 targeted product QA helper

`verify_product_details.py` is an isolated R265 copy of the R264 verifier with explicit JSON target input (1–4 product IDs) and a fail-closed main-product price gate. It reads only exact `product-price[data-product-id="<ID>"] .price` nodes nested under `[data-testid="product-information-details"]`, excluding recommendation and product-card nodes, requires a visible CHF amount and exact selected variant ID, and never falls back to sticky or recommendation prices. CHF parsing requires the complete string to match a CHF amount with zero or two decimal digits; malformed suffixes, multiple amounts, and extra decimal digits remain unknown and fail. Every urllib redirect is validated before following it (HTTPS, exact shop host, default port, no userinfo or fragment); canonical product URLs reject query strings and fragments. Playwright browser requests are fetched with redirects disabled; any 3xx response is aborted, and only safe GET responses are fulfilled back to the page.

It retains bounded HTML/`.js`, JSON-LD, body-projection, and 360/390-pixel checks. Browser requests are GET-only, and cart, checkout, account, login, registration, consent, Shop Pay, and non-allowlisted hosts are blocked. Public requests require both an explicit targets file and `--go`; no public call was run in this task.

Example after root review: `python verify_product_details.py --targets /path/to/explicit-targets.json --native-root /path/to/local-native-snapshots --out /path/to/local-output --go`.

Offline regression: `python -m unittest -v test_price_gate.py` (18 passed). `test-results.json` records the cases and hashes. `r264-to-r265.patch` is the review diff; the R264 source file was left unchanged.
