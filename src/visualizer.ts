export class Visualizer {
	private strings: string[];
	private events: { string: string; fret: string; time: number }[];
	private speed: number;
	private charWidth: number;
	private startTime: number;
	private lines: { [string: string]: HTMLDivElement } = {};
	private animationId: number | null = null;
	private lineLength: number;
	private windowMs = 5000; // how long the note stays on the screen in ms

	private readonly stringsMap: { [key: number]: string } = { 9: 'G', 7: 'D', 3: 'A', 1: 'E' };

	constructor(
		private container: HTMLDivElement,
		options: { speed?: number; charWidth?: number } = {},
	) {
		this.events = [];
		this.strings = ['G', 'D', 'A', 'E'];

		this.speed = options.speed || 80; // pixels per second
		this.charWidth = options.charWidth || 10;

		this.lineLength = Math.floor(((this.windowMs / 1000) * this.speed) / this.charWidth);

		this.startTime = performance.now();

		this._initDOM();
	}

	private _initDOM() {
		this.lines = {};

		this.container.innerHTML = '';

		this.strings.forEach((str) => {
			const line = document.createElement('div');

			this.container.appendChild(line);
			this.lines[str] = line;
		});
	}

	public noteOn(string: number, fret: number) {
		this.events.push({
			string: this.stringsMap[string],
			fret: String(fret).padStart(3, '-'),
			time: this.startTime + this.speed * (this.events.length + 1),
		});
	}

	private draw() {
		const now = performance.now();
		const visibleStart = now - this.windowMs;

		const buffers: { [string: string]: string[] } = {};
		this.strings.forEach((str) => {
			buffers[str] = new Array(this.lineLength).fill('-');
		});

		for (const ev of this.events) {
			if (ev.time < visibleStart) continue;

			const dt = (ev.time - visibleStart) / 1000;
			const x = Math.floor((dt * this.speed) / this.charWidth);

			if (x >= 0 && x < this.lineLength) {
				const strBuf = buffers[ev.string];
				if (!strBuf) continue;

				const chars = ev.fret.split('');
				for (let i = 0; i < chars.length; i++) {
					if (x + i < this.lineLength) {
						strBuf[x + i] = chars[i];
					}
				}
			}
		}

		// render
		this.strings.forEach((str) => {
			this.lines[str].textContent = `${str}|${buffers[str].join('')}|`;
		});
	}

	public start() {
		if (this.animationId !== null) {
			return;
		}

		const loop = () => {
			this.draw();
			this.animationId = requestAnimationFrame(loop);
		};

		loop();
	}

	public stop() {
		if (this.animationId !== null) {
			cancelAnimationFrame(this.animationId);
			this.animationId = null;
		}
	}
}
