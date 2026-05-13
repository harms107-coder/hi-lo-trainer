# Count Trainer

A simple mobile-friendly blackjack Hi-Lo card-counting trainer built with React, Vite, CSS, and JavaScript.

## Run it

Install Node.js first if `npm` is not available on your machine.

```bash
npm install
npm run dev
```

Then open the local URL Vite prints in your terminal.

## MVP Modes

- Card Value: choose whether the displayed card is `+1`, `0`, or `-1`.
- Running Count: enter the running count after the displayed card.
- True Count: divide running count by decks remaining, using `Math.trunc()` to round toward zero.

Deck options are 1, 2, 6, and 8 decks. Changing the deck count resets the shoe.
