# Prime Bass

## Demo

Please see [the github page](https://freaker2k7.github.io/prime-bass/) to play around 😉

## Intro

I had a dream about how to feel the prime numbers and what better way to do it than to play them as music?<br>
So I created this simple web app that generates a given amount of prime numbers and play them as a sequence of notes.<br>
You can adjust the number of notes, frets, note duration, and the number of primes to generate.<br>
<br>
The app uses Tone.js to create a simple synthesizer and play the notes.<br>
Each prime number is mapped to a bass guitar frequency, and the notes are played in sequence with a specified duration.<br>

## Thesis

Prime numbers can end only with 1, 3, 7 or 9 (except for the prime numbers 2 and 5).<br>
The bass guitar has 4 strings, and each string can play a note that ends with one of those digits.<br>
So we can map the prime numbers to the bass guitar frequencies based on their last digit, appending modulo number of frets.<br>
Then we can play the notes in sequence to create a musical representation of the prime numbers.<br>

## Stack

- [Vite](https://vitejs.dev/) - A build tool that aims to provide a faster and leaner development experience for modern web projects.
- [TypeScript](https://www.typescriptlang.org/) - A typed superset of JavaScript that compiles to plain JavaScript.
- [Tone.js](https://tonejs.github.io/) - A Web Audio framework for creating interactive music in the browser.
- [Prettier](https://prettier.io/) - An opinionated code formatter.
- [ESLint](https://eslint.org/) - A tool for identifying and reporting on patterns found in ECMAScript/JavaScript code.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details on how to contribute to this project.

### TODO

Feel free to contribute by submitting a pull request or opening an issue with your ideas and suggestions!<br>

- Add tuning frequencies to the UI.
- Add the synthesizer settings to the UI.
- Add more instruments and tunings.
- Add a visual representation of the notes being played.
- Add a way to save the generated music as a file.

# 💪

Made with 🧠 & ❤️ by [Evgeny K.](https://github.com/freaker2k7)
