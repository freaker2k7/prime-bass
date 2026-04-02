import * as Tone from 'tone';
import './main.scss';

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

	const oscillatorType = (document.getElementById('oscillator') as HTMLSelectElement).value as
		| 'sine'
		| 'square'
		| 'triangle'
		| 'sawtooth';
	const filterType = (document.getElementById('filter') as HTMLSelectElement).value as
		| 'lowpass'
		| 'highpass'
		| 'bandpass'
		| 'notch'
		| 'allpass'
		| 'peaking'
		| 'lowshelf'
		| 'highshelf';
	const filterQuality = parseInt((document.getElementById('filter-quality') as HTMLInputElement).value || '2');
	const rolloff = parseInt((document.getElementById('rolloff') as HTMLInputElement).value || '-24') as
		| -12
		| -24
		| -48
		| -96;
	const duration = parseInt((document.getElementById('duration') as HTMLInputElement).value || '150') / 1000; // in seconds
	const frets = parseInt((document.getElementById('frets') as HTMLInputElement).value || '19');
	const numNotes = parseInt((document.getElementById('notes') as HTMLInputElement).value || '8');
	const numPrimes = parseInt((document.getElementById('primes') as HTMLInputElement).value || '100');
	const attack = parseFloat((document.getElementById('attack') as HTMLInputElement).value || '0.01');
	const decay = parseFloat((document.getElementById('decay') as HTMLInputElement).value || '0.1');
	const sustain = parseFloat((document.getElementById('sustain') as HTMLInputElement).value || '0.5');
	const release = parseFloat((document.getElementById('release') as HTMLInputElement).value || '1');
	const now = Tone.now();

	await Tone.start();

	synth = new Tone.MonoSynth({
		oscillator: { type: oscillatorType },
		filter: { Q: filterQuality, type: filterType, rolloff },
		envelope: { attack, decay, sustain, release },
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

(document.getElementById('advanced-settings-toggle') as HTMLInputElement).addEventListener('click', () => {
	(document.getElementById('advanced-settings') as HTMLDivElement).classList.toggle('open');
});

document.querySelectorAll('input[type="number"], select').forEach((input) => {
	input.addEventListener('input', stop);
});

document.querySelectorAll('#frequencies-controls input').forEach((input) => {
	input.addEventListener('input', () => {
		stop();

		const tab = parseInt(input.id.split('-').slice(-1)[0]);
		tuning[tab as keyof typeof tuning] = parseFloat((input as HTMLInputElement).value);
		(document.getElementById(`${input.id}-value`) as HTMLSpanElement).textContent =
			`${Number((input as HTMLInputElement).value).toFixed(2)} Hz`;
	});
});
