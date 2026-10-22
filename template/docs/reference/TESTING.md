# Testing

## Commands
- Unit: 
- Integration/API: 
- E2E/visual: playwright-cli

## What "verified" means
- Logic: tests pass, new behavior has a test.
- UI: screenshots at 375/768/1280, no console errors, keyboard reachable.
- API: success + auth-failure + bad-input cases.
- Security: Strix scan before deploy; fix or document every finding.
