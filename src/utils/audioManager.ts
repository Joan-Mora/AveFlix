/**
 * Singleton para gestión de audio global del juego.
 * Maneja música de fondo (BGM) en bucle y efectos de sonido (SFX) mediante archivos MP3 reales.
 */
class AudioManager {
  private bgm: HTMLAudioElement | null = null;
  private isMuted: boolean = false;
  private currentBgmType: string | null = null;

  // Mapa de recursos de audio sugeridos
  private sfxMap: Record<string, string> = {
    'click': '/assets/audio/sfx_click.mp3',
    'success': '/assets/audio/sfx_success.mp3',
    'error': '/assets/audio/sfx_error.mp3',
    'wrong': '/assets/audio/sfx_error.mp3',       // alias
    'tick': '/assets/audio/sfx_tick.mp3',
    'timeup': '/assets/audio/sfx_timeup.mp3',
    'swoosh': '/assets/audio/sfx_swoosh.mp3',
  };

  private bgmMap: Record<string, string> = {
    'menu': '/assets/audio/bgm_menu.mp3',
    'tension': '/assets/audio/bgm_tension.mp3',
    'question': '/assets/audio/bgm_tension.mp3',  // alias
    'victory': '/assets/audio/bgm_victory.mp3',
  };

  constructor() {}

  /** Dummy interact context para no romper StartScreen.tsx (HTMLAudio se auto-desbloquea tras click real en el DOM de todas formas) */
  public async ensureContext() {
    return Promise.resolve();
  }

  setMute(mute: boolean): void {
    this.isMuted = mute;
    if (this.bgm) {
      this.bgm.muted = mute;
    }
  }

  /** Reproduce un SFX mapeado o url directo */
  public playSfx(type: 'click' | 'success' | 'error' | 'tick' | 'timeup' | 'swoosh'): void {
    if (this.isMuted) return;
    const url = this.sfxMap[type];
    if (!url) return;

    const sfx = new Audio(url);
    // timeup is a full music track — play at lower volume; tick is subtle; others at 0.85
    sfx.volume = type === 'tick' ? 0.25 : type === 'timeup' ? 0.55 : 0.85;
    sfx.play().catch(e => console.warn('[AudioManager] SFX bloqueado:', e));
  }

  /** Reproduce BGM mapeado */
  public playBgm(type: 'menu' | 'tension' | 'victory' | null): void {
    if (!type) {
      this.stopBgm();
      return;
    }
    
    if (this.currentBgmType === type) return;

    this.stopBgm();
    this.currentBgmType = type;

    const url = this.bgmMap[type];
    if (!url) return;

    this.bgm = new Audio(url);
    this.bgm.loop = true;
    this.bgm.muted = this.isMuted;
    this.bgm.volume = 0.4;

    this.bgm.play().catch(e => console.warn('[AudioManager] BGM bloqueado:', e));
  }

  public stopBgm(): void {
    if (this.bgm) {
      this.bgm.pause();
      this.bgm.currentTime = 0;
      this.bgm = null;
    }
    this.currentBgmType = null;
  }

  // --- Capa de compatibilidad legacy para GameContext ---
  public playLegacyBgm(url?: string) {
    if (!url) {
      this.stopBgm();
      return;
    }
    if (url.includes('intro.mp3')) this.playBgm('menu');
    else if (url.includes('victoria.mp3')) this.playBgm('victory');
    else this.playBgm('tension');
  }

  public playLegacySfx(url?: string) {
    if (!url) return;
    if (url.includes('click.mp3')) this.playSfx('click');
    else if (url.includes('success.mp3')) this.playSfx('success');
    else if (url.includes('error.mp3') || url.includes('fail.mp3')) this.playSfx('error');
    else this.playSfx('click');
  }
}

export const audio = new AudioManager();
