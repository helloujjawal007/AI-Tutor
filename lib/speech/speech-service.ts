// Tables Buddy Speech Service
// Handles Text-to-Speech and Speech-to-Text using Web Speech API

export interface MatchResult {
  correct: boolean;
  score: number;
  heard: string;
  reason: "ok" | "partial" | "wrong_number" | "silent";
}

export function matchSpoken(expected: string, transcriptAlternatives: string[]): MatchResult {
  if (transcriptAlternatives.length === 0) {
    return { correct: false, score: 0, heard: "", reason: "silent" };
  }

  let bestResult: MatchResult = { correct: false, score: 0, heard: "", reason: "wrong_number" };

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
}

function preprocessText(text: string): string {
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
}

function extractNumber(text: string): number | null {
  const digitMatch = text.match(/\b(\d+)\b/);
  if (digitMatch) return parseInt(digitMatch[1], 10);

  const wordValue = wordsToNumber(text);
  if (wordValue !== null) return wordValue;

  const patternMatch = text.match(/(\d+)\s+times\s+\d+/i);
  if (patternMatch) return parseInt(patternMatch[1], 10);

  return null;
}

function wordsToNumber(words: string): number | null {
  const wordNumMap: Record<string, number> = {
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4,
    "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9,
    "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13,
    "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17,
    "eighteen": 18, "nineteen": 19, "twenty": 20, "thirty": 30,
    "forty": 40, "fourty": 40, "fifty": 50, "sixty": 60,
    "seventy": 70, "eighty": 80, "ninety": 90, "hundred": 100,
    "thousand": 1000,
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

const homophoneMap: Record<string, string> = {
  "to": "2", "too": "2", "two": "2", "for": "4", "four": "4", "forr": "4",
  "ate": "8", "eight": "8", "won": "1", "tree": "3", "six": "6", "sex": "6",
  "seven": "7", "11": "7",
};

function applyHomophoneMapping(text: string): string {
  const tokens = text.replace(/-/g, " ").split(/\s+/);
  const mapped = tokens.map(token => homophoneMap[token.toLowerCase()] || token);
  return mapped.join(" ");
}

function fuzzyTokenMatch(a: string, b: string): number {
  const tokensA = a.split(/\s+/);
  const tokensB = b.split(/\s+/);
  if (tokensA.length === 0 && tokensB.length === 0) return 1.0;
  if (tokensA.length === 0 || tokensB.length === 0) return 0.0;
  const matchingTokens = tokensA.filter(token => tokensB.includes(token));
  return matchingTokens.length / Math.max(tokensA.length, tokensB.length);
}

export function handleSpeechTimeout(onTimeout: () => void, timeoutMs = 6000) {
  let timer: NodeJS.Timeout;

  const start = () => {
    timer = setTimeout(onTimeout, timeoutMs);
  };

  const cancel = () => {
    clearTimeout(timer);
  };

  return { start, cancel };
}
