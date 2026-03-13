/**
 * Singleton para gestión de audio global del juego.
 * Maneja música de fondo (BGM) en bucle y efectos de sonido (SFX).
 * Compatible con la política de autoplay de los navegadores modernos.
 */
class AudioManager {
  private bgm: HTMLAudioElement | null = null;
  private isMuted: boolean = false;

  /** Sincroniza el estado de mute con el contexto React */
  setMute(mute: boolean): void {
    this.isMuted = mute;
    if (this.bgm) {
      this.bgm.muted = mute;
    }
  }

  /** Reproduce una música de fondo en bucle. Si ya suena la misma pista, no la reinicia. */
  playBgm(url?: string): void {
    if (!url) {
      this.bgm?.pause();
      return;
    }

    // Evita reiniciar la misma pista al re-renderizar
    if (this.bgm && this.bgm.src.endsWith(url)) return;

    // Detiene la pista anterior antes de cambiar
    if (this.bgm) {
      this.bgm.pause();
      this.bgm.currentTime = 0;
    }

    this.bgm = new Audio(url);
    this.bgm.loop = true;
    this.bgm.muted = this.isMuted;
    this.bgm.volume = 0.5;

    // Captura silenciosamente el bloqueo de autoplay del navegador
    this.bgm.play().catch((e: unknown) =>
      console.warn('[AudioManager] Autoplay BGM bloqueado por el navegador:', e)
    );
  }

  /** Reproduce un efecto de sonido puntual (no en bucle, no afectado por el BGM). */
  playSfx(url?: string): void {
    if (this.isMuted || !url) return;
    const sfx = new Audio(url);
    sfx.volume = 0.8;
    sfx.play().catch((e: unknown) =>
      console.warn('[AudioManager] Autoplay SFX bloqueado:', e)
    );
  }

  /** Detiene completamente el BGM actual */
  stopBgm(): void {
    if (this.bgm) {
      this.bgm.pause();
      this.bgm.currentTime = 0;
      this.bgm = null;
    }
  }
}

// Exportamos la instancia única (Singleton)
export const audio = new AudioManager();
