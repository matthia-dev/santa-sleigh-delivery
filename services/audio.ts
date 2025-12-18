
class AudioService {
  private ctx: AudioContext | null = null;
  private musicInterval: any = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  playThrust() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(40, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playCrash() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }

  playPickup() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playWin() {
    this.init();
    if (!this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; 
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + i * 0.1);
      gain.gain.setValueAtTime(0.1, this.ctx!.currentTime + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + i * 0.1 + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(this.ctx!.currentTime + i * 0.1);
      osc.stop(this.ctx!.currentTime + i * 0.1 + 0.3);
    });
  }

  // A robotic digital "Championship" recreated with oscillators
  playChampionshipVoice() {
    this.init();
    if (!this.ctx) return;
    // Syllables: Cham-pi-on-ship
    const syllables = [
      { f: 200, d: 0.15, n: true }, // Cham
      { f: 300, d: 0.1, n: false }, // pi
      { f: 250, d: 0.15, n: false }, // on
      { f: 150, d: 0.2, n: true }    // ship
    ];
    let time = this.ctx.currentTime;
    syllables.forEach(s => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = s.n ? 'square' : 'sawtooth';
      osc.frequency.setValueAtTime(s.f, time);
      gain.gain.setValueAtTime(0.1, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + s.d);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(time);
      osc.stop(time + s.d);
      time += s.d + 0.02;
    });
  }

  playTitleMusic() {
    this.init();
    if (!this.ctx) return;
    this.stopMusic();
    const melody = [261.63, 329.63, 392.00, 523.25, 440.00, 349.23, 329.63, 293.66];
    let i = 0;
    this.musicInterval = setInterval(() => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(melody[i % melody.length], this.ctx!.currentTime);
      gain.gain.setValueAtTime(0.03, this.ctx!.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start();
      osc.stop(this.ctx!.currentTime + 0.45);
      i++;
    }, 400);
  }

  playRankingMusic() {
    this.init();
    if (!this.ctx) return;
    this.stopMusic();
    const melody = [523.25, 493.88, 440.00, 392.00, 349.23, 329.63, 293.66, 261.63];
    let i = 0;
    this.musicInterval = setInterval(() => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(melody[i % melody.length], this.ctx!.currentTime);
      gain.gain.setValueAtTime(0.04, this.ctx!.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start();
      osc.stop(this.ctx!.currentTime + 0.3);
      i++;
    }, 300);
  }

  playJingleBells() {
    this.init();
    if (!this.ctx) return;
    this.stopMusic();
    const melody = [
      { f: 329.63, d: 0.2 }, { f: 329.63, d: 0.2 }, { f: 329.63, d: 0.4 },
      { f: 329.63, d: 0.2 }, { f: 329.63, d: 0.2 }, { f: 329.63, d: 0.4 },
      { f: 329.63, d: 0.2 }, { f: 392.00, d: 0.2 }, { f: 261.63, d: 0.2 }, { f: 293.66, d: 0.2 }, { f: 329.63, d: 0.8 }
    ];
    let time = this.ctx.currentTime;
    melody.forEach(note => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(note.f, time);
      gain.gain.setValueAtTime(0.02, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + note.d);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(time);
      osc.stop(time + note.d);
      time += note.d + 0.05;
    });
  }
}

export const audio = new AudioService();
