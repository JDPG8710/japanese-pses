import { GameTutorial } from './GameTutorial.js';

export class RunTutorial {
  constructor(api) { this.api = api; this.dialog = new GameTutorial(); this.paused = false; this.generation = 0; }
  cancel() { this.generation++; this.paused = false; this.dialog.cancel(); }
  async open(run, description) {
    if (this.paused) return false;
    const generation = this.generation, started = Date.now();
    this.paused = true;
    try {
      if (run.ranked) await this.api('tutorial', { id: run.id, revision: run.revision, action: 'pause' });
      if (generation !== this.generation) return false;
      if (!await this.dialog.show(description) || generation !== this.generation) return false;
      if (run.ranked) {
        const state = await this.api('tutorial', { id: run.id, revision: run.revision, action: 'resume' });
        if (generation !== this.generation) return false;
        if (state.paused) throw new Error('TUTORIAL_RESUME_FAILED');
        run.expiresAt = state.expiresAt;
      } else run.expiresAt += Math.max(0, Date.now() - started);
      return true;
    } finally { if (generation === this.generation) this.paused = false; }
  }
}
