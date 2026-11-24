/**
 * CBSE Curriculum Data for Class 1 to Class 5 (English Only)
 * High Performance & Memoized Curriculum Service
 * Includes Multiplication Tables (1 to 30), 500 Dictionary Vocabulary Words per class,
 * and 30-50 Classic & NCERT Rhymes/Poems per class.
 */

import wordsDataset from "./cbse-words.json";
import rhymesDataset from "./cbse-rhymes.json";

export type CBSEClass = "Class 1" | "Class 2" | "Class 3" | "Class 4" | "Class 5";
export type SubjectType = "tables" | "words" | "rhymes" | "phonics";

export interface WordItem {
  id: string;
  word: string;
  meaning: string;
  example: string;
  phonetic: string;
  options: string[]; // for quiz
}

export interface RhymeItem {
  id: string;
  title: string;
  author?: string;
  stanzas: string[];
  moralOrTheme: string;
}

export interface TableLine {
  multiplier: number;
  product: number;
  indian: string;
  times: string;
}

export interface ClassCurriculum {
  classLevel: CBSEClass;
  ageGroup: string;
  tablesRange: { min: number; max: number; recommended: number[] };
  words: WordItem[];
  rhymes: RhymeItem[];
  phonics: Array<{ letter: string; word: string; phonetic: string; sound: string }>;
}

const typedWords = wordsDataset as Record<CBSEClass, WordItem[]>;
const typedRhymes = rhymesDataset as Record<CBSEClass, RhymeItem[]>;

