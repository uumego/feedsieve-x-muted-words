# FeedSieve → X Muted Words

A Tampermonkey userscript for importing FeedSieve keyword lists into X (Twitter) muted words.

## Features

- Reads the latest keyword list from FeedSieve.
- Scans existing muted words on X before importing.
- Skips words that are already present.
- Uses normalized matching to reduce duplicate imports.
- Imports in small batches to reduce the chance of hitting X rate limits.
- Saves local progress so you can resume later.
- Stops automatically after repeated failures.
- Includes debugging helpers for inspecting visible muted words and saved progress.

## Requirements

- Chrome / Edge / Chromium-based browser
- Tampermonkey
- Logged-in X account

## Install

1. Install Tampermonkey in your browser.
2. Create a new userscript.
3. Replace the default content with `feedsieve-x-muted.user.js`.
4. Save the script.
5. Open X → Settings and privacy → Privacy and safety → Mute and block → Muted words.
6. Use the floating panel in the lower-right corner.

## Recommended workflow

1. Open the X muted words page.
2. Click **Scan all existing** first.
3. Confirm that existing muted words are detected correctly.
4. Click **Scan and add next batch**.
5. If X starts rejecting additions, stop and wait until manual additions work again before continuing.

## Rate limits

X does not publicly document a specific muted-word insertion limit. In practice, rapid repeated additions may trigger a temporary restriction. This script intentionally uses small batches and delays, and stops after repeated failures.

Do not aggressively reduce the delay or increase the batch size unless you understand the risk of triggering temporary limits.

## Matching behavior

The script compares both normalized full text and a simplified keyword key. This helps treat variants such as these as equivalent when appropriate:

- `adult`
- `ADULT`
- `adult  成年人`

## Privacy

The script runs locally in your browser. It reads the FeedSieve keyword page and interacts with X's muted-word settings page. It does not require your X password or transmit account credentials to this repository.

## Disclaimer

This project is an independent userscript and is not affiliated with, endorsed by, or sponsored by X Corp. or FeedSieve.

Website structures and limits may change at any time, which can break automation.

## License

MIT
