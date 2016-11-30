window.onload = function () {
	navigator.mediaDevices.getUserMedia({audio: true})
	.then(initAudio)
	.catch(error);
};

function error() {
	alert('Stream generation failed.');
}

function initAudio(stream) {
	//Initialise audio context
	var context = new AudioContext();

	// Create source node
	var source = context.createMediaStreamSource(stream);

	// Alias context.destination
	var out = context.destination;

	// Create effects nodes
	var tone = createToneNode(context);
	var distortion = createDistNode(context);
	var compressor = createCompressorNode(context);
	var gain = createGainNode(context);

	// Reference to DOM elements
	var bypassSwitch = document.getElementById("bypass");
	var ioSwitch = document.getElementById("io");
	var toneSlider = document.getElementById("tone");
	var distSlider = document.getElementById("dist");
	var gainSlider = document.getElementById("gain");

	//Chain effects nodes
	distortion.connect(compressor);
	compressor.connect(tone);
	tone.connect(gain);

	//Facilitate bypass / effects being switched on and off
	function connectBypass () {
		disconnectAll();
		source.connect(out);
	}

	function connectEffects () {
		disconnectAll();
		source.connect(distortion);
		gain.connect(out);
	}

	function disconnectAll () {
		source.disconnect(0);
		gain.disconnect(0);
	}

	//Bind effect sliders
	gainSlider.oninput = function () {
		gain.gain.value = this.value;
	};

	toneSlider.oninput = function () {
		tone.frequency.value = calcFilterFrequency(this.value, context);
	};

	distSlider.oninput = function () {
		distortion.curve = makeDistortionCurve(this.value, context);
	};

	//Bind bypass switch
	bypassSwitch.onclick = function () {
		if (this.checked) {
			connectBypass();
		} else {
			connectEffects();
		}
	}

	//Bind on/off switch
	ioSwitch.onclick = function () {
		if (this.checked) {
			if (bypassSwitch.checked) {
				connectBypass();
			} else {
				connectEffects();
			}
		} else {
			disconnectAll();
		}
	}
}

function createGainNode (context) {
	var gain = context.createGain();
	gain.gain.value = 0.5;

	return gain;
}

function createDistNode (context) {
	var distortion = context.createWaveShaper();

	distortion.curve = makeDistortionCurve(0, context);
	distortion.oversample = '4x';

	return distortion;
}

function createCompressorNode (context) {
	var compressor = context.createDynamicsCompressor();

	compressor.threshold.value = -50;
	compressor.knee.value = 5;
	compressor.ratio.value = 20;
	compressor.attack.value = 0;
	compressor.release.value = 1;

	return compressor;
}

function createToneNode (context) {
	var tone = context.createBiquadFilter();

	tone.type = 'lowpass';
	tone.frequency.value = calcLowpassFrequency(0, context);

	return tone;
}

function calcLowpassFrequency(value, context) {
	//Minimum frequency cutoff
	var minValue = 600;
	//frequencies > 20kHz are inaudible
	var maxValue = context.sampleRate / 2;
	var numberOfOctaves = Math.log(maxValue / minValue) / Math.LN2;
	//More octaves at the bottom of the curve
	var multiplier = Math.pow(2, numberOfOctaves * (value - 1));

	//Return frequency value between min and max.
	return maxValue * multiplier;
}

function makeDistortionCurve(value, context) {
	var k = value;
	var n_samples = context.sampleRate; //44.1kHz
	var curve = new Float32Array(n_samples);
	var deg = Math.PI / 180;
	var i = 0;
	var x;

	for (i; i < n_samples; ++i ) {
		x = i * 2 / n_samples - 1;
		curve[i] = (3 + k) * x * 6 * deg / (Math.PI + k * Math.abs(x));
	}

	return curve;
}