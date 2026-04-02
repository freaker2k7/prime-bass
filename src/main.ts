import * as Tone from 'tone';

let isPlaying: boolean = false;
let synth: Tone.MonoSynth | null = null;

// Standard bass tuning (Hz)
const tuning = {
	1: 41.2, // E1
	3: 55.0, // A1
	7: 73.42, // D2
	9: 98.0, // G2
};

const isPrime = (n: number): boolean => {
	const iEnd = Math.sqrt(n);
	for (let i = 2; i <= iEnd; ++i) {
		if (n % i === 0) {
			return false;
		}
	}

	return true;
};

function fretToFreq(openFreq: number, fret: number, frets: number): number {
	return openFreq * Math.pow(2, fret / frets);
}

async function play() {
	(document.getElementById('play-button') as HTMLInputElement).value = 'Stop Bass';
	isPlaying = true;

	const duration = parseInt((document.getElementById('duration') as HTMLInputElement).value || '150') / 1000; // in seconds
	const frets = parseInt((document.getElementById('frets') as HTMLInputElement).value || '19');
	const numNotes = parseInt((document.getElementById('notes') as HTMLInputElement).value || '8');
	const numPrimes = parseInt((document.getElementById('primes') as HTMLInputElement).value || '100');
	const now = Tone.now();

	await Tone.start();

	synth = new Tone.MonoSynth({
		oscillator: { type: 'sawtooth' },
		filter: { Q: 2, type: 'lowpass', rolloff: -24 },
		envelope: {
			attack: 0.01,
			decay: 0.1,
			sustain: 0.5,
			release: 1,
		},
	}).toDestination();

	/*
	In order not to check for the 5 (prime number) every time,
	we initialize 1 & 3 and start the loop from 7, which is the next prime number.
	*/

	synth.triggerAttackRelease(fretToFreq(tuning[1], 1, frets), `${numNotes}n`, now + duration);
	synth.triggerAttackRelease(fretToFreq(tuning[3], 3, frets), `${numNotes}n`, now + duration * 2);

	/*
	No point in checking even numbers, so we start from 7 and increment by 2
	and there're already 2 notes played, so we start the loop with j = 2.
	*/
	for (let i = 7, j = 2; j < numPrimes; i += 2) {
		if (isPrime(i)) {
			synth.triggerAttackRelease(
				fretToFreq(tuning[(i % 10) as keyof typeof tuning], i % frets, frets),
				`${numNotes}n`,
				now + duration * ++j,
			);
		}
	}
}

function stop() {
	(document.getElementById('play-button') as HTMLInputElement).value = 'Play Bass';
	isPlaying = false;

	if (synth) {
		synth.dispose();
		synth = null;
	}
}

(document.getElementById('form') as HTMLFormElement).addEventListener('submit', (e) => {
	e.preventDefault();

	if (isPlaying) {
		return stop();
	}

	play();
});
