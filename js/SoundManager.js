import * as THREE from 'three';

export class SoundManager {
    constructor() {
        this.audioContext = null;
        this.lastPlayTime = 0;
        this.minInterval = 30;
        this.listener = null;
    }

    init() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    initListener(camera) {
        this.listener = new THREE.AudioListener();
        camera.add(this.listener);
    }

    ensureContext() {
        if (!this.audioContext) {
            this.init();
        }
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    playCollision(intensity = 1) {
        this.ensureContext();

        const now = Date.now();
        if (now - this.lastPlayTime < this.minInterval) return;
        this.lastPlayTime = now;

        const ctx = this.audioContext;

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        const freq = Math.min(200, 120 + intensity * 8);
        oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + 0.12);

        oscillator.type = 'triangle';

        const volume = Math.min(0.5, Math.max(0.05, intensity * 0.05));
        gainNode.gain.setValueAtTime(volume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.15);
    }

    startMissileSound() {
        this.ensureContext();

        const ctx = this.audioContext;

        // Son de propulseur plus riche avec plusieurs couches

        // Couche 1: Basse fréquence (rumble)
        const osc1 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(60, ctx.currentTime);

        // Couche 2: Moyenne fréquence (whine)
        const osc2 = ctx.createOscillator();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(180, ctx.currentTime);

        // Couche 3: Bruit (hiss) - simulé avec oscillateur haute fréquence
        const osc3 = ctx.createOscillator();
        osc3.type = 'sawtooth';
        osc3.frequency.setValueAtTime(2000, ctx.currentTime);

        // LFO pour modulation de la fréquence (effet de turbulence)
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(8, ctx.currentTime);
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(10, ctx.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(osc1.frequency);
        lfoGain.connect(osc2.frequency);

        // Gains individuels
        const gain1 = ctx.createGain();
        gain1.gain.setValueAtTime(0.08, ctx.currentTime);

        const gain2 = ctx.createGain();
        gain2.gain.setValueAtTime(0.03, ctx.currentTime);

        const gain3 = ctx.createGain();
        gain3.gain.setValueAtTime(0.01, ctx.currentTime);

        // Filtre pour adoucir le son
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, ctx.currentTime);
        filter.Q.setValueAtTime(1, ctx.currentTime);

        // Gain principal
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.15, ctx.currentTime);

        // Connexions
        osc1.connect(gain1);
        osc2.connect(gain2);
        osc3.connect(gain3);

        gain1.connect(filter);
        gain2.connect(filter);
        gain3.connect(filter);

        filter.connect(masterGain);
        masterGain.connect(ctx.destination);

        // Démarrer
        osc1.start(ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc3.start(ctx.currentTime);
        lfo.start(ctx.currentTime);

        return { oscillators: [osc1, osc2, osc3, lfo], masterGain, ctx };
    }

    stopMissileSound(sound) {
        if (!sound) return;

        const { oscillators, masterGain, ctx } = sound;

        // Fade out rapide
        masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

        setTimeout(() => {
            oscillators.forEach(osc => {
                try { osc.stop(); } catch (e) {}
            });
        }, 120);
    }

    playExplosion() {
        this.ensureContext();

        const ctx = this.audioContext;

        // Explosion en plusieurs couches

        // Couche 1: Impact initial (basse fréquence)
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(80, ctx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.3);

        const gain1 = ctx.createGain();
        gain1.gain.setValueAtTime(0.5, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

        osc1.connect(gain1);
        gain1.connect(ctx.destination);

        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.4);

        // Couche 2: Bruit blanc (debris/shrapnel)
        const bufferSize = ctx.sampleRate * 0.5;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.4, ctx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(1000, ctx.currentTime);
        noiseFilter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.5);
        noiseFilter.Q.setValueAtTime(0.5, ctx.currentTime);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);

        noise.start(ctx.currentTime);

        // Couche 3: Crackle haute fréquence
        const crackleBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
        const crackleData = crackleBuffer.getChannelData(0);

        for (let i = 0; i < crackleData.length; i++) {
            crackleData[i] = Math.random() > 0.95 ? (Math.random() * 2 - 1) : 0;
        }

        const crackle = ctx.createBufferSource();
        crackle.buffer = crackleBuffer;

        const crackleGain = ctx.createGain();
        crackleGain.gain.setValueAtTime(0.2, ctx.currentTime);
        crackleGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

        crackle.connect(crackleGain);
        crackleGain.connect(ctx.destination);

        crackle.start(ctx.currentTime);
    }
}

// Singleton
export const soundManager = new SoundManager();