export const CBSE_CURRICULUM: Record<CBSEClass, ClassCurriculum> = {
  "Class 1": {
    classLevel: "Class 1",
    ageGroup: "Ages 5-6",
    tablesRange: { min: 1, max: 10, recommended: [1, 2, 3, 5, 10] },
    phonics: [
      { letter: "A", word: "Apple", phonetic: "A for Apple", sound: "ah" },
      { letter: "B", word: "Ball", phonetic: "B for Ball", sound: "buh" },
      { letter: "C", word: "Cat", phonetic: "C for Cat", sound: "kuh" },
      { letter: "D", word: "Dog", phonetic: "D for Dog", sound: "duh" },
      { letter: "E", word: "Elephant", phonetic: "E for Elephant", sound: "eh" },
      { letter: "S", word: "Sun", phonetic: "S for Sun", sound: "sss" },
    ],
    words: typedWords["Class 1"] || [],
    rhymes: typedRhymes["Class 1"] || [],
  },
  "Class 2": {
    classLevel: "Class 2",
    ageGroup: "Ages 6-7",
    tablesRange: { min: 2, max: 12, recommended: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
    phonics: [
      { letter: "CH", word: "Chair", phonetic: "Ch-air", sound: "ch" },
      { letter: "SH", word: "Ship", phonetic: "Sh-ip", sound: "sh" },
      { letter: "TH", word: "Thumb", phonetic: "Th-umb", sound: "th" },
    ],
    words: typedWords["Class 2"] || [],
    rhymes: typedRhymes["Class 2"] || [],
  },
  "Class 3": {
    classLevel: "Class 3",
    ageGroup: "Ages 7-8",
    tablesRange: { min: 2, max: 15, recommended: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
    phonics: [],
    words: typedWords["Class 3"] || [],
    rhymes: typedRhymes["Class 3"] || [],
  },
  "Class 4": {
    classLevel: "Class 4",
    ageGroup: "Ages 8-9",
    tablesRange: { min: 2, max: 20, recommended: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
    phonics: [],
    words: typedWords["Class 4"] || [],
    rhymes: typedRhymes["Class 4"] || [],
  },
  "Class 5": {
    classLevel: "Class 5",
    ageGroup: "Ages 9-11",
    tablesRange: { min: 2, max: 30, recommended: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
    phonics: [],
    words: typedWords["Class 5"] || [],
    rhymes: typedRhymes["Class 5"] || [],
  },
};

/**
 * Pre-cached Multiplication Tables (1 to 30) - Zero Runtime Allocation
 */
const tableLinesCache = new Map<number, TableLine[]>();
const indianSuffix: Record<number, string> = {
  1: "ones are",
  2: "twos are",
  3: "threes are",
  4: "fours are",
  5: "fives are",
  6: "sixes are",
  7: "sevens are",
  8: "eights are",
  9: "nines are",
  10: "tens are",
};

export function getTableLines(tableNumber: number): TableLine[] {
  const cached = tableLinesCache.get(tableNumber);
  if (cached) return cached;

  const lines: TableLine[] = [];
  for (let m = 1; m <= 10; m++) {
    const product = tableNumber * m;
    lines.push({
      multiplier: m,
      product,
      indian: `${tableNumber} ${indianSuffix[m] || "times " + m + " is"} ${product}`,
      times: `${tableNumber} times ${m} is ${product}`,
    });
  }
  tableLinesCache.set(tableNumber, lines);
  return lines;
}

/**
 * Ultra-Fast Pre-Indexed Search for 500 Vocabulary Words per Class
 * Pre-computes lowercased strings once, preventing GC overhead and string allocation on each keystroke.
 */
interface WordSearchIndexEntry {
  wordLower: string;
  meaningLower: string;
  item: WordItem;
  idx: number;
}

const wordSearchIndexCache = new Map<string, WordSearchIndexEntry[]>();

function getWordSearchIndex(classLevel: CBSEClass): WordSearchIndexEntry[] {
  let index = wordSearchIndexCache.get(classLevel);
  if (!index) {
    const list = typedWords[classLevel] || [];
    index = new Array(list.length);
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      index[i] = {
        wordLower: item.word.toLowerCase(),
        meaningLower: item.meaning.toLowerCase(),
        item,
        idx: i,
      };
    }
    wordSearchIndexCache.set(classLevel, index);
  }
  return index;
}

export function searchWordsFast(
  classLevel: CBSEClass,
  query: string,
  limit: number = 30
): Array<WordItem & { idx: number }> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const index = getWordSearchIndex(classLevel);
  const matches: Array<WordItem & { idx: number }> = [];

  for (let i = 0; i < index.length; i++) {
    const entry = index[i];
    if (entry.wordLower.includes(q) || entry.meaningLower.includes(q)) {
      matches.push({ ...entry.item, idx: entry.idx });
      if (matches.length >= limit) break; // Early termination once limit reached
    }
  }
  return matches;
}

/**
 * Ultra-Fast Search for 35 Rhymes / Poems
 */
interface RhymeSearchIndexEntry {
  titleLower: string;
  themeLower: string;
  item: RhymeItem;
  originalIdx: number;
}

const rhymeSearchIndexCache = new Map<string, RhymeSearchIndexEntry[]>();

function getRhymeSearchIndex(classLevel: CBSEClass): RhymeSearchIndexEntry[] {
  let index = rhymeSearchIndexCache.get(classLevel);
  if (!index) {
    const list = typedRhymes[classLevel] || [];
    index = new Array(list.length);
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      index[i] = {
        titleLower: item.title.toLowerCase(),
        themeLower: item.moralOrTheme.toLowerCase(),
        item,
        originalIdx: i,
      };
    }
    rhymeSearchIndexCache.set(classLevel, index);
  }
  return index;
}

export function searchRhymesFast(
  classLevel: CBSEClass,
  query: string
): Array<RhymeItem & { originalIdx: number }> {
  const q = query.trim().toLowerCase();
  const index = getRhymeSearchIndex(classLevel);

  if (!q) {
    return index.map((e) => ({ ...e.item, originalIdx: e.originalIdx }));
  }

  const matches: Array<RhymeItem & { originalIdx: number }> = [];
  for (let i = 0; i < index.length; i++) {
    const entry = index[i];
    if (entry.titleLower.includes(q) || entry.themeLower.includes(q)) {
      matches.push({ ...entry.item, originalIdx: entry.originalIdx });
    }
  }
  return matches;
}
