# Prime Bass

I had a dream about how to feel the prime numbers and what better way to do it than to play them as music?<br>
So I created this simple web app that generates a given amount of prime numbers and play them as a sequence of notes.<br>
You can adjust the number of notes, frets, note duration, and the number of primes to generate.<br>
<br>
The app uses Tone.js to create a simple synthesizer and play the notes.<br>
Each prime number is mapped to a bass guitar frequency, and the notes are played in sequence with a specified duration.<br>

## Theory

Prime numbers can end only with 1, 3, 7 or 9 (except for the prime numbers 2 and 5).<br>
The bass guitar has 4 strings, and each string can play a note that ends with one of those digits. So we can map the prime numbers to the bass guitar frequencies based on their last digit, appending modulo number of frets.<br>
Then we can play the notes in sequence to create a musical representation of the prime numbers.<br>

## Demo

Please see [the github page](https://freaker2k7.github.io/prime-bass/) to play around 😉

Made with 🧠 & ❤️ by [Evgeny K.](https://github.com/freaker2k7)
