# MSA + Disposition merge — cost model

Interactive scenario model for the proposed merge of the MSA (Market Sell Agent)
and internal Disposition Agent roles. Built for CEO-level scenario discussion.

**All figures are illustrative dummy data.** Replace the values in `DEFAULTS`
(top of `src/App.jsx`) with Homeward actuals before this informs a decision.

## Run it

```bash
npm install
npm run dev
```

## What it does

Every assumption is editable in the left panel and the analysis reruns as you
type. Four groups of output:

- **Headline stats** — recurring annual saving, one-time transition cost,
  year-one net, payback period, saving per property
- **Waterfall** — how you get from today's cost base to the merged cost base,
  one bar per cost line, largest saving first
- **Line-by-line table** — split into *labor and overhead* versus *property
  carrying and pricing*, because those hit different parts of the P&L
- **Sensitivity** — every key assumption moved ±15%, sorted by how much it
  swings the answer. This tells you which numbers are worth arguing about

## Adding your own variables

The "Your own variables" section adds assumptions the model doesn't ship with.
Each takes an amount, a **basis** (flat annual, per agent per year, per
property, or one-time) and a **scope** (today only, merged only, both). It then
flows into the totals, the waterfall and the payback calculation. This is not a
notes field — added variables change the answer.

## Scenarios

**Save scenario** snapshots the current assumption set and adds it to a
comparison table at the bottom. **Export** writes the whole model — assumptions,
custom variables, saved scenarios — to a JSON file you can email or commit;
**Import** reads it back. **Copy summary** puts a plain-text summary on the
clipboard, formatted for pasting into Slack or an email.

State is held in memory only, so a browser refresh resets to defaults. Export
before you close the tab if a scenario matters.

## The structural finding

At the shipped assumptions the saving is **not** a headcount story. Labor and
overhead move by roughly $44K on a $3.6M base — the merged role needs a pay
uplift and slightly more heads than today's MSA count, which largely offsets
retiring the disposition bench.

Roughly 96% of the saving comes from **property carrying and pricing**: removing
the MSA→disposition handoff, then selling faster and pricing better because one
person owns repairs, list price and the buyer conversation. That lands in COGS
and gross margin, not in the operating budget — a distinction worth making
explicitly rather than letting it be discovered mid-meeting.

The sensitivity panel exists because of this. Daily holding cost and days saved
dominate the answer, and both are estimates. The model's real use is finding out
how wrong they can be before the case stops working.

## Where real data plugs in

`DEFAULTS` in `src/App.jsx` — one flat object, every key is labelled in the
`SCHEMA` array directly above it. Adding a field to `SCHEMA` plus a value to
`DEFAULTS` makes it appear in the UI with no other changes; wiring it into the
math means editing `compute()`.
