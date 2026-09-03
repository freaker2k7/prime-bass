import * as Tone from 'tone';
import './main.scss';
import type { FilterRollOff, FilterType, OscillatorType } from './types';
import { Visualizer } from './visualizer';

const ANALYSER_SIZE = 1024;
const TARGET_FPS = 60;
const MIN_FRAME_INTERVAL = 1000 / TARGET_FPS;

let prevValues: Float32Array | null = null;
let lastDrawTime = 0;
let isPlaying: boolean = false;
let recorder: MediaRecorder | null = null;
let synth: Tone.MonoSynth | null = null;
let visualizer: Visualizer | null = null;

// Oscillator for the oscilloscope visualization
let osc: Tone.Oscillator | null = null;
let analyser: Tone.Analyser | null = null;
const canvas = document.getElementById('oscilloscope') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

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

	// Create an analyser and connect the synth to it for waveform data
	analyser = new Tone.Analyser('waveform', ANALYSER_SIZE);
	synth.connect(analyser);

	// initialize smoothing buffer
	prevValues = new Float32Array(ANALYSER_SIZE);

	osc = new Tone.Oscillator(synth.frequency.value, 'triangle');
	// connect helper osc only to analyser so it won't produce audible output
	osc.connect(analyser);

	await Tone.start();
	osc.start();

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
	osc?.stop();

	// Dispose of the synth after a short delay to allow the release phase to finish and avoid cutting off the sound abruptly.
	setTimeout(() => {
		synth?.dispose();
		osc?.dispose();
		analyser?.dispose();
		recorder = null;
		synth = null;
		visualizer = null;
		prevValues = null;
		analyser = null;
		osc = null;
	}, 0);
}

function draw() {
	requestAnimationFrame(draw);

	const now = performance.now();
	if (now - lastDrawTime < MIN_FRAME_INTERVAL) return; // throttle
	lastDrawTime = now;

	// Handle high DPI canvas sizing
	const dpr = window.devicePixelRatio || 1;
	// Prefer layout rect size; fall back to client/offset sizes and safe defaults
	const rect = canvas.getBoundingClientRect();
	let cssWidth = Math.max(0, rect.width, canvas.clientWidth, canvas.offsetWidth);
	let cssHeight = Math.max(0, rect.height, canvas.clientHeight, canvas.offsetHeight);
	if (!cssWidth) cssWidth = 300; // sensible default if element not yet laid out
	if (!cssHeight) cssHeight = 150;
	if (canvas.width !== Math.floor(cssWidth * dpr) || canvas.height !== Math.floor(cssHeight * dpr)) {
		canvas.width = Math.floor(cssWidth * dpr);
		canvas.height = Math.floor(cssHeight * dpr);
		canvas.style.width = `${cssWidth}px`;
		canvas.style.height = `${cssHeight}px`;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}

	const width = cssWidth;
	const height = cssHeight;
	const padding = -50; // Padding around the waveform

	// Clear
	ctx.clearRect(0, 0, width, height);

	// Get audio data
	const raw = analyser?.getValue() ?? new Float32Array(ANALYSER_SIZE);

	// Ensure prevValues exists and matches size
	if (!prevValues || prevValues.length !== raw.length) {
		prevValues = new Float32Array(raw.length);
	}
	const smoothed = prevValues as Float32Array;

	// Smoothing (exponential moving average)
	const SMOOTHING_ALPHA = 0.85; // closer to 1 = smoother/laggier
	for (let i = 0; i < raw.length; i++) {
		const v: any = typeof raw[i] === 'number' ? raw[i] : 0;
		const prevNum: any = smoothed[i] ?? 0;
		const alpha: any = SMOOTHING_ALPHA;
		const next = prevNum * alpha + v * (1 - alpha);
		smoothed[i] = next;
	}

	// Draw center line
	const centerY = height / 2;
	ctx.beginPath();
	ctx.moveTo(0, centerY);
	ctx.lineTo(width, centerY);
	ctx.strokeStyle = 'rgba(0,0,0,.35)';
	ctx.lineWidth = 1;
	ctx.stroke();

	// Determine samples to display and aggregation factor
	const length = smoothed.length;
	const zoom = 1.0;
	const samples = Math.min(length, Math.max(128, Math.floor(length * zoom)));
	const start = Math.max(0, Math.floor((length - samples) / 2));
	const groupSize = Math.max(1, Math.floor(length / samples));

	// Draw waveform using smoothed values and sample aggregation to avoid sparsity
	ctx.beginPath();
	for (let i = 0; i < samples; i++) {
		// average a small group of samples for this x
		let sum = 0;
		let count = 0;
		const base = start + i * groupSize;
		for (let k = 0; k < groupSize && base + k < length; k++) {
			sum += smoothed[base + k];
			count++;
		}
		const value = count > 0 ? sum / count : 0;

		const x = (i / (samples - 1)) * width;
		const voltsScale = 1.0;
		const y = centerY - value * ((height - 2 * padding) * 0.42) * voltsScale;

		if (i === 0) ctx.moveTo(x, y);
		else ctx.lineTo(x, y);
	}

	// CRT glow
	ctx.lineWidth = 3;
	ctx.strokeStyle = '#000000';
	ctx.shadowColor = '#cccccc';
	ctx.shadowBlur = 12;
	ctx.stroke();

	// Sharper core
	ctx.shadowBlur = 2;
	ctx.lineWidth = 1.2;
	ctx.stroke();
	ctx.shadowBlur = 0;
}

draw();

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
