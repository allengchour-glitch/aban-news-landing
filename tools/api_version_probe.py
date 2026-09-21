"""Misst per Introspektion, welche Felder/Argumente der Typen, die unsere Skripte nutzen,
in 2026-01 gegenueber 2025-10 (= heute die effektiv bediente Version) fehlen."""
import json, subprocess, sys, re, glob
TOK = open("/tmp/cj_shop_token.txt").read().strip()
SHOP = "au3j0y-hq.myshopify.com"
def gql(ver, q):
    out = subprocess.run(["curl", "-s", "--max-time", "60", "-X", "POST",
        f"https://{SHOP}/admin/api/{ver}/graphql.json", "-H", "X-Shopify-Access-Token: " + TOK,
        "-H", "Content-Type: application/json", "-d", json.dumps({"query": q})], capture_output=True, text=True).stdout
    return json.loads(out)
TYPES = ["QueryRoot", "Mutation", "Product", "ProductVariant", "ProductInput", "ProductSetInput", "ProductUpdateInput",
         "Collection", "CollectionInput", "Order", "LineItem", "Fulfillment", "FulfillmentOrder", "File", "MediaImage",
         "Video", "GenericFile", "Metafield", "MetafieldsSetInput", "InventoryItem", "InventoryLevel", "Shop",
         "OnlineStoreTheme", "OnlineStoreThemeFile", "Page", "Article", "Blog", "UrlRedirect", "Menu", "MenuItem",
         "Customer", "Publication", "Market", "ShopLocale", "Translation", "ProductVariantsBulkInput",
         "DiscountAutomaticNode", "DeliveryProfile", "DeliveryZone", "AbandonedCheckout", "OrderTransaction",
         "Refund", "Image", "SEO", "ProductOption", "SellingPlanGroup", "StagedUploadInput", "FileCreateInput",
         "FileUpdateInput", "CreateMediaInput", "ProductPublishInput", "PublicationInput", "PageUpdateInput",
         "ArticleUpdateInput", "OnlineStoreThemeFilesUpsertFileInput", "UrlRedirectInput", "BulkOperation"]
def felder(ver):
    res = {}
    for i in range(0, len(TYPES), 10):
        part = TYPES[i:i+10]
        q = "{" + " ".join(f'{t.lower()}_{j}: __type(name:"{t}"){{name fields{{name args{{name}}}} inputFields{{name}}}}' for j, t in enumerate(part)) + "}"
        d = gql(ver, q)
        for k, v in (d.get("data") or {}).items():
            if not v: continue
            fs = {}
            for f in (v.get("fields") or []): fs[f["name"]] = {a["name"] for a in f.get("args") or []}
            for f in (v.get("inputFields") or []): fs[f["name"]] = set()
            res[v["name"]] = fs
    return res
alt, neu = felder("2025-10"), felder("2026-01")
print("Typen alt/neu:", len(alt), len(neu))
weg = []   # (Typ, Feld oder Feld.arg)
for t, fs in alt.items():
    if t not in neu: weg.append((t, "<TYP WEG>")); continue
    for f, args in fs.items():
        if f not in neu[t]: weg.append((t, f)); continue
        for a in args - neu[t][f]: weg.append((t, f"{f}(arg {a})"))
print("In 2026-01 entfernt:", len(weg))
# Gegenprobe im Code: wird der Name bei uns benutzt?
code = ""
for pat in ["automation/**/*.py", "automation/**/*.mjs", "tools/**/*.py", "tools/**/*.mjs", "server/**/*.mjs", "dropship/*.mjs", "dropship/*.py"]:
    for fn in glob.glob(pat, recursive=True):
        try: code += "\n" + open(fn, errors="ignore").read()
        except Exception: pass
for t, f in weg:
    name = re.sub(r'\(arg .*\)', '', f)
    if f == "<TYP WEG>": name = t
    n = len(re.findall(r'\b' + re.escape(name) + r'\b', code))
    print(f"  {'⚠️' if n else '  '} {t}.{f}  — im Code {n}x")
