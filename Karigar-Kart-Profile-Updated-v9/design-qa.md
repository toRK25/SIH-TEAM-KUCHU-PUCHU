# Karigar Kart design QA

final result: blocked

## Source and evidence
- Source visual truth: selected-design.png, the second displayed ideation result, 853 × 1844 pixels, approximately 390 × 844 logical viewport.
- Implementation: home-review.jpg and home-final.jpg, browser-rendered screen clips; pixel-review.jpg captures the Android device.
- Browser viewport: 1363 × 936. iPhone app layout uses 393 × 852 CSS pixels before the template transform; the actual screen bounds are 360.52 × 781.59 pixels, scale approximately 0.917.
- State: Home, English, seeded Sunita account, keyboard closed.
- Full-view comparison: source and home-final capture were emitted together in one comparison input. Comparison is provisional because the mandatory 1:1 capture could not be obtained through this browser's advertised controls. Source contains no OS chrome; template-owned status and navigation chrome are preserved.
- Focused comparison: readable header, hero, shortcut and draft areas examined in the paired evidence. Exact pixel/typographic sign-off remains blocked by scaled capture.

## Findings and history
- P1 fixed: MobileScroll's absolute positioning initially painted the greeting behind the app header. App-owned scroll wrapper now uses relative flex layout. home-review.jpg and home-final.jpg show greeting restored.
- P2 adjusted: safe-area chrome reduces available content height. Hero and shortcut spacing reduced, all content remains scrollable above navigation. The draft is partially below the initial viewport; further full-size comparison is needed to decide final density.
- Blocker: Product Design requires screen bounds of 393 × 852 for its 1:1 fidelity gate. Current browser supplies a smaller scaled viewport and exposes no viewport-resize method. Do not mark this check passed from resized raster evidence.

## Required fidelity surfaces
- Typography: locally bundled Nunito Sans; title hierarchy and rounded sans style follow reference. Some shortcut/draft supporting labels are 12px. Final optical comparison pending at scale 1.
- Layout: centered voice hero, side camera illustration, four shortcuts, draft card and four-item bottom navigation preserved. App-owned safe-area/header issue fixed; scroll region clears fixed navigation.
- Colour: cream #fcf8f1, chocolate #382317, sand #f5ecdf, amber #a65515. No off-palette status colours. Solid amber replaces subtle mock gradient.
- Images: individually generated diya, avatar and basket assets; Phosphor icons. No CSS/handcrafted SVG substitutes for raster assets. Empty drafts explicitly say photo not added.
- Copy: home copy follows selected option. English-only. Demo labels distinguish simulated AI/pricing/messaging from real services.

## Browser interactions tested
- Home start → sample description → editable known fields → missing material selection → sample photo → enhancement → before/after → listing preview → pricing → final review → publish → products.
- Price 950 blocked when minimum is 1000; price 1050 accepted. Quantity and delivery entered; publish confirmation observed.
- Structured enquiry → response → saved confirmation → request Discussion → Accepted → Completed.
- Type instead → description → manual name → save draft → Draft filter.
- Profile → logout → welcome → login screen → return Home.
- iPhone/Pixel 10 device switching; protected runtime remains intact.
- Build and runtime integrity checks pass.
- Console: one transient React dependency prebundle error occurred while icons were installed into the running preview; page subsequently rendered and interaction tests passed. Extension metadata errors also appeared; these are not app errors. Full clean-session console sign-off remains part of the blocked final verification.

## Follow-up
Obtain an unscaled browser viewport, repeat home comparison and clean-session console check, assess initial draft visibility, and write final result: passed only when those gates are satisfied. Real speech, AI, market data and authentication are separate integration work.
