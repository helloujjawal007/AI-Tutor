/**
 * Soft Indian Lady Teacher Speech Service (English Only)
 * Provides gentle, encouraging, and clear Indian female voice delivery in pure English for CBSE learners.
 */

export class IndianLadyVoice {
  private static cachedVoice: SpeechSynthesisVoice | null = null;

  /**
   * Find the warmest Indian English female voice available on the device
   */
  public static getBestVoice(): SpeechSynthesisVoice | null {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;

    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // Prioritize Indian English female voice profiles (English only)
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

    for (const pattern of indianEnglishFemalePatterns) {
      const match = voices.find((v) => pattern.test(v.name) || pattern.test(v.lang));
      if (match) {
        this.cachedVoice = match;
        return match;
      }
    }

    // Fallback to any English voice
    const englishFallback = voices.find((v) => v.lang.startsWith("en"));
    return englishFallback || voices[0] || null;
  }

  /**
   * Speak in sweet, soft English at a clear, patient teacher pace
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

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    // Gentle, pleasant Indian teacher English pitch and clear pacing
    utterance.pitch = options.pitch ?? 1.12;
    utterance.rate = options.rate ?? 0.88;
    utterance.volume = 1.0;

    const voice = this.getBestVoice();
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => {
      options.onStart?.();
    };

    utterance.onend = () => {
      options.onEnd?.();
    };

    utterance.onerror = () => {
      options.onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  }

  public static stop(): void {
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
