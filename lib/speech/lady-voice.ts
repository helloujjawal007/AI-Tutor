/**
 * Soft Indian Lady Teacher Speech Service (English Only)
 * High-Performance, Low-Latency Voice Engine with Voice Caching & Autoplay Guard
 */

export class IndianLadyVoice {
  private static cachedVoice: SpeechSynthesisVoice | null = null;
  private static watchdogTimer: any = null;
  private static initialized: boolean = false;

  /**
   * Pre-warm and hook voices changed event for instant voice resolution
   */
  public static init(): void {
    if (this.initialized || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    this.initialized = true;

    // Eagerly resolve voice once voices are available
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        this.cachedVoice = null;
        this.getBestVoice();
      };
    }
    this.getBestVoice();
  }

  /**
   * Fast O(1) Cached Voice Lookup for Indian English Female voice
   */
  public static getBestVoice(): SpeechSynthesisVoice | null {
    if (this.cachedVoice) return this.cachedVoice;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;

    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // Prioritize Indian English female voice profiles
    const indianEnglishFemalePatterns = [
      /veena/i,
      /kajal/i,
      /heera/i,
      /neerja/i,
      /sangeeta/i,
      /lekha/i,
      /kalpana/i,
      /google.*india.*female/i,
      /google.*en-in/i,
      /en-in/i,
      /india/i,
      /zira/i,
      /samantha/i,
      /karen/i,
      /female/i,
    ];

    for (let i = 0; i < indianEnglishFemalePatterns.length; i++) {
      const pattern = indianEnglishFemalePatterns[i];
      const match = voices.find((v) => pattern.test(v.name) || pattern.test(v.lang));
      if (match) {
        this.cachedVoice = match;
        return match;
      }
    }

    // Fallback to any English voice
    const englishFallback = voices.find((v) => v.lang.startsWith("en"));
    this.cachedVoice = englishFallback || voices[0] || null;
    return this.cachedVoice;
  }

  /**
   * Speak in sweet, soft English at a clear, patient teacher pace with watchdog recovery
   */
  public static speak(
    text: string,
    options: {
      onStart?: () => void;
      onEnd?: () => void;
      pitch?: number;
      rate?: number;
    } = {}
  ): void {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      options.onEnd?.();
      return;
    }

    if (this.watchdogTimer) clearTimeout(this.watchdogTimer);

    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = options.pitch ?? 1.12;
      utterance.rate = options.rate ?? 0.88;
      utterance.volume = 1.0;

      const voice = this.getBestVoice();
      if (voice) {
        utterance.voice = voice;
      }

      let hasEnded = false;
      const handleEnd = () => {
        if (hasEnded) return;
        hasEnded = true;
        if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
        options.onEnd?.();
      };

      utterance.onstart = () => {
        options.onStart?.();
      };

      utterance.onend = handleEnd;
      utterance.onerror = handleEnd;

      // Watchdog timeout to prevent speech lockup on browser audio stall
      const estimatedDurationMs = Math.max(1500, text.length * 110);
      this.watchdogTimer = setTimeout(handleEnd, estimatedDurationMs);

      window.speechSynthesis.speak(utterance);
    } catch {
      options.onEnd?.();
    }
  }

  public static stop(): void {
    if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Encouraging teacher praise phrases (Pure English only)
   */
  public static getRandomPraise(childName: string): string {
    const phrases = [
      `Wonderful job, ${childName}! Very good!`,
      `Brilliant, ${childName}! That is absolutely correct!`,
      `Superb, darling! You are learning so fast!`,
      `Excellent work! A shiny gold star for you! ⭐`,
      `Proud of you, ${childName}! That was wonderful!`,
      `Fantastic work, dear! You remembered it so well!`,
      `Well done, ${childName}! You are doing amazing!`,
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  /**
   * Gentle encouragement phrases (Pure English only)
   */
  public static getRandomEncouragement(childName: string): string {
    const phrases = [
      `Do not worry, ${childName}. Let us try once more together!`,
      `Almost there, darling! Listen carefully and repeat with teacher.`,
      `Do not worry, sweetie! Practice makes us perfect. Let us try again!`,
      `You are so close, ${childName}! Give it one more try!`,
      `Listen once more carefully, darling, and let us do it together!`,
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  /**
   * Teacher greeting (Pure English only)
   */
  public static getGreeting(childName: string, subjectTitle: string): string {
    return `Hello ${childName}! I am your teacher. Today we will learn ${subjectTitle} with lots of fun! Are you ready?`;
  }
}
