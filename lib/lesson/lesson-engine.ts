/*
 * Tables Buddy Lesson Engine
 * Core tutoring logic with speech recognition, evaluation, and progression
 */

export type RecitationStyle = "indian" | "times" | "hindi";
export type LearningMode = "listen" | "repeat-after-me" | "recall" | "mixed-challenge" | "parent-pick";
export type EscalationLevel = "normal" | "slow" | "parts";
export type LessonState =
  | "IDLE"
  | "GREETING"
  | "SPEAKING"
  | "LISTENING"
  | "EVALUATING"
  | "PRAISE"
  | "RETRY"
  | "NEXT_LINE"
  | "RECAP"
  | "SUMMARY";

export interface LessonConfig {
  childName: string;
  mode: LearningMode;
  style: RecitationStyle;
  tablesStart: number;
  tablesEnd: number;
  maxRetries: number;
  unlimitedRetries: boolean;
  speechSpeed: number;
  speechPitch: number;
}

export interface EvaluationResult {
  correct: boolean;
  score: number;
  heard: string;
  reason: "ok" | "partial" | "wrong_number" | "silent";
  escalation: EscalationLevel;
}

export class LessonEngine {
  private config: LessonConfig;
  private supabase: any;
  private state: LessonState = "IDLE";
  private currentLineIndex = 0;
  private currentTable = 2;
  private retryCount = 0;
  private attempts: any[] = [];
  private recognition: any = null;
  private utterance: any = null;
  public onLineComplete: ((result: { line: string; mastered: boolean }) => void) = () => {};
  public onSessionComplete: ((summary: {
    linesCompleted: number;
    linesTotal: number;
    starsEarned: number;
  }) => void) = () => {};

