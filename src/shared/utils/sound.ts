// Sound utility for playing game audio effects
export class SoundManager {
  private static correctAudio: HTMLAudioElement | null = null;
  private static wrongAudio: HTMLAudioElement | null = null;
  private static initialized = false;

  // Initialize audio elements
  static initialize() {
    if (this.initialized) return;

    try {
      this.correctAudio = new Audio('/correct.mp3');
      this.wrongAudio = new Audio('/wrong.mp3');
      
      // Preload audio files
      this.correctAudio.preload = 'auto';
      this.wrongAudio.preload = 'auto';
      
      // Set volume to a reasonable level
      this.correctAudio.volume = 0.6;
      this.wrongAudio.volume = 0.6;
      
      this.initialized = true;
      console.log('[SOUND] Audio system initialized');
    } catch (error) {
      console.warn('[SOUND] Failed to initialize audio:', error);
    }
  }

  // Play correct move sound
  static playCorrect() {
    this.initialize();
    
    if (this.correctAudio) {
      try {
        // Reset audio to beginning in case it's already playing
        this.correctAudio.currentTime = 0;
        this.correctAudio.play().catch(error => {
          console.warn('[SOUND] Failed to play correct sound:', error);
        });
      } catch (error) {
        console.warn('[SOUND] Error playing correct sound:', error);
      }
    }
  }

  // Play wrong move sound
  static playWrong() {
    this.initialize();
    
    if (this.wrongAudio) {
      try {
        // Reset audio to beginning in case it's already playing
        this.wrongAudio.currentTime = 0;
        this.wrongAudio.play().catch(error => {
          console.warn('[SOUND] Failed to play wrong sound:', error);
        });
      } catch (error) {
        console.warn('[SOUND] Error playing wrong sound:', error);
      }
    }
  }

  // Set volume for all sounds (0.0 to 1.0)
  static setVolume(volume: number) {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    
    if (this.correctAudio) {
      this.correctAudio.volume = clampedVolume;
    }
    
    if (this.wrongAudio) {
      this.wrongAudio.volume = clampedVolume;
    }
  }

  // Mute/unmute all sounds
  static setMuted(muted: boolean) {
    if (this.correctAudio) {
      this.correctAudio.muted = muted;
    }
    
    if (this.wrongAudio) {
      this.wrongAudio.muted = muted;
    }
  }
}