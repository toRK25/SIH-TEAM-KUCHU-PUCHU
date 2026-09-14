# Karigar Kart — Option 2 interactive prototype

English-only artisan commerce UI, using the selected Speak First visual direction. React/TypeScript, Vite, Phosphor icons and locally bundled Nunito Sans. Mobile runtime supports iPhone and Pixel 10.

## Included
Welcome, login, signup and recovery previews; home; voice/typed product description; editable known fields; one missing-material question; photo upload/camera input and before/after brightness preview; listing preview; minimum-protected pricing; final review and publishing; drafts and product filtering; structured buyer enquiry responses; request status progression; simple insights; editable profile and help sheets.

## Prototype boundaries
Sample data and session state only. Refresh resets edits. No real authentication, live marketplace, notifications, messaging, payments or logistics. Voice uses a sample transcript; typed descriptions remain user supplied and fields are manually confirmed. Price recommendations and analytics are illustrative. Photo enhancement uses a subtle CSS brightness/contrast preview, not an AI service. Local uploaded images are read only in this browser session.

## Run
npm ci
npm run dev -- --host 0.0.0.0 --port 4173 --strictPort

## Validation
npm run check:runtime
npm run build
See design-qa.md for browser tests and the unresolved full-size visual verification gate.

All product UI is in src/Prototype.tsx and src/prototype.css. Preserve the protected mobile runtime files.
