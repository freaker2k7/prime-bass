export type FilterRollOff = -12 | -24 | -48 | -96;

export type FilterType =
	| 'lowpass'
	| 'highpass'
	| 'bandpass'
	| 'notch'
	| 'allpass'
	| 'peaking'
	| 'lowshelf'
	| 'highshelf';

export type OscillatorType = 'sine' | 'square' | 'triangle' | 'sawtooth';
