# Eppix Labs: SEO release and 30-day sales plan

Period: **19 October–18 November 2026**. US and Canada have equal implementation priority. This is a measurable launch plan, not a promise of rankings or revenue.

## 23 October follow-up: prepare for November sales

This follow-up builds on the earlier release. The Search Console numbers below remain the **19 October snapshot**; they have not been refreshed during this code change.

- Product summaries and search descriptions now use each regional catalog's actual strengths. Product comparison tables expose single-unit prices, listing availability and reports matched to the exact strength. A missing match prompts a support request; historical reports are not presented as a guarantee of the lot to be fulfilled.
- The ten priority pages are Retatrutide, Tirzepatide, Ipamorelin, Thymosin Alpha-1 and BPC-157 in each market. Their procurement notes address specific comparison mistakes. Homepage and catalog links expose these pages; related research articles and certificate pages lead back to the appropriate regional product.
- Existing `/research-peptides-usa`, `/ca/research-peptides-canada` and both `/peptide-coa-verification` routes now contain original ordering/report checklists and an example drawn from the regional BPC-157 catalog. These replace the captured content at those URLs. Other captured articles still need editorial review; this is not a complete originality audit.
- Homepage introductions and catalog counts are generated from the regional data. Report metadata identifies individual lot codes. Topic hubs no longer claim to be articles. Collection ItemList markup describes only visible product cards, including the correct Canadian pagination.
- The sitemap includes canonical catalog/report pagination and product images. Invalid pagination is noindex. No artificial modification dates, reviews or sales figures are added.
- `audit:seo` now audits prepared storefront HTML and computed metadata, with captured titles retained for comparison in the report. `verify:seo` checks all ten priority pages plus guides and crawl states against a running production build.
- The release check found the installed Next.js 16.4.0 affected by the [14 October security advisory](https://nextjs.org/blog/nextjs-security-update-october-14-2026). The dependency and lockfile are patched to 16.4.1; installation's audit reports zero vulnerabilities.

| Dates | Work after publication | Evidence to record |
| --- | --- | --- |
| 24–31 October | Publish and verify this release. Inspect the ten priority product URLs and four guide URLs in Search Console; request indexing where needed. Check one real order and email/payment handoff with the owner. | Release date, selected canonical, index status, received notifications and payment instructions |
| 1–7 November | Compare query/page/country reports with the earlier snapshot. Fix valuable URLs still excluded; review whether searchers reach the matching regional product. | Relevant impressions, clicks, CTR and landing pages, separated by US/Canada |
| 8–14 November | Improve the pages receiving qualified visits using actual buyer questions. Investigate cart and unpaid-order drop-offs; follow up on awaiting-payment orders. | Product visits, available cart/checkout events, submitted orders, confirmed paid orders |
| 15–30 November | Allocate effort to pages producing qualified enquiries and paid orders. Update genuine stock/report details and refine the payment process where buyers drop off. | Paid revenue and fulfilled orders, separately from unpaid submissions |

Validate catalog prices, stock and assigned lots against business records. The new comparisons use the same captured regional catalog as the storefront; checkout still revalidates against Supabase. Changing database prices alone does not refresh this captured catalog. No new live Search Console access, analytics account, advertising spend, customer outreach or deployment is implied by these local source changes.

The content and linking work follows [Google's originality guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) and [ecommerce navigation guidance](https://developers.google.com/search/docs/specialty/ecommerce/help-google-understand-your-ecommerce-site-structure). Pagination retains [self-referencing canonical URLs](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading).

Local validation on 23 October: Next.js 16.4.1 production build and TypeScript passed; all 92 unit tests passed; 32 production HTTP page/state checks passed, including equality between visible and structured offer prices/status. The prepared-content audit covered 536 captured records with no duplicate titles, missing descriptions or missing main headings in either region. All 562 sitemap URLs passed HTTP status, canonical and indexability checks; sitemap GET/HEAD, robots discovery and private-page noindex checks also passed. The sitemap includes six pagination URLs and 133 image entries. No browser surface was connected for a fresh visual review. These results describe the local release; production publication and Search Console recrawling remain separate steps.

## What the live accounts actually show

Read from the owner's [Search Console property](https://search.google.com/search-console?resource_id=sc-domain%3Aeppixlabsshop.com) on 19 October:

| Measure | Baseline |
| --- | --- |
| Search clicks | 9 |
| Impressions | 1.68k |
| CTR | 0.5% |
| Average position | 43.9 |
| US | 4 clicks / 491 impressions |
| Canada | 2 clicks / 1,072 impressions |
| Indexed URLs | 310 |
| Discovered, currently not indexed | 229 |
| Crawled, currently not indexed | 18 |
| Google chose another canonical | 3 |
| Redirect / noindex exclusions | 2 / 1 |

Performance report: 3-month filter selected, with available chart data from 9–17 October. Indexing report last updated 12 October. Do not interpret the figures as a full month of traffic. Search Console can lag, and not every exclusion is a fault.

The Sitemaps report already shows **Success**, 556 discovered pages, and a last read of 17 October for the canonical www sitemap. Its discovery mechanism is working. An older URL-inspection “temporary processing error” is not evidence that the current sitemap is broken.

Google's URL inspection of `/about` selected **https://www.eppixlabs.com/about**, despite the declared canonical being on this shop. That is direct evidence of a content-duplication problem, not a missing-canonical problem. Two other examples were `/ca/certificates-of-analysis/slnk-ca-26f-10` and `/certificates-of-analysis/pnc2-ca-26g-30`; their Google-selected canonical targets were not inspected. Keep legitimate published report provenance clear rather than pretending shared documents are original research by this shop.

Visible query opportunities include `retatrutide canada` (42 impressions), `buy retatrutide canada` (35), `buy ipamorelin` (31), `thymosin alpha 1 canada` (16), and `tirzepatide peptide canada` (16). These are observed impressions, **not keyword-volume estimates**. Use matching existing product pages rather than creating a page for every phrase. The informational query `are peptides legal` had 43 impressions; legal/regulatory content needs current primary sources and appropriate review, and is not the first sales-page priority.

## Implemented in this release

- Unique regional product metadata, social previews, corrected payment/FAQ descriptions, and large-image preview eligibility.
- Server-rendered Organization (including owner-supplied legal name **eppixlabs**), WebSite, Product/Offer, Article and breadcrumb structured data. USD/CAD and single-vial offers come from the same regional catalog used by the storefront. No invented reviews, ratings, street addresses, or certifications.
- Reciprocal regional alternates and sitemap language annotations. Real Canadian catalog pages 2–3 have their own canonical URLs. Sorting/search/filter combinations are noindex; strength selection canonicalizes to the product.
- A normal HTML product directory exposes all 76 US and 58 Canadian products, including products beyond the first Canadian catalog page. Product pages link directly to their published lot pages, laboratory verification, shipping and ordering support.
- An original About page for each market explains this store's actual ordering flow and business identity. The legal name and registration country were supplied by the owner, not checked against a registry. No dispatch address or support-hours claim was invented.
- Correct intrinsic dimensions for local raster images, async decoding, lazy loading for secondary images, and one prioritized lead image. This is an image-delivery improvement, not a measured Core Web Vitals score.
- Homepage payment copy and card logos now match the manual-payment checkout. Bulk discount text is capped at the implemented 20% tier.
- Funnel instrumentation: `view_item`, `add_to_cart`, `begin_checkout`, `order_submitted`. An order is **awaiting payment**, so `order_submitted` is not purchase revenue. Events contain no customer email, address, phone, form text or raw search query.
- Optional existing-property verification tokens, repeatable SEO checks, and an audit command.

## Measurement and sales dependencies

The existing [Vercel project](https://vercel.com/software333/eppixlabs/analytics) is **Hobby**. Page-view analytics are enabled. Vercel's custom-event dashboard requires Pro/Enterprise. This release adds the instrumentation but does not upgrade the account or create a working paid-event dashboard on Hobby. An already-loaded GA4 `gtag` can also receive these events; no GA4 property or measurement ID was supplied or configured. Until that choice is made, use Vercel landing-page/referrer/country reports and the private order ledger for the funnel's available evidence. [Vercel custom-event documentation](https://vercel.com/docs/analytics/custom-events).

Checkout saves orders and sends notifications; it does not collect payment. Someone must send valid payment instructions, confirm receipt and stock, and fulfill the order. Check real mailbox delivery and payment follow-up with an owner-approved order before spending on acquisition. No real customer order or payment is created by the SEO verification scripts. Confirmed paid revenue needs a payment/fulfillment record; it cannot be inferred from a checkout thank-you page.

The catalog and published reports originated in a reference capture. Confirm the stock, offer prices, report-to-lot correspondence, fulfillment claims, and rights to every published asset against the actual business before relying on those claims in promotion. Keep future catalog updates synchronized between captured storefront content and authoritative checkout data. Code cannot manufacture independent business evidence or validate physical stock.

Newsletter preferences are stored, but that is not an active marketing-email campaign. Affiliate applications are not evidence of a working payout system. Treat those as separate operational work.

## Days 1–3: release, discovery and a working buying path

1. Release and verify both homepages, the two About pages, each product template, sitemap, robots, regional currency, and Canadian pagination on the production hostname.
2. Check the canonical sitemap in Search Console; submit `https://www.eppixlabsshop.com/sitemap.xml` if needed. Run URL Inspection on the two homepages, About pages, and a small set of priority product URLs. Request indexing after the production changes are visible. Do not repeatedly submit every URL or treat a request as an indexing guarantee.
3. Use Rich Results Test on one US and one Canadian product. Review actual Product enhancement findings after recrawl. Valid markup creates eligibility, not a guarantee of rich results or policy approval for every product.
4. Review the 229 discovered URLs by page type. Prioritize valuable product/category pages with genuine stock and documentation. Do not try to force private pages, redundant filters or every shared document into the index.
5. Confirm the business inbox, response coverage and payment instructions for each market. Track submitted orders separately from paid and fulfilled orders. Choose a conversion-reporting option when ready; no paid plan is required to keep the SEO changes.

## Days 4–10: improve ten buyer pages, five per market

Use current Search Console landing-page data to choose five US and five Canadian products. Start with pages associated with the observed queries above where the relevant market has real available stock. Do not promote unavailable material just because a keyword appears promising.

For each selected page, add business-specific facts that can be verified: current package contents, current lot code, relevant report link, actual regional shipping/payment process and answers to genuine pre-purchase questions. Explain the available documentation and its limitations. Avoid copied supplier descriptions, manufactured reviews and efficacy claims. Keep medical/dosing advice out of purchasing copy. Product name + strength + market + documentation is a useful intent pattern, not a reason to repeat a phrase unnaturally.

Improve the existing procurement/COA guides with original examples from actual inventory and link to those selected products when relevant. Publish evidence of your own operations only when the owner can substantiate it. Do not create another broad batch of articles or city pages merely to expand the sitemap. [Google's people-first content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).

## Days 11–20: earn qualified visits and remove buyer friction

- Publish two useful original documentation/procurement resources using real customer questions and primary sources; connect each to the relevant existing catalog pages.
- Identify relevant laboratories, research communities and supplier directories that actually accept this business/category. Request accurate listings or editorial coverage where appropriate; no bulk backlink purchase or fabricated location listing. Outreach must be explicitly approved before messages are sent.
- In Vercel, separate US/CA landing-page traffic and search referrers. In Search Console, compare query/page/country combinations. Review new paid orders and unpaid submissions with the owner. If people submit orders but do not pay, investigate response speed, payment availability and trust before adding more traffic.
- Review mobile purchase usability and current lab measurements. Use field Core Web Vitals once there is enough data; a “No data” result is not a pass or failure. Prioritize any measured image, layout-shift or interaction bottleneck.

## Days 21–30: allocate effort to evidence

Compare a consistent post-release period with the available pre-release period, allowing for Search Console lag and low sample size. Report US and Canada separately:

| Stage | Measurement | Decision |
| --- | --- | --- |
| Discovery | Priority URLs indexed; crawl/exclusion reasons | Fix missed valuable pages and weak internal links |
| Search visibility | Impressions and relevant non-brand queries | Improve pages gaining buyer-intent visibility |
| Search visits | Clicks and CTR at comparable positions | Test clear titles/descriptions once there is enough data |
| Shopping | Product visits and available cart/checkout events | Identify the biggest observable drop-off |
| Revenue | Paid orders, paid revenue, fulfillment status | Judge sales from confirmed payment, not submissions |

Work on the handful of pages showing relevant impressions and genuine buyer interest. Expand only after the first set has distinct useful content, an operational payment path and evidence that it helps buyers. Technical acceptance is a clean release; the business objective is qualified visits turning into **paid, fulfilled orders**. Neither a fixed position nor a sale by day 30 can be guaranteed. [Google explains that SEO effects can take hours to several months](https://developers.google.com/search/docs/fundamentals/seo-starter-guide).

## Repeatable technical checks

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run start -- --port 3100
# In a second terminal:
$env:TEST_ORIGIN='http://localhost:3100'
npm.cmd run verify:seo
npm.cmd run verify:sitemap
npm.cmd run audit:seo
```

`audit:seo` inspects prepared storefront HTML and computed metadata; runtime verification checks the enhancements served by the app. Reports are written under ignored `artifacts/`. After deployment use the production `TEST_ORIGIN` and set `EXPECTED_SITE_ORIGIN=https://www.eppixlabsshop.com`. Regenerate `reference/image-dimensions.json` with `node scripts/build-image-dimensions.mjs` when new local images are added.

Additional implementation references: [Google ecommerce site structure](https://developers.google.com/search/docs/specialty/ecommerce/help-google-understand-your-ecommerce-site-structure), [Product markup](https://developers.google.com/search/docs/appearance/structured-data/product), [structured-data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies), and the installed Next.js 16.4 metadata, sitemap and JSON-LD guides under `node_modules/next/dist/docs/`.
