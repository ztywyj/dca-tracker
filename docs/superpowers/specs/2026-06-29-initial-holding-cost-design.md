# Initial Holding Cost Design

## Context

Users can enter existing shares for each ticker in Settings. Dashboard currently computes average cost from recorded buy amount divided by current total shares. When current shares include pre-existing holdings, the denominator includes shares whose historical cost is unknown, so the displayed average cost is too low.

## Decision

Add an `initialAverageCost` field to each plan asset. It represents the historical average cost of the existing shares entered in Settings.

Dashboard average cost will use the full-position formula:

```text
(initialShares * initialAverageCost + recordedActualAmount) / currentShares
```

Where:

- `initialShares` is the preserved starting position for the asset.
- `initialAverageCost` is user-entered in Settings.
- `recordedActualAmount` is the sum of `actualAmount` for matching ticker records.
- `currentShares` is the latest total share count.

## Behavior

- Settings shows an initial average cost input next to existing shares when adding or editing an asset.
- Saving a plan persists `initialAverageCost` as a number.
- Rebuilding plan state after record edits, record deletion, or settings changes preserves `initialAverageCost`.
- If an asset has initial shares but no valid initial average cost, Dashboard displays `--` for average cost and price gap to avoid a misleading number.
- If an asset has no initial shares, Dashboard can still compute average cost from recorded purchases.

## Compatibility

Existing plans without `initialAverageCost` continue to load. They only show `--` in Dashboard for assets that have initial shares and no initial average cost.

## Tests

Add focused coverage for average cost calculation:

- Initial 40 shares at 80 average cost plus a recorded buy of 2 shares at 100 should display an average cost of 80.95.
- Existing initial shares without initial average cost should not produce a fake low average cost.
