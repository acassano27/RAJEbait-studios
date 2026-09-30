# Codebreaker

A small standalone logic game inspired by Numberle and Wordle.

## How it works

- The game creates a hidden 4-digit code.
- A random starting guess is shown.
- You move through the digits one by one and use the +1 / -1 controls to change the selected value.
- Click "Check guess" to compare your sequence against the hidden target.
- Feedback tells you how many digits are exact matches and how many are in the sequence but in the wrong position.
- You have 6 attempts to solve the code.

## Run it locally

From the repo root:

```bash
python -m http.server 8000
```

Then open:

- http://localhost:8000/codebreaker/

## Good next upgrades

- add a score and best-score tracker
- add keyboard support
- add a daily challenge mode
- add sound effects and animations
- integrate it into the main hub later
