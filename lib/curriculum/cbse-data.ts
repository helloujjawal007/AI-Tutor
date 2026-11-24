/**
 * CBSE Curriculum Data for Class 1 to Class 5 (English Only)
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
 * Multiplication Table Generation (Tables 1 to 30) - English Only
 */
export function getTableLines(tableNumber: number) {
  const lines: Array<{ multiplier: number; product: number; indian: string; times: string }> = [];
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

  for (let m = 1; m <= 10; m++) {
    const product = tableNumber * m;
    lines.push({
      multiplier: m,
      product,
      indian: `${tableNumber} ${indianSuffix[m] || "times " + m + " is"} ${product}`,
      times: `${tableNumber} times ${m} is ${product}`,
    });
  }
  return lines;
}
