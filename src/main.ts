import * as Tone from 'tone';
import './main.scss';
import type { FilterRollOff, FilterType, OscillatorType } from './types';
import { Visualizer } from './visualizer';

let isPlaying: boolean = false;
let recorder: MediaRecorder | null = null;
let synth: Tone.MonoSynth | null = null;
let visualizer: Visualizer | null = null;

const strings = { 1: 'E', 3: 'A', 7: 'D', 9: 'G' };

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

function record(synth: Tone.MonoSynth): MediaRecorder {
	(document.getElementById('form') as HTMLFormElement).querySelector('#download')?.remove();

	// --- Recording Setup ---
	const dest = Tone.getContext().createMediaStreamDestination();
	synth.connect(dest);
	const mediaRecorder = new MediaRecorder(dest.stream);
	let recordedChunks: BlobPart[] = [];

	mediaRecorder.ondataavailable = (event) => {
		if (event.data.size > 0) {
			recordedChunks.push(event.data);
		}
	};

	mediaRecorder.start();

	// Save the recorded audio
	mediaRecorder.onstop = () => {
		const blob = new Blob(recordedChunks, { type: 'audio/wav' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');

		a.id = 'download';
		a.href = url;
		a.innerHTML = 'Download';
		a.download = 'recording.wav';
		(document.getElementById('form') as HTMLFormElement).appendChild(a);

		a.onclick = () => {
			setTimeout(() => {
				window.URL.revokeObjectURL(url);
				recordedChunks = [];
			}, 0);
		};
	};

	return mediaRecorder;
}

function setParams() {
	const params = new URLSearchParams(window.location.search);

	(document.getElementById('duration') as HTMLInputElement).value = params.get('eventDuration')
		? (parseFloat(params.get('eventDuration')!) * 1000).toString()
		: '150';
	(document.getElementById('frets') as HTMLInputElement).value = params.get('numFrets') || '19';
	(document.getElementById('notes') as HTMLInputElement).value = params.get('numNotes') || '8';
	(document.getElementById('primes') as HTMLInputElement).value = params.get('numPrimes') || '100';
	(document.getElementById('oscillator') as HTMLSelectElement).value = params.get('oscillatorType') || 'sawtooth';
	(document.getElementById('filter') as HTMLSelectElement).value = params.get('filterType') || 'lowpass';
	(document.getElementById('filter-quality') as HTMLInputElement).value = params.get('filterQuality') || '2';
	(document.getElementById('rolloff') as HTMLInputElement).value = params.get('filterRolloff') || '-24';
	(document.getElementById('attack') as HTMLInputElement).value = params.get('filterEnvelopeAttack') || '0.01';
	(document.getElementById('decay') as HTMLInputElement).value = params.get('filterEnvelopeDecay') || '0.1';
	(document.getElementById('sustain') as HTMLInputElement).value = params.get('filterEnvelopeSustain') || '0.5';
	(document.getElementById('release') as HTMLInputElement).value = params.get('filterEnvelopeRelease') || '1';

	for (const [key, value] of Object.entries(tuning)) {
		tuning[key as unknown as keyof typeof tuning] =
			(params.get(`tuning_${key}`) && parseFloat(params.get(`tuning_${key}`)!)) || value;

		(
			document.getElementById(
				`frequencies-range-${strings[key as unknown as keyof typeof strings].toLowerCase()}-${key}`,
			) as HTMLInputElement
		).value = tuning[key as unknown as keyof typeof tuning].toString();

		(
			document.getElementById(
				`frequencies-range-${strings[key as unknown as keyof typeof strings].toLowerCase()}-${key}-value`,
			) as HTMLSpanElement
		).textContent = `${tuning[key as unknown as keyof typeof tuning].toFixed(2)} Hz`;
	}
}

function getParams() {
	const obj = {
		eventDuration: parseInt((document.getElementById('duration') as HTMLInputElement).value || '150') / 1000, // in second
		numFrets: parseInt((document.getElementById('frets') as HTMLInputElement).value || '19'),
		numNotes: parseInt((document.getElementById('notes') as HTMLInputElement).value || '8'),
		numPrimes: parseInt((document.getElementById('primes') as HTMLInputElement).value || '100'),
		oscillatorType: (document.getElementById('oscillator') as HTMLSelectElement).value || 'sawtooth',
		filterType: (document.getElementById('filter') as HTMLSelectElement).value,
		filterQuality: parseInt((document.getElementById('filter-quality') as HTMLInputElement).value || '2'),
		filterRolloff: parseInt((document.getElementById('rolloff') as HTMLInputElement).value || '-24'),
		filterEnvelopeAttack: parseFloat((document.getElementById('attack') as HTMLInputElement).value || '0.01'),
		filterEnvelopeDecay: parseFloat((document.getElementById('decay') as HTMLInputElement).value || '0.1'),
		filterEnvelopeSustain: parseFloat((document.getElementById('sustain') as HTMLInputElement).value || '0.5'),
		filterEnvelopeRelease: parseFloat((document.getElementById('release') as HTMLInputElement).value || '1'),
		tuning_1: tuning[1],
		tuning_3: tuning[3],
		tuning_7: tuning[7],
		tuning_9: tuning[9],
	};

	const newUrl = new URL(window.location.href);
	for (const [key, value] of Object.entries(obj)) {
		newUrl.searchParams.set(key, String(value));
	}

	window.history.replaceState({}, '', newUrl);

	return obj;
}

async function play(e: SubmitEvent) {
	(document.getElementById('play-button') as HTMLInputElement).value = '⏹';
	isPlaying = true;

	const submitter = (e.submitter as HTMLInputElement)?.name;
	const params = getParams();
	const now = Tone.now();

	visualizer = new Visualizer(document.getElementById('tabs') as HTMLDivElement, {
		speed: params.eventDuration * 1000,
		charWidth: 10,
	});

	await Tone.start();

	synth = new Tone.MonoSynth({
		oscillator: { type: params.oscillatorType as OscillatorType },
		filter: {
			Q: params.filterQuality,
			type: params.filterType as FilterType,
			rolloff: params.filterRolloff as FilterRollOff,
		},
		envelope: {
			attack: params.filterEnvelopeAttack,
			decay: params.filterEnvelopeDecay,
			sustain: params.filterEnvelopeSustain,
			release: params.filterEnvelopeRelease,
		},
	}).toDestination();

	if (submitter === 'record') {
		(document.getElementById('record-button') as HTMLInputElement).value = '⏸';
		recorder = record(synth);
	}

	/*
	In order not to check for the 5 (prime number) every time,
	we initialize 1 & 3 and start the loop from 7, which is the next prime number.
	*/

	synth.triggerAttackRelease(
		fretToFreq(tuning[1], 1, params.numFrets),
		`${params.numNotes}n`,
		now + params.eventDuration,
	);
	visualizer.noteOn(1, 1);
	synth.triggerAttackRelease(
		fretToFreq(tuning[3], 3, params.numFrets),
		`${params.numNotes}n`,
		now + params.eventDuration * 2,
	);
	visualizer.noteOn(3, 3);

	/*
	No point in checking even numbers, so we start from 7 and increment by 2
	and there're already 2 notes played, so we start the loop with j = 2.
	*/
	for (let i = 7, j = 2; j < params.numPrimes; i += 2) {
		if (isPrime(i)) {
			synth.triggerAttackRelease(
				fretToFreq(tuning[(i % 10) as keyof typeof tuning], i % params.numFrets, params.numFrets),
				`${params.numNotes}n`,
				now + params.eventDuration * ++j,
			);
			visualizer.noteOn(i % 10, i % params.numFrets);
		}
	}

	// End synth after the last note
	const stopAt = now + params.eventDuration * (params.numPrimes + 1);
	synth.triggerRelease(stopAt);
	Tone.getDraw().schedule(stop, stopAt);

	visualizer.start();
}

function stop() {
	console.log('Stopping...');

	(document.getElementById('play-button') as HTMLInputElement).value = '▶';
	(document.getElementById('record-button') as HTMLInputElement).value = '⏺';
	isPlaying = false;

	recorder?.stop();
	visualizer?.stop();

	// Dispose of the synth after a short delay to allow the release phase to finish and avoid cutting off the sound abruptly.
	setTimeout(() => {
		synth?.dispose();
		recorder = null;
		synth = null;
	}, 0);
}

(document.getElementById('form') as HTMLFormElement).addEventListener('submit', (e) => {
	e.preventDefault();

	if (isPlaying) {
		return stop();
	}

	play(e);
});

(document.getElementById('advanced-settings-toggle') as HTMLInputElement).addEventListener('click', () => {
	(document.getElementById('advanced-settings') as HTMLDivElement).classList.toggle('open');
});

document.querySelectorAll('input[type="number"], select').forEach((input) => {
	input.addEventListener('input', () => {
		stop();
		getParams();
	});
});

document.querySelectorAll('#frequencies-controls input').forEach((input) => {
	input.addEventListener('input', () => {
		stop();

		const tab = parseInt(input.id.split('-').slice(-1)[0]);
		tuning[tab as keyof typeof tuning] = parseFloat((input as HTMLInputElement).value);
		(document.getElementById(`${input.id}-value`) as HTMLSpanElement).textContent =
			`${Number((input as HTMLInputElement).value).toFixed(2)} Hz`;

		getParams();
	});
});

// Handle popstate changes to update the form values accordingly
window.addEventListener('popstate', setParams);

// Initialize form values based on URL parameters on page load
window.addEventListener('load', setParams);
