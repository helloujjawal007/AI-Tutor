"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabaseBrowser } from "@/app/lib/supabase-browser";
import { LessonEngine, LessonConfig } from "@/lib/lesson/lesson-engine";

export default function LessonScreen() {
  const [config, setConfig] = useState<LessonConfig>({
    childName: "Aarav",
    mode: "repeat-after-me" as const,
    style: "indian" as const,
    tablesStart: 2,
    tablesEnd: 10,
    maxRetries: 5,
    unlimitedRetries: false,
    speechSpeed: 1.0,
    speechPitch: 1.0,
  });

  const [state, setState] = useState<"IDLE" | "SPEAKING" | "LISTENING" | "EVALUATING" | "NEXT_LINE" | "SUMMARY">("IDLE");
  const [currentLine, setCurrentLine] = useState("");
  const [heard, setHeard] = useState("");
  const [resultText, setResultText] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [tables, setTables] = useState<Array<{n: number; products: number[]}>>([]);
  const [tableIndex, setTableIndex] = useState(0);

  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<any>(null);

  // Load tables based on config
  useEffect(() => {
    const lines = [];
    for (let t = config.tablesStart; t <= config.tablesEnd; t++) {
      const products = [];
      for (let m = 1; m <= 10; m++) {
        products.push(t * m);
      }
      lines.push({ n: t, products });
    }
    setTables(lines);
    setTableIndex(0);
  }, [config.tablesStart, config.tablesEnd]);

  // Initialize lesson engine
  useEffect(() => {
    const engine = new LessonEngine(config, supabaseBrowser);

    engine.onLineComplete = (result: { line: string; mastered: boolean }) => {
      setCurrentLine(result.line);
      setState(result.mastered ? "NEXT_LINE" : "IDLE");
    };

    engine.onSessionComplete = (summary: {
      linesCompleted: number;
      linesTotal: number;
      starsEarned: number;
    }) => {
      setState("SUMMARY");
      alert(`Session Complete!\nLines: ${summary.linesCompleted}/${summary.linesTotal}\nStars: ${summary.starsEarned}`);
    };

    return () => {
      engine.end();
    };
  }, [config]);

  // Speak function
  const speak = useCallback((text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = config.speechSpeed;
    utterance.pitch = config.speechPitch;
    speechSynthesis.speak(utterance);
  }, [config.speechSpeed, config.speechPitch]);

  // Start table
  const startTable = useCallback((tableNum: number) => {
    setState("SPEAKING");
    setRetryCount(0);
    speak(`Hello ${config.childName}! Ready to learn the table of ${tableNum}?`);
    setCurrentLine(`${tableNum} times 1 is ${tableNum}`);
  }, [config.childName, config.speechSpeed, config.speechPitch, speak]);

  // Start listening
  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setResultText("Speech recognition not supported in this browser. Use type mode below.");
      setState("SUMMARY");
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = "en-IN";
    recognitionRef.current.interimResults = true;
    recognitionRef.current.maxAlternatives = 5;

    recognitionRef.current.onstart = () => {
      setState("LISTENING");
    };

    recognitionRef.current.onspeechend = () => {
      recognitionRef.current.stop();
    };

    recognitionRef.current.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join(" ");
      const alternatives = event.results
        .map((r: any) => r[0].transcript)
        .filter((t: string) => t.length > 0);

      if (alternatives.length > 0) {
        evaluateResponse(transcript, alternatives);
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error("STT error:", event.error);
      if (event.error === "no-speech") {
        setTimeout(startListening, 2000);
      } else {
        setResultText("Listening error. Try again.");
      }
    };

    recognitionRef.current.start();
  }, []); // Empty dependency - uses refs

  // Evaluate response
  const evaluateResponse = useCallback((transcript: string, alternatives: string[]) => {
    setState("EVALUATING");

    const result = matchSpoken(currentLine, alternatives);
    setHeard(transcript);
    setResultText(result.reason);

    if (result.correct) {
      setResultText("Shabash! Perfect!");
      setRetryCount(0);

      setTimeout(() => {
        if (tableIndex < tables.length - 1) {
          setTableIndex(prev => prev + 1);
          setState("SPEAKING");
          setCurrentLine(`${tables[tableIndex].n} times 1 is ${tables[tableIndex].n}`);
        } else {
          setState("SUMMARY");
        }
      }, 2000);
    } else {
      handleIncorrect(result);
    }
  }, [currentLine, tableIndex, tables]);

  // Handle incorrect with escalation
  const handleIncorrect = useCallback((result: any) => {
    setRetryCount(prev => prev + 1);

    // Escalate based on attempt number
    let textToSpeak = currentLine;
    if (retryCount >= 3) {
      textToSpeak = "Slowly: " + currentLine;
    }
    if (retryCount >= 5) {
      textToSpeak = "Listen: " + currentLine.split(" ").join("... ");
    }

    speak(textToSpeak);

    // Listen again after a delay
    setTimeout(() => {
      if (retryCount < 5) {
        startListening();
      } else {
        setState("SUMMARY");
      }
    }, 1500);
  }, [currentLine, speak, startListening, retryCount]);

  // Match spoken function
  const matchSpoken = (expected: string, transcriptAlternatives: string[]) => {
    if (transcriptAlternatives.length === 0) {
      return { correct: false, score: 0, heard: "", reason: "silent" };
    }

    let bestResult = { correct: false, score: 0, heard: "", reason: "wrong_number" };

    for (const transcript of transcriptAlternatives) {
      const processedTranscript = preprocessText(transcript);
      const processedExpected = preprocessText(expected);

      if (processedTranscript === processedExpected) {
        return { correct: true, score: 100, heard: transcript, reason: "ok" };
      }

      const numExpected = extractNumber(processedExpected);
      const numHeard = extractNumber(processedTranscript);

      if (numExpected !== null && numHeard !== null) {
        if (numExpected === numHeard) {
          return { correct: true, score: 95, heard: transcript, reason: "ok" };
        }
      }

      const heardWithHomophones = applyHomophoneMapping(processedTranscript);
      const expectedWithHomophones = applyHomophoneMapping(processedExpected);

      if (heardWithHomophones === expectedWithHomophones) {
        return { correct: true, score: 90, heard: transcript, reason: "ok" };
      }

      const tokenScore = fuzzyTokenMatch(processedTranscript, processedExpected);
      if (tokenScore >= 0.8) {
        const score = tokenScore * 100;
        if (score > bestResult.score) {
          bestResult = { correct: true, score, heard: transcript, reason: "partial" };
        }
      }
    }

    return bestResult;
  };

  // Text preprocessing
  const preprocessText = (text: string) => {
    if (!text) return "";
    let result = text.toLowerCase();
    result = result.replace(/[^\w\s-]/g, " ");
    const fillerWords = ["um", "uh", "er", "ah", "like", "i mean", "you know"];
    const fillerRegex = new RegExp(`\\b(${fillerWords.join("|")})\\b`, "g");
    result = result.replace(fillerRegex, " ");
    const connectorMap: Record<string, string> = {
      "into": "times", "multiplied by": "times", "times": "times", "x": "times",
      "are": "are", "is": "is", "equals": "is", "=": "is",
      "ones/one": "ones", "twos/two": "twos", "threes/three": "threes",
      "dooni": "two", "tiya": "two", "chauka": "four",
    };
    for (const [key, value] of Object.entries(connectorMap)) {
      const regex = new RegExp(`\\b${key}\\b`, "g");
      result = result.replace(regex, value);
    }
    result = result.replace(/\s+/g, " ").trim();
    return result;
  };

  // Number word conversion
  const wordsToNumber = (words: string): number | null => {
    const wordNumMap: Record<string, number> = {
      "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4,
      "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9,
      "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13,
      "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17,
      "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50,
      "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90,
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
  };

  // Extract number from text
  const extractNumber = (text: string): number | null => {
    const digitMatch = text.match(/\b(\d+)\b/);
    if (digitMatch) return parseInt(digitMatch[1], 10);
    const wordValue = wordsToNumber(text);
    if (wordValue !== null) return wordValue;
    const patternMatch = text.match(/(\d+)\s+times\s+\d+/i);
    if (patternMatch) return parseInt(patternMatch[1], 10);
    return null;
  };

  // Homophone mapping
  const homophoneMap: Record<string, string> = {
    "to": "2", "too": "2", "two": "2", "for": "4", "four": "4", "forr": "4",
    "ate": "8", "eight": "8", "won": "1", "one": "1", "tree": "3", "three": "3",
    "six": "6", "sex": "6", "seven": "7",
  };

  const applyHomophoneMapping = (text: string) => {
    const tokens = text.replace(/-/g, " ").split(/\s+/);
    const mapped = tokens.map(token => homophoneMap[token.toLowerCase()] || token);
    return mapped.join(" ");
  };

  // Fuzzy token match
  const fuzzyTokenMatch = (a: string, b: string): number => {
    const tokensA = a.split(/\s+/);
    const tokensB = b.split(/\s+/);
    if (tokensA.length === 0 && tokensB.length === 0) return 1.0;
    if (tokensA.length === 0 || tokensB.length === 0) return 0.0;
    const matchingTokens = tokensA.filter(token => tokensB.includes(token));
    return matchingTokens.length / Math.max(tokensA.length, tokensB.length);
  };

  // Number pad handlers
  const handleNumberPress = useCallback((digit: string) => {
    setHeard(prev => prev + digit);
  }, []);

  const clearText = useCallback(() => {
    setHeard("");
  }, []);

  const submitTypedAnswer = useCallback(() => {
    if (!currentLine || !heard) return;

    const alternatives = [heard];
    const result = matchSpoken(currentLine, alternatives);
    setResultText(result.reason);

    if (result.correct) {
      setResultText("Shabash! Perfect!");
      setRetryCount(0);
      setTimeout(() => {
        if (tableIndex < tables.length - 1) {
          setTableIndex(prev => prev + 1);
          setState("SPEAKING");
          setCurrentLine(`${tables[tableIndex].n} times 1 is ${tables[tableIndex].n}`);
        } else {
          setState("SUMMARY");
        }
      }, 2000);
    } else {
      handleIncorrect(result);
    }
  }, [currentLine, heard, tableIndex, tables, retryCount, handleIncorrect]);

  // Pause/stop session
  const pauseSession = useCallback(() => {
    setState(prev => prev === "LISTENING" ? "IDLE" : prev);
  }, []);

  const stopSession = useCallback(() => {
    setState("IDLE");
    setTables([]);
    setTableIndex(0);
    setRetryCount(0);
    alert("Session stopped. Keep practicing!");
  }, []);

  // Mode/toggle handlers
  const toggleMode = useCallback((newMode: "repeat-after-me" | "listen" | "recall") => {
    setConfig(prev => ({ ...prev, mode: newMode }));
  }, []);

  const toggleStyle = useCallback((newStyle: "indian" | "times" | "hindi") => {
    setConfig(prev => ({ ...prev, style: newStyle }));
  }, []);

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="border-b p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-2xl">Tables Buddy</h1>
          <div className="select small">
            <option value="repeat-after-me">Repeat After Me</option>
            <option value="listen">Listen</option>
            <option value="recall">Recall</option>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={pauseSession} className="btn-icon">⏸️</button>
          <button onClick={stopSession} className="btn-icon">⏹️</button>
        </div>
      </div>

      {/* Main area */}
      <main className="max-w-3xl mx-auto p-4">

        {/* Table selector */}
        {tables.length > 0 && (
          <div className="card mb-6 p-4">
            <h3 className="font-semibold mb-3">Select Table</h3>
            <div className="grid grid-cols-3 gap-2">
              {tables.slice(0, 5).map((table) => (
                <button
                  key={table.n}
                  onClick={() => startTable(table.n)}
                  className="btn-secondary py-2"
                >
                  Table of {table.n}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Current line display */}
        <div className="card p-6 mb-8 text-center">
          {state === "SUMMARY" ? (
            <div>
              <p className="text-4xl font-bold text-primary">Well done!</p>
              <p className="text-muted-text">Practice again soon!</p>
            </div>
          ) : (
            <>
              <p className="text-3xl font-bold mb-4">{currentLine}</p>
              {state === "LISTENING" && (
                <div className="mt-4 pulse">
                  <p className="text-muted-text text-small">I'm listening...</p>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto border-2 border-primary">
                    <span className="text-3xl">🎤</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Result display */}
        {resultText && (
          <div className="card p-4 mb-6 text-center">
            <p className={resultText.includes("Shabash") ? "text-success" : "text-error"}>
              {resultText}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setState("SPEAKING")}
            disabled={state !== "IDLE"}
            className="flex-1 py-3 btn-primary"
          >
            {state === "IDLE" ? "▶ Start" : "↻ Continue"}
          </button>
          <button onClick={pauseSession} disabled={state === "IDLE"} className="flex-1 py-3 btn-secondary">
            ⏸️ Pause
          </button>
        </div>

        {/* Type answer fallback */}
        {state === "SUMMARY" && (
          <div className="card p-6">
            <p>Session over. Try again anytime!</p>
          </div>
        )}
      </main>
    </div>
  );
}
