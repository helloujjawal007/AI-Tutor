"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  CBSE_CURRICULUM,
  CBSEClass,
  SubjectType,
  getTableLines,
  WordItem,
  RhymeItem,
} from "@/lib/curriculum/cbse-data";
import { IndianLadyVoice } from "@/lib/speech/lady-voice";
import TalkingTomReward from "@/components/TalkingTomReward";

export type RecitationStyle = "indian" | "times";
export type LearningMode = "repeat-after-me" | "listen" | "recall";

interface LessonScreenProps {
  initialChildName?: string;
  initialClass?: CBSEClass;
  initialSubject?: SubjectType;
  onBack?: () => void;
}

export default function LessonScreen({
  initialChildName = "Aarav",
  initialClass = "Class 3",
  initialSubject = "tables",
  onBack,
}: LessonScreenProps) {
  const childName = initialChildName.trim() || "Aarav";

  // CBSE Level & Subject
  const [selectedClass, setSelectedClass] = useState<CBSEClass>(initialClass);
  const [selectedSubject, setSelectedSubject] = useState<SubjectType>(initialSubject);

  // Tables State (1 to 30)
  const [currentTable, setCurrentTable] = useState<number>(2);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [recitationStyle, setRecitationStyle] = useState<RecitationStyle>("indian");
  const [learningMode, setLearningMode] = useState<LearningMode>("repeat-after-me");

  // Words State (500 Words per class)
  const [wordIndex, setWordIndex] = useState<number>(0);
  const [wordSearch, setWordSearch] = useState<string>("");
  const [jumpWordNum, setJumpWordNum] = useState<string>("");
  const [wordsLearnedCount, setWordsLearnedCount] = useState<number>(0);

  // Rhymes State (30-50 Rhymes per class)
  const [rhymeIndex, setRhymeIndex] = useState<number>(0);
  const [rhymeLineIndex, setRhymeLineIndex] = useState<number>(0);
  const [rhymeSearch, setRhymeSearch] = useState<string>("");

  // General Interactive State
  const [state, setState] = useState<"IDLE" | "SPEAKING" | "LISTENING" | "CORRECT" | "RETRY" | "SUMMARY">("IDLE");
  const [stars, setStars] = useState<number>(0);
  const [heard, setHeard] = useState<string>("");
  const [typedAnswer, setTypedAnswer] = useState<string>("");
  const [feedback, setFeedback] = useState<{ text: string; isCorrect: boolean } | null>(null);

  // Talking Tom Reward State (2 minutes)
  const [showTomReward, setShowTomReward] = useState<boolean>(false);
  const [completedTaskName, setCompletedTaskName] = useState<string>("Table of 2");

  const recognitionRef = useRef<any>(null);
  const autoNextTimeoutRef = useRef<any>(null);

  const classData = CBSE_CURRICULUM[selectedClass] || CBSE_CURRICULUM["Class 1"];
  const tableLines = getTableLines(currentTable);
  const currentTableLine = tableLines[multiplier - 1] || tableLines[0];

  const currentWordList = useMemo(() => classData?.words || [], [classData]);
  const currentWord: WordItem = useMemo(() => {
    return (
      currentWordList[wordIndex] ||
      currentWordList[0] || {
        id: "w1",
        word: "Sun",
        meaning: "The bright star that lights Earth during daytime",
        example: "The sun gives us light and warmth.",
        phonetic: "S-U-N, Sun",
        options: ["Sun", "Son", "San", "Sin"],
      }
    );
  }, [currentWordList, wordIndex]);

  const currentRhymeList = useMemo(() => classData?.rhymes || [], [classData]);
  const currentRhyme: RhymeItem = useMemo(() => {
    return (
      currentRhymeList[rhymeIndex] ||
      currentRhymeList[0] || {
        id: "r1",
        title: "Twinkle Twinkle Little Star",
        author: "Traditional",
        stanzas: ["Twinkle, twinkle, little star,", "How I wonder what you are!"],
        moralOrTheme: "Wonder of the cosmos",
      }
    );
  }, [currentRhymeList, rhymeIndex]);
  const currentRhymeLine = currentRhyme?.stanzas[rhymeLineIndex] || "";

  // Speak with Soft Indian Lady Voice (English only)
  const speakAsLadyTeacher = useCallback(
    (text: string, onEnd?: () => void) => {
      IndianLadyVoice.speak(text, {
        onStart: () => setState("SPEAKING"),
        onEnd: () => {
          setState("IDLE");
          onEnd?.();
        },
      });
    },
    []
  );

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
  }, []);

  // Web Speech Recognition
  const startListening = useCallback(
    (expectedTarget: string | number, onResultCallback: (match: boolean) => void) => {
      if (typeof window === "undefined") return;
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRec) {
        setFeedback({
          text: `Microphone is not supported on this browser. Please tap the answer below!`,
          isCorrect: false,
        });
        return;
      }

      try {
        IndianLadyVoice.stop();
        stopListening();

        const rec = new SpeechRec();
        rec.lang = "en-IN";
        rec.interimResults = false;
        rec.maxAlternatives = 3;

        rec.onstart = () => {
          setState("LISTENING");
          setHeard("Listening to your voice...");
        };

        rec.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript.toLowerCase();
          setHeard(transcript);

          const expectedStr = String(expectedTarget).toLowerCase();
          const isMatch = transcript.includes(expectedStr);
          onResultCallback(isMatch);
        };

        rec.onerror = (e: any) => {
          console.warn("Speech error:", e.error);
          setState("IDLE");
          setHeard("");
          if (e.error === "not-allowed") {
            setFeedback({
              text: `Microphone permission is blocked. You can tap the answer choices below!`,
              isCorrect: false,
            });
          }
        };

        rec.onend = () => {
          if (state === "LISTENING") {
            setState("IDLE");
          }
        };

        recognitionRef.current = rec;
        rec.start();
      } catch (err) {
        console.warn("Speech start error:", err);
        setState("IDLE");
      }
    },
    [state, stopListening]
  );

  // -------------------------------------------------------------
  // TABLES HANDLERS (Till 30)
  // -------------------------------------------------------------
  const getExpectedProduct = useCallback(() => currentTable * multiplier, [currentTable, multiplier]);

  // Generate 4 multiple-choice options for Tables
  const getTableChoices = useCallback(() => {
    const correct = currentTable * multiplier;
    const offsets = [-currentTable, currentTable, currentTable * 2, -currentTable * 2, 1, -1];
    const set = new Set<number>([correct]);
    for (const offset of offsets) {
      if (set.size >= 4) break;
      const candidate = correct + offset;
      if (candidate > 0 && candidate !== correct) {
        set.add(candidate);
      }
    }
    while (set.size < 4) {
      set.add(Math.floor(Math.random() * (currentTable * 10)) + 1);
    }
    return Array.from(set).sort(() => Math.random() - 0.5);
  }, [currentTable, multiplier]);

  const [tableChoices, setTableChoices] = useState<number[]>([]);
  useEffect(() => {
    setTableChoices(getTableChoices());
  }, [currentTable, multiplier, getTableChoices]);

  const verifyTableAnswer = useCallback(
    (candidate: string | number) => {
      const parsed = typeof candidate === "number" ? candidate : parseInt(candidate.replace(/\D/g, ""), 10);
      const expected = getExpectedProduct();
      const isCorrect = parsed === expected;

      if (isCorrect) {
        setState("CORRECT");
        setStars((s) => s + 1);
        const praise = IndianLadyVoice.getRandomPraise(childName);
        setFeedback({
          text: `${praise} ${currentTable} × ${multiplier} = ${expected}!`,
          isCorrect: true,
        });

        speakAsLadyTeacher(praise, () => {
          autoNextTimeoutRef.current = setTimeout(() => {
            if (multiplier < 10) {
              setMultiplier((m) => m + 1);
              setFeedback(null);
              setHeard("");
              setTypedAnswer("");
              setState("IDLE");
            } else {
              setState("SUMMARY");
              setCompletedTaskName(`Table of ${currentTable}`);
              speakAsLadyTeacher(
                `Wonderful work, ${childName}! You have mastered the entire Table of ${currentTable}! You unlocked 2 minutes with Talking Tom!`
              );
            }
          }, 1200);
        });
      } else {
        setState("RETRY");
        const encouragement = IndianLadyVoice.getRandomEncouragement(childName);
        setFeedback({
          text: `${encouragement} ${currentTable} × ${multiplier} is ${expected}.`,
          isCorrect: false,
        });
        speakAsLadyTeacher(
          `${encouragement} ${
            recitationStyle === "indian"
              ? currentTableLine.indian
              : currentTableLine.times
          }`
        );
      }
    },
    [childName, currentTable, multiplier, getExpectedProduct, currentTableLine, recitationStyle, speakAsLadyTeacher]
  );

  const reciteTableLine = useCallback(() => {
    const text =
      learningMode === "recall"
        ? `What is ${currentTable} times ${multiplier}?`
        : recitationStyle === "indian"
        ? currentTableLine.indian
        : currentTableLine.times;

    speakAsLadyTeacher(text, () => {
      if (learningMode === "listen") {
        autoNextTimeoutRef.current = setTimeout(() => {
          if (multiplier < 10) {
            setMultiplier((m) => m + 1);
          } else {
            setState("SUMMARY");
            setCompletedTaskName(`Table of ${currentTable}`);
          }
        }, 1300);
      } else if (learningMode === "repeat-after-me") {
        startListening(getExpectedProduct(), (match) => {
          verifyTableAnswer(match ? getExpectedProduct() : 0);
        });
      }
    });
  }, [
    currentTable,
    multiplier,
    learningMode,
    recitationStyle,
    currentTableLine,
    speakAsLadyTeacher,
    startListening,
    getExpectedProduct,
    verifyTableAnswer,
  ]);

  // -------------------------------------------------------------
  // WORDS HANDLERS (English Only)
  // -------------------------------------------------------------
  const reciteWord = useCallback(() => {
    const text = `The word is ${currentWord.word}. Spell with teacher: ${currentWord.phonetic}. Meaning: ${currentWord.meaning}. For example: ${currentWord.example}.`;
    speakAsLadyTeacher(text);
  }, [currentWord, speakAsLadyTeacher]);

  const verifyWordAnswer = useCallback(
    (selectedOption: string) => {
      const isCorrect = selectedOption.toLowerCase() === currentWord.word.toLowerCase();
      if (isCorrect) {
        setState("CORRECT");
        setStars((s) => s + 1);
        const nextLearned = wordsLearnedCount + 1;
        setWordsLearnedCount(nextLearned);
        const praise = IndianLadyVoice.getRandomPraise(childName);
        setFeedback({
          text: `${praise} The correct spelling is "${currentWord.word}"! (${nextLearned} words practiced)`,
          isCorrect: true,
        });
        speakAsLadyTeacher(`${praise} Correct spelling!`, () => {
          autoNextTimeoutRef.current = setTimeout(() => {
            if (nextLearned % 5 === 0) {
              setState("SUMMARY");
              setCompletedTaskName(`5 Words Mastery (${selectedClass})`);
              speakAsLadyTeacher(`Bravo, ${childName}! You mastered 5 vocabulary words! You unlocked 2 minutes with Talking Tom!`);
            } else if (wordIndex < currentWordList.length - 1) {
              setWordIndex((w) => w + 1);
              setFeedback(null);
              setHeard("");
              setState("IDLE");
            } else {
              setState("SUMMARY");
              setCompletedTaskName(`${selectedClass} Vocabulary Words`);
              speakAsLadyTeacher(`Wonderful, ${childName}! You completed words for ${selectedClass}! You unlocked Talking Tom!`);
            }
          }, 1400);
        });
      } else {
        setState("RETRY");
        const encouragement = IndianLadyVoice.getRandomEncouragement(childName);
        setFeedback({
          text: `${encouragement} Remember: ${currentWord.word} is spelled ${currentWord.phonetic}`,
          isCorrect: false,
        });
        speakAsLadyTeacher(`${encouragement} The correct spelling is ${currentWord.phonetic}`);
      }
    },
    [childName, currentWord, wordIndex, currentWordList.length, selectedClass, speakAsLadyTeacher, wordsLearnedCount]
  );

  // -------------------------------------------------------------
  // RHYMES HANDLERS (English Only)
  // -------------------------------------------------------------
  const reciteRhymeLine = useCallback(() => {
    speakAsLadyTeacher(currentRhymeLine, () => {
      if (learningMode === "listen") {
        autoNextTimeoutRef.current = setTimeout(() => {
          if (rhymeLineIndex < currentRhyme.stanzas.length - 1) {
            setRhymeLineIndex((l) => l + 1);
          } else {
            setState("SUMMARY");
            setCompletedTaskName(`Poem: ${currentRhyme.title}`);
            speakAsLadyTeacher(`Very good, ${childName}! Moral of this poem: ${currentRhyme.moralOrTheme}. You unlocked Talking Tom!`);
          }
        }, 1400);
      } else {
        startListening(currentRhymeLine.split(" ")[0] || "", (match) => {
          if (match) {
            setStars((s) => s + 1);
            setFeedback({ text: `Great job ${childName}! You recited so well! 🎵`, isCorrect: true });
          }
        });
      }
    });
  }, [currentRhymeLine, learningMode, rhymeLineIndex, currentRhyme, speakAsLadyTeacher, startListening, childName]);

  const reciteFullRhyme = useCallback(() => {
    const fullText = `Dear ${childName}, let us recite "${currentRhyme.title}" together! ` + currentRhyme.stanzas.join(" ... ");
    speakAsLadyTeacher(fullText, () => {
      setStars((s) => s + 2);
      setState("SUMMARY");
      setCompletedTaskName(`Poem: ${currentRhyme.title}`);
    });
  }, [childName, currentRhyme, speakAsLadyTeacher]);

  // Cleanups
  useEffect(() => {
    return () => {
      if (autoNextTimeoutRef.current) clearTimeout(autoNextTimeoutRef.current);
      IndianLadyVoice.stop();
      stopListening();
    };
  }, [stopListening]);

  // Reset when class or subject changes
  const handleClassChange = (newClass: CBSEClass) => {
    if (autoNextTimeoutRef.current) clearTimeout(autoNextTimeoutRef.current);
    IndianLadyVoice.stop();
    setSelectedClass(newClass);
    setMultiplier(1);
    setWordIndex(0);
    setWordSearch("");
    setJumpWordNum("");
    setRhymeIndex(0);
    setRhymeLineIndex(0);
    setRhymeSearch("");
    setFeedback(null);
    setState("IDLE");
  };

  const handleSubjectChange = (newSubject: SubjectType) => {
    if (autoNextTimeoutRef.current) clearTimeout(autoNextTimeoutRef.current);
    IndianLadyVoice.stop();
    setSelectedSubject(newSubject);
    setMultiplier(1);
    setWordIndex(0);
    setWordSearch("");
    setJumpWordNum("");
    setRhymeIndex(0);
    setRhymeLineIndex(0);
    setRhymeSearch("");
    setFeedback(null);
    setState("IDLE");
  };

  // If Talking Tom reward is currently active, display the full-screen reward view
  if (showTomReward) {
    return (
      <TalkingTomReward
        childName={childName}
        taskTitle={completedTaskName}
        onFinish={() => {
          setShowTomReward(false);
          setState("IDLE");
          setMultiplier(1);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-pink-50/20 to-indigo-50 p-4 sm:p-6 text-slate-800">
      {/* Top Header */}
      <header className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4 bg-white/90 backdrop-blur-md p-4 sm:p-5 rounded-3xl shadow-sm border border-purple-100 mb-6">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="px-3.5 py-2 rounded-2xl bg-purple-100/70 hover:bg-purple-200/80 text-sm font-bold text-purple-800 transition cursor-pointer"
            >
              ← Home
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-purple-700 via-pink-600 to-indigo-600 bg-clip-text text-transparent">
                Tables Buddy
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700">
                CBSE {selectedClass}
              </span>
            </div>
            <p className="text-xs font-semibold text-purple-600">
              Teacher: <span className="text-pink-600">Indian English Voice</span> 🌸 | Student: <strong>{childName}</strong>
            </p>
          </div>
        </div>

        {/* CBSE Class Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {(["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"] as CBSEClass[]).map((cls) => (
            <button
              key={cls}
              onClick={() => handleClassChange(cls)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                selectedClass === cls
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-white text-purple-700 border border-purple-200 hover:bg-purple-50"
              }`}
            >
              {cls}
            </button>
          ))}
          <div className="ml-2 flex items-center gap-1 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl font-bold text-amber-700 text-sm">
            ⭐ <span>{stars}</span>
          </div>
          <button
            onClick={() => {
              setCompletedTaskName(`Practice Session with Teacher`);
              setShowTomReward(true);
            }}
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-pink-500 hover:from-amber-500 hover:to-pink-600 text-white font-black text-xs py-1.5 px-3 rounded-xl shadow-sm transition cursor-pointer"
            title="Play with Talking Tom (2 minutes)"
          >
            <span>🐱</span>
            <span className="hidden sm:inline">Tom Reward</span> (2m)
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto">
        {/* Subject Navigation Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
          <button
            onClick={() => handleSubjectChange("tables")}
            className={`py-3 px-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-sm ${
              selectedSubject === "tables"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-200"
                : "bg-white text-purple-700 hover:bg-purple-50 border border-purple-100"
            }`}
          >
            <span>📐</span> Tables (1 to 30)
          </button>
          <button
            onClick={() => handleSubjectChange("words")}
            className={`py-3 px-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-sm ${
              selectedSubject === "words"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-200"
                : "bg-white text-purple-700 hover:bg-purple-50 border border-purple-100"
            }`}
          >
            <span>📖</span> English Words
          </button>
          <button
            onClick={() => handleSubjectChange("rhymes")}
            className={`py-3 px-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-sm ${
              selectedSubject === "rhymes"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-200"
                : "bg-white text-purple-700 hover:bg-purple-50 border border-purple-100"
            }`}
          >
            <span>🎵</span> Rhymes &amp; Poems
          </button>
          <button
            onClick={() => handleSubjectChange("phonics")}
            className={`py-3 px-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-sm ${
              selectedSubject === "phonics"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-200"
                : "bg-white text-purple-700 hover:bg-purple-50 border border-purple-100"
            }`}
          >
            <span>🅰️</span> Phonics &amp; Sounds
          </button>
        </div>

        {/* ========================================================================= */}
        {/* SUBJECT 1: TABLES MODULE (1 TO 30) */}
        {/* ========================================================================= */}
        {selectedSubject === "tables" && (
          <div>
            {/* Table Selection Bar (1 to 30) */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-purple-100 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600">
                  Select Multiplication Table (1 to 30):
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700">
                  Practicing: Table of {currentTable}
                </span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {Array.from({ length: 30 }, (_, i) => i + 1).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setCurrentTable(t);
                      setMultiplier(1);
                      setFeedback(null);
                      setState("IDLE");
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition cursor-pointer ${
                      currentTable === t
                        ? "bg-purple-600 text-white shadow-md shadow-purple-200 scale-105"
                        : classData.tablesRange.recommended.includes(t)
                        ? "bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100"
                        : "bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    Table {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode & Recitation Style Row (English Only) */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-white/70 p-3 rounded-2xl border border-purple-100">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-500">Recitation Style:</label>
                <select
                  value={recitationStyle}
                  onChange={(e) => setRecitationStyle(e.target.value as RecitationStyle)}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl border border-purple-200 bg-white text-purple-700 shadow-sm cursor-pointer"
                >
                  <option value="indian">🇮🇳 Indian English (7 twos are 14)</option>
                  <option value="times">✖️ Times Style (7 times 2 is 14)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-500">Learning Mode:</label>
                <select
                  value={learningMode}
                  onChange={(e) => setLearningMode(e.target.value as LearningMode)}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl border border-purple-200 bg-white text-purple-700 shadow-sm cursor-pointer"
                >
                  <option value="repeat-after-me">🗣️ Repeat After Teacher</option>
                  <option value="listen">🎧 Listen Mode (Auto)</option>
                  <option value="recall">⚡ Recall Quiz</option>
                </select>
              </div>
            </div>

            {/* Table Display Card */}
            {state === "SUMMARY" ? (
              <div className="bg-white p-8 rounded-3xl shadow-lg border-2 border-purple-200 text-center mb-6">
                <div className="text-6xl mb-3">🌟</div>
                <h2 className="text-3xl font-black text-purple-700 mb-2">
                  Well Done, {childName}!
                </h2>
                <p className="text-lg text-gray-600 mb-4">
                  You have mastered the entire <strong>Table of {currentTable}</strong>!
                </p>

                {/* Big Talking Tom 2-Minute Reward Button */}
                <div className="my-6 p-6 bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600 rounded-3xl text-white shadow-xl animate-pulse">
                  <span className="text-4xl block mb-2">🐱🎁</span>
                  <h3 className="text-2xl font-black mb-1">2-Minute Reward Unlocked!</h3>
                  <p className="text-sm font-semibold mb-4 text-purple-100">
                    You earned 2 minutes of fun playtime with Talking Tom!
                  </p>
                  <button
                    onClick={() => setShowTomReward(true)}
                    className="py-3.5 px-8 bg-white text-purple-900 font-black text-lg rounded-2xl shadow-lg hover:scale-105 transition cursor-pointer"
                  >
                    ▶ Play with Talking Tom Now (2 Min) 🐱
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  {currentTable < 30 && (
                    <button
                      onClick={() => {
                        setCurrentTable((t) => t + 1);
                        setMultiplier(1);
                        setState("IDLE");
                        setFeedback(null);
                      }}
                      className="btn-primary w-full sm:w-auto text-base py-3 px-6"
                    >
                      ▶ Learn Table of {currentTable + 1}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setMultiplier(1);
                      setState("IDLE");
                      setFeedback(null);
                    }}
                    className="btn-secondary w-full sm:w-auto text-base py-3 px-6"
                  >
                    ↻ Practice Table {currentTable} Again
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-md border border-purple-100 mb-6">
                {/* Progress bar */}
                <div className="flex items-center justify-between text-xs font-bold text-gray-400 mb-2">
                  <span>Step {multiplier} of 10</span>
                  <span>{Math.round((multiplier / 10) * 100)}% Complete</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 mb-6 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-indigo-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${(multiplier / 10) * 100}%` }}
                  ></div>
                </div>

                {/* Big Line Display */}
                <div className="text-center py-6 px-4 bg-gradient-to-b from-purple-50/60 to-pink-50/40 rounded-2xl border border-purple-100 mb-6">
                  <div className="text-4xl sm:text-6xl font-black tracking-tight text-slate-800 mb-2">
                    {currentTable} × {multiplier} ={" "}
                    <span className="text-purple-600 underline decoration-pink-300 decoration-wavy">
                      {learningMode === "recall" && state !== "CORRECT" ? "?" : getExpectedProduct()}
                    </span>
                  </div>
                  <p className="text-base sm:text-xl font-semibold text-purple-700/80 italic">
                    &ldquo;
                    {recitationStyle === "indian" ? currentTableLine.indian : currentTableLine.times}
                    &rdquo;
                  </p>
                </div>

                {/* Status Badge */}
                <div className="flex items-center justify-center gap-2 mb-6 min-h-[40px]">
                  {state === "SPEAKING" && (
                    <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-full animate-pulse">
                      <span>🔊</span> Teacher is speaking in soft English...
                    </div>
                  )}
                  {state === "LISTENING" && (
                    <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-full animate-bounce">
                      <span>🎤</span> Teacher is listening, {childName}! Speak now...
                    </div>
                  )}
                  {state === "CORRECT" && (
                    <div className="flex items-center gap-2 text-green-700 font-bold text-sm bg-green-50 border border-green-200 px-4 py-2 rounded-full">
                      <span>🎉</span> Wonderful! That is correct!
                    </div>
                  )}
                  {state === "RETRY" && (
                    <div className="flex items-center gap-2 text-rose-700 font-bold text-sm bg-rose-50 border border-rose-200 px-4 py-2 rounded-full">
                      <span>💡</span> Let us try once more, sweetie!
                    </div>
                  )}
                  {state === "IDLE" && (
                    <div className="text-xs font-semibold text-gray-400">
                      Tap &ldquo;Listen to Teacher&rdquo; or select the answer below!
                    </div>
                  )}
                </div>

                {/* Heard audio transcript */}
                {heard && (
                  <div className="text-center text-sm font-medium text-gray-500 mb-4 bg-gray-50 py-2 px-4 rounded-xl border border-gray-200">
                    Heard: <span className="font-bold text-gray-800">&ldquo;{heard}&rdquo;</span>
                  </div>
                )}

                {/* Feedback */}
                {feedback && (
                  <div
                    className={`p-3 rounded-2xl text-center font-bold text-sm mb-6 ${
                      feedback.isCorrect
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-amber-50 text-amber-800 border border-amber-200"
                    }`}
                  >
                    {feedback.text}
                  </div>
                )}

                {/* Quick 4 Multiple Choice Options */}
                <div className="mb-6">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center mb-3">
                    Choose the correct answer:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {tableChoices.map((choice) => (
                      <button
                        key={choice}
                        onClick={() => verifyTableAnswer(choice)}
                        className="py-4 rounded-2xl font-black text-2xl bg-white hover:bg-purple-50 text-purple-700 border-2 border-purple-200 hover:border-purple-500 shadow-sm hover:shadow transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                      >
                        {choice}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Type answer option */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (typedAnswer.trim()) verifyTableAnswer(typedAnswer);
                  }}
                  className="flex items-center gap-2 mb-8 max-w-sm mx-auto"
                >
                  <input
                    type="number"
                    value={typedAnswer}
                    onChange={(e) => setTypedAnswer(e.target.value)}
                    placeholder="Type number..."
                    className="input flex-1 text-center font-bold text-lg"
                  />
                  <button type="submit" disabled={!typedAnswer.trim()} className="btn-primary py-2 px-5 text-sm">
                    Submit
                  </button>
                </form>

                {/* Bottom Action Controls */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => {
                      if (multiplier > 1) {
                        setMultiplier((m) => m - 1);
                        setFeedback(null);
                      }
                    }}
                    disabled={multiplier <= 1}
                    className="btn-secondary py-2.5 px-4 text-xs font-bold"
                  >
                    ← Prev Line
                  </button>
                  <button
                    onClick={reciteTableLine}
                    className="btn-primary py-3 px-6 text-sm font-black flex items-center gap-2"
                  >
                    <span>🔊</span> Listen to Teacher
                  </button>
                  <button
                    onClick={() =>
                      startListening(getExpectedProduct(), (match) => {
                        verifyTableAnswer(match ? getExpectedProduct() : 0);
                      })
                    }
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                  >
                    <span>🎤</span> Repeat Aloud
                  </button>
                  <button
                    onClick={() => {
                      if (multiplier < 10) {
                        setMultiplier((m) => m + 1);
                        setFeedback(null);
                      } else {
                        setState("SUMMARY");
                        setCompletedTaskName(`Table of ${currentTable}`);
                      }
                    }}
                    className="btn-secondary py-2.5 px-4 text-xs font-bold"
                  >
                    Skip Line →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUBJECT 2: WORDS & SPELLING MODULE (500 Dictionary Words per Class) */}
        {/* ========================================================================= */}
        {selectedSubject === "words" && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-md border border-purple-100 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-gray-500 mb-4 pb-3 border-b border-purple-100">
              <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
                Word {wordIndex + 1} of {currentWordList.length} • {selectedClass} Vocabulary (500 Words)
              </span>
              <div className="flex items-center gap-3">
                <span className="text-amber-600 font-extrabold">⭐ {stars} Stars</span>
                <span className="text-purple-600 font-extrabold">✅ {wordsLearnedCount} Practiced</span>
              </div>
            </div>

            {/* Word Search & Jump Controls */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-5 bg-gradient-to-r from-purple-50/80 to-blue-50/80 p-3.5 rounded-2xl border border-purple-100">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="🔍 Search 500 words..."
                  value={wordSearch}
                  onChange={(e) => setWordSearch(e.target.value)}
                  className="w-full text-xs font-semibold py-2 px-3 pl-7 bg-white rounded-xl border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                {wordSearch && (
                  <button
                    onClick={() => setWordSearch("")}
                    className="absolute right-2.5 top-2 text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const num = parseInt(jumpWordNum, 10);
                    if (!isNaN(num) && num >= 1 && num <= currentWordList.length) {
                      setWordIndex(num - 1);
                      setFeedback(null);
                      setState("IDLE");
                      setJumpWordNum("");
                    }
                  }}
                  className="flex items-center gap-1.5"
                >
                  <span className="text-xs font-bold text-gray-500 whitespace-nowrap">Go to #:</span>
                  <input
                    type="number"
                    min="1"
                    max={currentWordList.length}
                    placeholder={`1-${currentWordList.length}`}
                    value={jumpWordNum}
                    onChange={(e) => setJumpWordNum(e.target.value)}
                    className="w-16 text-center text-xs font-bold py-1.5 px-2 bg-white rounded-lg border border-purple-200 focus:outline-none focus:ring-1 focus:ring-purple-400"
                  />
                  <button type="submit" className="btn-secondary py-1.5 px-2.5 text-xs font-bold cursor-pointer">
                    Go
                  </button>
                </form>

                <button
                  onClick={() => {
                    const randIdx = Math.floor(Math.random() * currentWordList.length);
                    setWordIndex(randIdx);
                    setFeedback(null);
                    setState("IDLE");
                  }}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold py-1.5 px-3 rounded-lg border border-amber-300 transition cursor-pointer"
                >
                  🎲 Random Word
                </button>

                <button
                  onClick={() => {
                    setCompletedTaskName(`5 Words Practice Session`);
                    setShowTomReward(true);
                  }}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-sm transition cursor-pointer flex items-center gap-1"
                >
                  <span>🐱</span> Tom Break (2m)
                </button>
              </div>
            </div>

            {/* Live Search Results Chips */}
            {wordSearch.trim() && (
              <div className="mb-5 max-h-36 overflow-y-auto bg-white border border-purple-200 rounded-2xl p-3 shadow-inner">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Matching Words ({currentWordList.filter((w) => w.word.toLowerCase().includes(wordSearch.toLowerCase()) || w.meaning.toLowerCase().includes(wordSearch.toLowerCase())).length}):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {currentWordList
                    .map((w, idx) => ({ ...w, idx }))
                    .filter((w) =>
                      w.word.toLowerCase().includes(wordSearch.toLowerCase()) ||
                      w.meaning.toLowerCase().includes(wordSearch.toLowerCase())
                    )
                    .slice(0, 30)
                    .map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setWordIndex(item.idx);
                          setWordSearch("");
                          setFeedback(null);
                          setState("IDLE");
                        }}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg transition cursor-pointer ${
                          wordIndex === item.idx
                            ? "bg-purple-600 text-white"
                            : "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
                        }`}
                      >
                        #{item.idx + 1} {item.word}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {state === "SUMMARY" ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-3">🏆</div>
                <h2 className="text-3xl font-black text-purple-700 mb-2">
                  Vocabulary Challenge Mastered!
                </h2>
                <p className="text-lg text-gray-600 mb-6">
                  {wordsLearnedCount > 0
                    ? `Great job! You have practiced ${wordsLearnedCount} words for ${selectedClass}!`
                    : `You completed words for ${selectedClass}!`}
                </p>

                {/* 2-Minute Talking Tom Reward */}
                <div className="my-6 p-6 bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600 rounded-3xl text-white shadow-xl max-w-lg mx-auto">
                  <span className="text-4xl block mb-2">🐱🎁</span>
                  <h3 className="text-2xl font-black mb-1">2-Minute Reward Unlocked!</h3>
                  <p className="text-sm font-semibold mb-4 text-purple-100">
                    Enjoy your well-deserved 2 minutes of fun with Talking Tom!
                  </p>
                  <button
                    onClick={() => setShowTomReward(true)}
                    className="py-3.5 px-8 bg-white text-purple-900 font-black text-lg rounded-2xl shadow-lg hover:scale-105 transition cursor-pointer"
                  >
                    ▶ Play with Talking Tom Now (2 Min) 🐱
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                  <button
                    onClick={() => {
                      if (wordIndex < currentWordList.length - 1) {
                        setWordIndex((w) => w + 1);
                      } else {
                        setWordIndex(0);
                      }
                      setState("IDLE");
                      setFeedback(null);
                    }}
                    className="btn-primary py-3 px-6"
                  >
                    ▶ Continue with Next Words
                  </button>
                  <button
                    onClick={() => {
                      setWordIndex(0);
                      setState("IDLE");
                      setFeedback(null);
                    }}
                    className="btn-secondary py-3 px-6"
                  >
                    ↻ Start From Beginning
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Word Display Banner */}
                <div className="text-center py-6 px-4 bg-gradient-to-b from-blue-50/60 to-purple-50/40 rounded-2xl border border-blue-100 mb-6">
                  <span className="text-xs uppercase tracking-wider font-extrabold text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                    CBSE {selectedClass} • Word #{wordIndex + 1}
                  </span>
                  <h2 className="text-4xl sm:text-5xl font-black text-slate-800 mt-3 mb-2">{currentWord.word}</h2>
                  <p className="text-base text-gray-700 font-semibold mb-2">
                    <strong>Meaning:</strong> {currentWord.meaning}
                  </p>
                  <p className="text-sm text-purple-700 italic mb-2">
                    &ldquo;{currentWord.example}&rdquo;
                  </p>
                  <div className="inline-block mt-1 px-3 py-1 bg-white/80 rounded-xl border border-purple-100 text-xs font-bold text-purple-800">
                    🗣️ Spelling: {currentWord.phonetic}
                  </div>
                </div>

                {/* Feedback */}
                {feedback && (
                  <div
                    className={`p-3 rounded-2xl text-center font-bold text-sm mb-6 ${
                      feedback.isCorrect
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-amber-50 text-amber-800 border border-amber-200"
                    }`}
                  >
                    {feedback.text}
                  </div>
                )}

                {/* Spelling Quiz Options */}
                <div className="mb-6">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center mb-3">
                    Tap the correct spelling:
                  </p>
                  <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                    {currentWord.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => verifyWordAnswer(opt)}
                        className="py-3 px-4 rounded-xl font-bold text-lg bg-white hover:bg-blue-50 text-blue-800 border-2 border-blue-100 hover:border-blue-400 shadow-sm transition cursor-pointer"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => {
                      if (wordIndex > 0) {
                        setWordIndex((w) => w - 1);
                        setFeedback(null);
                        setState("IDLE");
                      }
                    }}
                    disabled={wordIndex <= 0}
                    className="btn-secondary py-2.5 px-4 text-xs font-bold disabled:opacity-40"
                  >
                    ← Prev Word
                  </button>
                  <button onClick={reciteWord} className="btn-primary py-3 px-6 text-sm font-black flex items-center gap-2">
                    <span>🔊</span> Teach Me This Word
                  </button>
                  <button
                    onClick={() =>
                      startListening(currentWord.word, (match) => {
                        verifyWordAnswer(match ? currentWord.word : "");
                      })
                    }
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                  >
                    <span>🎤</span> Say Word Aloud
                  </button>
                  <button
                    onClick={() => {
                      if (wordIndex < currentWordList.length - 1) {
                        setWordIndex((w) => w + 1);
                        setFeedback(null);
                        setState("IDLE");
                      }
                    }}
                    disabled={wordIndex >= currentWordList.length - 1}
                    className="btn-secondary py-2.5 px-4 text-xs font-bold"
                  >
                    Next Word →
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUBJECT 3: RHYMES & POEMS MODULE (30-50 Poems per Class) */}
        {/* ========================================================================= */}
        {selectedSubject === "rhymes" && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-md border border-purple-100 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-gray-500 mb-4 pb-3 border-b border-pink-100">
              <span className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full">
                Poem {rhymeIndex + 1} of {currentRhymeList.length} • {selectedClass} Rhymes &amp; Poems
              </span>
              <span className="text-amber-600 font-extrabold">⭐ {stars} Stars</span>
            </div>

            {/* Rhyme Search & Prev/Next Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-5 bg-gradient-to-r from-pink-50/80 to-purple-50/80 p-3.5 rounded-2xl border border-pink-100">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="🔍 Search 35 poems..."
                  value={rhymeSearch}
                  onChange={(e) => setRhymeSearch(e.target.value)}
                  className="w-full text-xs font-semibold py-2 px-3 pl-7 bg-white rounded-xl border border-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
                {rhymeSearch && (
                  <button
                    onClick={() => setRhymeSearch("")}
                    className="absolute right-2.5 top-2 text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (rhymeIndex > 0) {
                      setRhymeIndex((r) => r - 1);
                      setRhymeLineIndex(0);
                      setState("IDLE");
                      setFeedback(null);
                    }
                  }}
                  disabled={rhymeIndex <= 0}
                  className="btn-secondary py-1.5 px-3 text-xs font-bold disabled:opacity-40"
                >
                  ← Prev Poem
                </button>

                <button
                  onClick={() => {
                    const rand = Math.floor(Math.random() * currentRhymeList.length);
                    setRhymeIndex(rand);
                    setRhymeLineIndex(0);
                    setState("IDLE");
                    setFeedback(null);
                  }}
                  className="bg-pink-100 hover:bg-pink-200 text-pink-800 text-xs font-bold py-1.5 px-3 rounded-lg border border-pink-300 transition cursor-pointer"
                >
                  🎲 Random Poem
                </button>

                <button
                  onClick={() => {
                    if (rhymeIndex < currentRhymeList.length - 1) {
                      setRhymeIndex((r) => r + 1);
                      setRhymeLineIndex(0);
                      setState("IDLE");
                      setFeedback(null);
                    }
                  }}
                  disabled={rhymeIndex >= currentRhymeList.length - 1}
                  className="btn-secondary py-1.5 px-3 text-xs font-bold disabled:opacity-40"
                >
                  Next Poem →
                </button>
              </div>
            </div>

            {/* Rhyme Selector Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-thin">
              {currentRhymeList
                .map((rhyme, idx) => ({ ...rhyme, originalIdx: idx }))
                .filter((r) =>
                  !rhymeSearch.trim() ||
                  r.title.toLowerCase().includes(rhymeSearch.toLowerCase()) ||
                  r.moralOrTheme.toLowerCase().includes(rhymeSearch.toLowerCase())
                )
                .map((rhyme) => (
                  <button
                    key={rhyme.id}
                    onClick={() => {
                      setRhymeIndex(rhyme.originalIdx);
                      setRhymeLineIndex(0);
                      setFeedback(null);
                      setState("IDLE");
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      rhymeIndex === rhyme.originalIdx
                        ? "bg-pink-600 text-white shadow-sm"
                        : "bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100"
                    }`}
                  >
                    🎵 {rhyme.title}
                  </button>
                ))}
            </div>

            {state === "SUMMARY" ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-3">🎉</div>
                <h2 className="text-3xl font-black text-pink-700 mb-2">
                  Poem Recitation Complete!
                </h2>
                <p className="text-lg text-gray-600 mb-6">
                  You recited &ldquo;{currentRhyme.title}&rdquo; beautifully!
                </p>

                {/* 2-Minute Talking Tom Reward */}
                <div className="my-6 p-6 bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600 rounded-3xl text-white shadow-xl max-w-lg mx-auto">
                  <span className="text-4xl block mb-2">🐱🎁</span>
                  <h3 className="text-2xl font-black mb-1">2-Minute Reward Unlocked!</h3>
                  <p className="text-sm font-semibold mb-4 text-purple-100">
                    Enjoy your 2 minutes of fun with Talking Tom!
                  </p>
                  <button
                    onClick={() => setShowTomReward(true)}
                    className="py-3.5 px-8 bg-white text-purple-900 font-black text-lg rounded-2xl shadow-lg hover:scale-105 transition cursor-pointer"
                  >
                    ▶ Play with Talking Tom Now (2 Min) 🐱
                  </button>
                </div>

                <button
                  onClick={() => setState("IDLE")}
                  className="btn-secondary py-3 px-6"
                >
                  ↻ Recite Another Poem
                </button>
              </div>
            ) : (
              <>
                {/* Rhyme Display Card */}
                <div className="text-center py-6 px-4 bg-gradient-to-b from-pink-50/60 to-purple-50/40 rounded-2xl border border-pink-100 mb-6">
                  <span className="text-xs uppercase tracking-wider font-extrabold text-pink-600 bg-pink-100 px-3 py-1 rounded-full">
                    Poem #{rhymeIndex + 1}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-pink-700 mt-2 mb-1">
                    {currentRhyme.title}
                  </h2>
                  {currentRhyme.author && <p className="text-xs text-gray-400 font-semibold mb-4">By {currentRhyme.author}</p>}

                  <div className="my-6 space-y-2">
                    {currentRhyme.stanzas.map((line, idx) => (
                      <p
                        key={idx}
                        onClick={() => {
                          setRhymeLineIndex(idx);
                          speakAsLadyTeacher(line);
                        }}
                        className={`text-lg sm:text-xl font-bold py-1.5 px-3 rounded-xl transition cursor-pointer ${
                          rhymeLineIndex === idx
                            ? "bg-pink-200/70 text-pink-900 scale-102"
                            : "text-gray-700 hover:bg-pink-50"
                        }`}
                      >
                        {line}
                      </p>
                    ))}
                  </div>

                  <div className="p-3 bg-white/80 rounded-xl border border-pink-100 text-xs font-semibold text-pink-800">
                    🌱 <strong>Moral / Learning Theme:</strong> {currentRhyme.moralOrTheme}
                  </div>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-gray-100">
                  <button onClick={reciteRhymeLine} className="btn-primary py-3 px-6 text-sm font-black flex items-center gap-2">
                    <span>🔊</span> Read Current Line
                  </button>
                  <button
                    onClick={reciteFullRhyme}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                  >
                    <span>🎶</span> Recite Full Poem
                  </button>
                  <button
                    onClick={() => {
                      setCompletedTaskName(`Poem: ${currentRhyme.title}`);
                      setShowTomReward(true);
                    }}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                  >
                    <span>🐱</span> Play with Talking Tom (2m)
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUBJECT 4: PHONICS & SOUNDS MODULE */}
        {/* ========================================================================= */}
        {selectedSubject === "phonics" && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-md border border-purple-100 mb-6">
            <h2 className="text-xl font-black text-purple-700 mb-4 text-center">
              🅰️ Phonics &amp; Letter Sounds for {selectedClass}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {classData.phonics.map((p) => (
                <div
                  key={p.letter}
                  onClick={() => speakAsLadyTeacher(`${p.letter} for ${p.word}. Sound is ${p.sound}.`)}
                  className="p-5 rounded-2xl bg-gradient-to-b from-purple-50 to-indigo-50 border border-purple-100 text-center hover:shadow-md transition cursor-pointer"
                >
                  <span className="text-4xl font-black text-purple-600 block mb-1">{p.letter}</span>
                  <p className="font-bold text-gray-800 text-lg">{p.word}</p>
                  <p className="text-xs text-purple-600 font-semibold mt-1">Sound: &ldquo;{p.sound}&rdquo;</p>
                  <button className="mt-3 text-xs bg-purple-600 text-white font-bold px-3 py-1 rounded-full">
                    🔊 Listen
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