  /**
   * Speak text using Web Speech API
   */
  speak(text: string): Promise<void> {
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = this.config.speechSpeed;
      utterance.pitch = this.config.speechPitch;
      utterance.onend = () => resolve();
      speechSynthesis.speak(utterance);
    });
  }

  /**
   * Session start time for response time tracking
   */
  private sessionStartTime: number = Date.now();

  /**
   * Match spoken text against expected line
   */
  private matchSpoken(expected: string, transcriptAlternatives: string[]) {
    if (transcriptAlternatives.length === 0) {
      return { correct: false, score: 0, heard: "", reason: "silent" };
    }

    let bestResult: { correct: boolean; score: number; heard: string; reason: string } = {
      correct: false,
      score: 0,
      heard: "",
      reason: "wrong_number",
    };

    for (const transcript of transcriptAlternatives) {
      const processedTranscript = this.preprocessText(transcript);
      const processedExpected = this.preprocessText(expected);

      if (processedTranscript === processedExpected) {
        return { correct: true, score: 100, heard: transcript, reason: "ok" };
      }

      const numExpected = this.extractNumber(processedExpected);
      const numHeard = this.extractNumber(processedTranscript);

      if (numExpected !== null && numHeard !== null) {
        if (numExpected === numHeard) {
          return { correct: true, score: 95, heard: transcript, reason: "ok" };
        }
      }

      const heardWithHomophones = this.applyHomophoneMapping(processedTranscript);
      const expectedWithHomophones = this.applyHomophoneMapping(processedExpected);

      if (heardWithHomophones === expectedWithHomophones) {
        return { correct: true, score: 90, heard: transcript, reason: "ok" };
      }

      const tokenScore = this.fuzzyTokenMatch(processedTranscript, processedExpected);
      if (tokenScore >= 0.8) {
        const score = tokenScore * 100;
        if (score > bestResult.score) {
          bestResult = { correct: true, score, heard: transcript, reason: "partial" };
        }
      }
    }

    return bestResult;
  }

  /**
   * Transition to evaluation state
   */
  private transitionToEvaluation(expectedLine: string, lineKey: string, result: { correct: boolean; score: number; heard: string; reason: string }): void {
    this.state = "EVALUATING";
    this.recordAttempt(this.config.childName, this.currentTable, this.currentLineIndex + 1, result.correct, 1);
    this.onLineComplete?.({ line: expectedLine, mastered: result.correct });
  }

  /**
   * Show skip and hear again buttons
   */
  private showSkipAndHearButtons(lineKey: string, expectedLine: string): void {
    // In a full implementation, this would display UI buttons
    // For now, just transition to next line after a delay
    setTimeout(() => {
      this.currentLineIndex++;
      if (this.currentLineIndex < 10) {
        this.startLine();
      } else {
        this.completeTable();
      }
    }, 3000);
  }

  /**
   * Preprocess text: lowercase, strip punctuation, remove fillers, normalize connectors
   */
  private preprocessText(text: string): string {
    if (!text) return "";
    let result = text.toLowerCase();
    result = result.replace(/[^\w\s-]/g, " ");
    const fillerWords = ["um", "uh", "er", "ah", "like", "i mean", "you know"];
    const fillerRegex = new RegExp(`\\b(${fillerWords.join("|")})\\b`, "g");
    result = result.replace(fillerRegex, " ");
    const connectorMap: Record<string, string> = {
      "into": "times",
      "multiplied by": "times",
      "times": "times",
      "x": "times",
      "are": "are",
      "is": "is",
      "equals": "is",
      "=": "is",
      "ones/one": "ones",
      "twos/two": "twos",
      "threes/three": "threes",
      "dooni": "two",
      "tiya": "two",
      "chauka": "four",
    };
    for (const [key, value] of Object.entries(connectorMap)) {
      const regex = new RegExp(`\\b${key}\\b`, "g");
      result = result.replace(regex, value);
    }
    result = result.replace(/\s+/g, " ").trim();
    return result;
  }

  /**
   * Extract number from preprocessed text
   */
  private extractNumber(text: string): number | null {
    const digitMatch = text.match(/\b(\d+)\b/);
    if (digitMatch) return parseInt(digitMatch[1], 10);
    const wordValue = this.wordsToNumber(text);
    if (wordValue !== null) return wordValue;
    const patternMatch = text.match(/(\d+)\s+times\s+\d+/i);
    if (patternMatch) return parseInt(patternMatch[1], 10);
    return null;
  }

  /**
   * Convert word representation to number
   */
  private wordsToNumber(words: string): number | null {
    const wordNumMap: Record<string, number> = {
      "zero": 0,
      "one": 1,
      "two": 2,
      "three": 3,
      "four": 4,
      "five": 5,
      "six": 6,
      "seven": 7,
      "eight": 8,
      "nine": 9,
      "ten": 10,
      "eleven": 11,
      "twelve": 12,
      "thirteen": 13,
      "fourteen": 14,
      "fifteen": 15,
      "sixteen": 16,
      "seventeen": 17,
      "twenty": 20,
      "thirty": 30,
      "forty": 40,
      "fifty": 50,
      "sixty": 60,
      "seventy": 70,
      "eighty": 80,
      "ninety": 90,
    };

    const match = words.match(/^(\d+|\w+)\s+hundred\s+(\d+|\w+)$/i);
    if (match) {
      const first = wordNumMap[match[1].toLowerCase()] || 0;
      const second = wordNumMap[match[2].toLowerCase()] || 0;
      return first * 100 + second;
    }

    const tokens = words.replace(/-/g, " ").split(/\s+/);
    let total = 0;
    let current = 0;

    for (const token of tokens) {
      const value = wordNumMap[token.toLowerCase()];
      if (value === undefined) return null;
      if (value >= 100) {
        current = current || 1;
        total += current * value;
        current = 0;
      } else if (value >= 20) {
        current = value;
      } else {
        current += value;
      }
    }

    return total + current;
  }

  /**
   * Apply homophone mapping to normalize common speech recognition errors
   */
  private applyHomophoneMapping(text: string): string {
    const homophoneMap: Record<string, string> = {
      "to": "2",
      "too": "2",
      "two": "2",
      "for": "4",
      "four": "4",
      "forr": "4",
      "ate": "8",
      "eight": "8",
      "won": "1",
      "one": "1",
      "tree": "3",
      "three": "3",
      "six": "6",
      "sex": "6",
      "seven": "7",
    };
    const tokens = text.replace(/-/g, " ").split(/\s+/);
    const mapped = tokens.map(token => homophoneMap[token.toLowerCase()] || token);
    return mapped.join(" ");
  }

  /**
   * Token-level fuzzy match using overlap ratio
   */
  private fuzzyTokenMatch(a: string, b: string): number {
    const tokensA = a.split(/\s+/);
    const tokensB = b.split(/\s+/);
    if (tokensA.length === 0 && tokensB.length === 0) return 1.0;
    if (tokensA.length === 0 || tokensB.length === 0) return 0.0;
    const matchingTokens = tokensA.filter(token => tokensB.includes(token));
    return matchingTokens.length / Math.max(tokensA.length, tokensB.length);
  }

  /**
   * Initialize the lesson engine
   */
  constructor(config: LessonConfig, supabase: any) {
    this.config = config;
    this.supabase = supabase;
    this.currentTable = config.tablesStart;
  }

  /**
   * Start the lesson session
   */
  async start(): Promise<void> {
    this.state = "GREETING";
    this.currentLineIndex = 0;
    this.retryCount = 0;
    this.attempts = [];

    // Greet the child
    await this.greet();

    // Start the first table
    await this.startTable(this.currentTable);
  }

  /**
   * Greet the child and set up the session
   */
  private async greet(): Promise<void> {
    const greeting = `Hello ${this.config.childName}! Ready to learn tables? Today we will learn the table of ${this.currentTable}.`;
    await this.speak(greeting);
    // Wait for TTS to finish, then transition to first line
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.state = "SPEAKING";
    this.startLine();
  }

  /**
   * Start a specific table
   */
  private startTable(table: number): void {
    this.currentTable = table;
    // In a real implementation, we'd load the table lines from the database
    // For now, just transition to the first line
    this.state = "SPEAKING";
    this.startLine();
  }

  /**
   * Start the current line's speaking/listening loop
   */
  startLine(): void {
    if (this.currentLineIndex >= 10) { // Default: 10 lines per table
      this.completeTable();
      return;
    }

    const multiplicand = this.currentTable;
    const multiplier = this.currentLineIndex + 1;
    const lineKey = `${multiplicand}×${multiplier}`;

    // Generate the expected line based on style
    const expectedLine = this.generateExpectedLine(multiplicand, multiplier);

    // Speak the line
    this.speak(expectedLine).then(() => {
      // After speaking, start listening
      this.state = "LISTENING";
      this.startListening(expectedLine, lineKey);
    }).catch(err => {
      console.error("TTS error:", err);
      this.transitionToEvaluation(expectedLine, lineKey, { correct: false, score: 0, heard: "", reason: "silent" });
    });
  }

  /**
   * Generate the expected line based on the recitation style
   */
  private generateExpectedLine(multiplicand: number, multiplier: number): string {
    const product = multiplicand * multiplier;

    switch (this.config.style) {
      case "indian":
        return ` ${multiplicand} ${this.wordToIndian(multiplier)} are ${this.wordToIndian(product)}.`;
      case "times":
        return ` ${multiplicand} times ${multiplier} is ${this.wordToIndian(product)}.`;
      case "hindi":
        return `सात एकम सात`; // Simplified - would need Hindi number words
      default:
        return "Seven ones are seven.";
    }
  }

  private wordToIndian(num: number): string {
    const words = ["", "ek", "do", "teen", "char", "paanch", "chhah", "saat", "aath", "nau"];
    return words[num] || "";
  }

  /**
   * Start listening for the child's response
   */
  startListening(expectedLine: string, lineKey: string): void {
    // Check if Web Speech Recognition is supported
    const SpeechRecognition: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.transitionToTypeMode(expectedLine, lineKey);
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = "en-IN";
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 5;

    this.recognition.onstart = () => {
      this.state = "LISTENING";
      // Visual feedback - pulsing mic etc.
    };

    this.recognition.onspeechend = () => {
      // Stop listening after child stops speaking
      this.recognition.stop();
    };

    this.recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join(" ");

      const alternatives = event.results
        .map((result: any) => result[0].transcript)
        .filter((t: string) => t.length > 0);

      if (alternatives.length > 0) {
        this.state = "EVALUATING";
        this.evaluateResponse(transcript, alternatives, expectedLine, lineKey);
      } else {
        // No speech detected
        this.transitionToEvaluation(expectedLine, lineKey, { correct: false, score: 0, heard: "", reason: "silent" });
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "no-speech" || event.error === "aborted") {
        // Prompt again
        this.speak("I'm waiting, you can say it!");
        this.startListening(expectedLine, lineKey);
      } else {
        this.transitionToTypeMode(expectedLine, lineKey);
      }
    };

    this.recognition.start();
  }

  /**
   * Evaluate the child's response against the expected line
   */
  private async evaluateResponse(
    transcript: string,
    alternatives: string[],
    expectedLine: string,
    lineKey: string
  ): Promise<void> {
    const result = this.matchSpoken(expectedLine, alternatives);

    // Record the attempt
    const attempt = {
      tableLine: lineKey,
      expected: expectedLine,
      heard: transcript,
      correct: result.correct,
      attemptNumber: this.retryCount + 1,
      responseTimeMs: Date.now() - (this.sessionStartTime || Date.now()),
      retryLevel: this.getEscalationLevel(),
    };
    this.attempts.push(attempt);

    // Update SRS progress
    const wasCorrect = result.correct && this.retryCount === 0;
    await this.recordAttempt("child-id", this.currentTable, this.currentLineIndex + 1, wasCorrect, this.retryCount + 1);

    // Create EvaluationResult with escalation level
    const evaluationResult: EvaluationResult = {
      correct: result.correct,
      score: result.score,
      heard: result.heard,
      reason: result.reason as "ok" | "partial" | "wrong_number" | "silent",
      escalation: this.getEscalationLevel(),
    };

    if (result.correct) {
      this.handleCorrect(evaluationResult, lineKey);
    } else {
      this.handleIncorrect(evaluationResult, lineKey, expectedLine);
    }
  }

  private getEscalationLevel(): EscalationLevel {
    if (this.retryCount <= 1) return "normal";
    if (this.retryCount <= 3) return "slow";
    return "parts";
  }

  /**
   * Handle correct answer - show praise and move to next line
   */
  private handleCorrect(result: EvaluationResult, lineKey: string): void {
    // Show praise animation
    this.showPraise();

    // Record correct attempt and update SRS
    this.transitionToNextLine(lineKey, true);
  }

  /**
   * Handle incorrect answer - gentle encouragement and retry
   */
  private handleIncorrect(result: EvaluationResult, lineKey: string, expectedLine: string): void {
    if (this.retryCount < this.config.maxRetries || this.config.unlimitedRetries) {
      // Escalate and repeat
      this.retryCount++;
      this.speakLineWithEscalation(expectedLine, this.getEscalationLevel());
    } else {
      // Max retries exceeded - mark as weak and move on
      this.markAsWeakAndMoveOn(lineKey, expectedLine);
    }
  }

  private speakLineWithEscalation(expectedLine: string, level: EscalationLevel): void {
    switch (level) {
      case "normal": this.speak(expectedLine); break;
      case "slow": this.speakSlowly(expectedLine); break;
      case "parts": this.speakInParts(expectedLine); break;
    }
  }

  private speakSlowly(text: string): void {
    // Use TTS with slow speed
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.5;
    utterance.pitch = this.config.speechPitch;
    speechSynthesis.speak(utterance);
  }

  private speakInParts(text: string): void {
    // Split and say in parts - e.g., "seven... sevens... are... forty-nine"
    const parts = text.split(" ");
    let index = 0;

    const sayNext = () => {
      if (index < parts.length) {
        const utterance = new SpeechSynthesisUtterance(parts[index]);
        utterance.rate = 0.8;
        utterance.pitch = this.config.speechPitch;
        speechSynthesis.speak(utterance);
        index++;
        setTimeout(sayNext, 500);
      }
    };

    sayNext();
  }

  /**
   * Mark line as weak and move on with skip/hear again buttons
   */
  private async markAsWeakAndMoveOn(lineKey: string, expectedLine: string): Promise<void> {
    // Update SRS - move back to box 1
    await this.recordAttempt("child-id", this.currentTable, this.currentLineIndex + 1, false, this.retryCount + 1);

    // Show skip and hear again buttons
    this.showSkipAndHearButtons(lineKey, expectedLine);
  }

  /**
   * Show praise animation and move to next line
   */
  private showPraise(): void {
    // Confetti/star animation
    this.currentLineIndex++;

    if (this.currentLineIndex < 10) {
      // Move to next line
      this.startLine();
    } else {
      // Complete the table
      this.completeTable();
    }
  }

  /**
   * Complete a full table and run recap
   */
  completeTable(): void {
    this.state = "RECAP";

    // Recite the whole table
    this.reciteFullTable();

    // Wait for TTS to finish, then child recites
    setTimeout(() => {
      this.state = "SUMMARY";
      this.runRandomQuiz();
    }, 3000);
  }

  private reciteFullTable(): void {
    const lines: string[] = [];
    for (let i = 1; i <= 10; i++) {
      const product = this.currentTable * i;
      lines.push(`${this.currentTable} times ${i} is ${product}`);
    }

    // Speak all lines with delay
    let index = 0;
    const speakNext = () => {
      if (index < lines.length) {
        const utterance = new SpeechSynthesisUtterance(lines[index]);
        utterance.rate = 0.8;
        utterance.pitch = this.config.speechPitch;
        speechSynthesis.speak(utterance);
        index++;
        setTimeout(speakNext, 500);
      }
    };

    speakNext();
  }

  private runRandomQuiz(): void {
    // Quick random-order quiz from the table
    setTimeout(() => {
      if (this.onSessionComplete) {
        this.onSessionComplete({
          linesCompleted: this.currentLineIndex,
          linesTotal: 10,
          starsEarned: this.calculateStars(),
        });
      }
      this.state = "SUMMARY";
    }, 1000);
  }

  private calculateStars(): number {
    let stars = 0;
    for (const attempt of this.attempts) {
      if (attempt.correct) {
        stars += 1; // 1 star for correct on later tries
        if (attempt.attemptNumber === 1) {
          stars += 2; // Additional 2 for first-try mastery
        }
      }
    }
    return stars;
  }

  /**
   * Transition to next line
   */
  private transitionToNextLine(lineKey: string, mastered: boolean): void {
    // Update UI - mark line as mastered (green)
    this.currentLineIndex++;

    if (this.currentLineIndex < 10) {
      this.startLine();
    } else {
      this.completeTable();
    }
  }

  /**
   * Transition to type mode (fallback when speech not available)
   */
  private transitionToTypeMode(expectedLine: string, lineKey: string): void {
    this.state = "EVALUATING";
    this.evaluateResponse("", [], expectedLine, lineKey);
  }

  /**
   * End the session and provide summary
   */
  async end(): Promise<void> {
    this.state = "SUMMARY";

    const summary = {
      linesCompleted: this.currentLineIndex,
      linesTotal: 10,
      starsEarned: this.calculateStars(),
    };

    if (this.onSessionComplete) {
      this.onSessionComplete(summary);
    }
  }

  private recordAttempt = async (childId: string, multiplicand: number, multiplier: number, wasCorrect: boolean, attemptNumber: number) => {
    const { data: progress, error } = await this.supabase
      .from("table_lines_progress")
      .select("*")
      .eq("child_id", childId)
      .eq("multiplicand", multiplicand)
      .eq("multiplier", multiplier)
      .single();

    if (error || !progress) {
      await this.supabase.from("table_lines_progress").insert({
        child_id: childId,
        multiplicand,
        multiplier: wasCorrect ? 2 : 1,
        mastered: false,
        last_seen: new Date().toISOString(),
        next_due: new Date(Date.now() + 86400000).toISOString(), // 1 day later
        weak_count: wasCorrect ? 0 : 1,
      });
      return;
    }

    const newBox = this.updateLeitnerBox(progress.box, wasCorrect);
    const mastered = this.isLineMastered(newBox);

    await this.supabase.from("table_lines_progress").update({
      box: newBox,
      mastered,
      last_seen: new Date().toISOString(),
      next_due: mastered ? null : this.calculateNextDue(newBox).toISOString(),
      weak_count: wasCorrect ? 0 : progress.weak_count + 1,
    }).eq("id", progress.id);
  };

  private updateLeitnerBox(currentBox: number, wasCorrect: boolean, maxBox = 5): number {
    if (wasCorrect) return Math.min(currentBox + 1, maxBox);
    return 1;
  }

  private isLineMastered(box: number): boolean {
    return box >= 4;
  }

  private calculateNextDue(box: number, baseDate: Date = new Date()): Date {
    const daysMap: Record<number, number> = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 14 };
    const days = daysMap[box] || 1;
    const result = new Date(baseDate);
    result.setDate(result.getDate() + days);
    return result;
  }
}
