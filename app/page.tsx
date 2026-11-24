"use client";

import { useState } from "react";
import LessonScreen from "@/components/LessonScreen";
import TalkingTomReward from "@/components/TalkingTomReward";
import { CBSEClass, SubjectType } from "@/lib/curriculum/cbse-data";
import { IndianLadyVoice } from "@/lib/speech/lady-voice";

export default function HomePage() {
  const [childName, setChildName] = useState("Aarav");
  const [selectedClass, setSelectedClass] = useState<CBSEClass>("Class 3");
  const [selectedSubject, setSelectedSubject] = useState<SubjectType>("tables");
  const [hasStarted, setHasStarted] = useState(false);
  const [showTomDirect, setShowTomDirect] = useState(false);

  const handleStart = () => {
    if (!childName.trim()) {
      alert("Please enter child's name!");
      return;
    }
    setHasStarted(true);
  };

  const playWelcomeVoice = () => {
    const greeting = IndianLadyVoice.getGreeting(
      childName.trim() || "darling",
      selectedSubject === "tables"
        ? "Multiplication Tables up to 30"
        : selectedSubject === "words"
        ? "English Vocabulary Words"
        : selectedSubject === "rhymes"
        ? "Melodious Rhymes and Poems"
        : "Phonics and Letter Sounds"
    );
    IndianLadyVoice.speak(greeting);
  };

  if (showTomDirect) {
    return (
      <TalkingTomReward
        childName={childName.trim() || "Aarav"}
        taskTitle="Fun Play Session"
        onFinish={() => setShowTomDirect(false)}
      />
    );
  }

  if (hasStarted) {
    return (
      <LessonScreen
        initialChildName={childName}
        initialClass={selectedClass}
        initialSubject={selectedSubject}
        onBack={() => {
          IndianLadyVoice.stop();
          setHasStarted(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-100 via-pink-50 to-indigo-100 py-8 px-4 sm:px-6">
      <div className="max-w-xl mx-auto">
        <div className="card p-6 sm:p-8 shadow-xl border-2 border-purple-100 backdrop-blur-md bg-white/95">
          {/* Header */}
          <div className="text-center mb-6">
            <span className="text-4xl mb-2 block">🌸</span>
            <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-purple-700 via-pink-600 to-indigo-600 bg-clip-text text-transparent">
              Tables Buddy
            </h1>
            <p className="text-xs font-bold text-pink-600 uppercase tracking-widest mt-1">
              CBSE Primary Education (Class 1 to 5)
            </p>
            <p className="text-sm font-semibold text-gray-600 mt-2">
              With your gentle Indian Teacher: <em>&ldquo;Hello darling! Let us learn with joy!&rdquo;</em>
            </p>
            <button
              type="button"
              onClick={playWelcomeVoice}
              className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 px-3.5 py-1.5 rounded-full transition cursor-pointer"
            >
              <span>🔊</span> Listen to Teacher&apos;s Voice
            </button>
          </div>

          {/* Child's Name Input */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-purple-900 mb-1.5">
              Child&apos;s Name <span className="text-pink-600">*</span>
            </label>
            <input
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              placeholder="Enter child's name (e.g. Aarav, Ananya...)"
              className="input w-full py-3 px-4 rounded-xl text-base font-semibold focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          {/* CBSE Class Selection (Class 1 to 5) */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-purple-900 mb-2">
              Select CBSE Class:
            </label>
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {(["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"] as CBSEClass[]).map((cls) => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setSelectedClass(cls)}
                  className={`py-2.5 px-1 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer text-center ${
                    selectedClass === cls
                      ? "bg-purple-600 text-white shadow-md shadow-purple-200 scale-105"
                      : "bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200"
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 font-medium mt-2">
              {selectedClass === "Class 1" && "👶 Ages 5-6: Tables 1-10, 500 Sight & Daily Words, 35 Classic Nursery Rhymes"}
              {selectedClass === "Class 2" && "👧 Ages 6-7: Tables 2-12, 500 Opposites & Nature Words, 35 Stevenson Rhymes"}
              {selectedClass === "Class 3" && "👦 Ages 7-8: Tables 2-15, 500 Action & Science Words, 35 CBSE NCERT Poems"}
              {selectedClass === "Class 4" && "🎓 Ages 8-9: Tables 2-20, 500 Environment & Literary Words, 35 Classic Poems"}
              {selectedClass === "Class 5" && "🏆 Ages 9-11: Tables 2-30, 500 Advanced Vocabulary Words, 35 Inspirational Poems"}
            </p>
          </div>

          {/* Subject / Topic Selection */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-purple-900 mb-2">
              Choose Subject to Learn:
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedSubject("tables")}
                className={`py-3.5 px-4 rounded-2xl text-sm font-black flex items-center justify-start gap-2.5 transition cursor-pointer border ${
                  selectedSubject === "tables"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-600 shadow-md"
                    : "bg-white hover:bg-purple-50 text-purple-800 border-purple-100 shadow-sm"
                }`}
              >
                <span className="text-xl">📐</span>
                <div className="text-left">
                  <div>Tables (1 to 30)</div>
                  <div className="text-xs opacity-80 font-normal">Multiplication up to 30</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSubject("words")}
                className={`py-3.5 px-4 rounded-2xl text-sm font-black flex items-center justify-start gap-2.5 transition cursor-pointer border ${
                  selectedSubject === "words"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-600 shadow-md"
                    : "bg-white hover:bg-purple-50 text-purple-800 border-purple-100 shadow-sm"
                }`}
              >
                <span className="text-xl">📖</span>
                <div className="text-left">
                  <div>English Words</div>
                  <div className="text-xs opacity-80 font-normal">500 Words / Class</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSubject("rhymes")}
                className={`py-3.5 px-4 rounded-2xl text-sm font-black flex items-center justify-start gap-2.5 transition cursor-pointer border ${
                  selectedSubject === "rhymes"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-600 shadow-md"
                    : "bg-white hover:bg-purple-50 text-purple-800 border-purple-100 shadow-sm"
                }`}
              >
                <span className="text-xl">🎵</span>
                <div className="text-left">
                  <div>Rhymes &amp; Poems</div>
                  <div className="text-xs opacity-80 font-normal">35 Poems / Class</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSubject("phonics")}
                className={`py-3.5 px-4 rounded-2xl text-sm font-black flex items-center justify-start gap-2.5 transition cursor-pointer border ${
                  selectedSubject === "phonics"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-600 shadow-md"
                    : "bg-white hover:bg-purple-50 text-purple-800 border-purple-100 shadow-sm"
                }`}
              >
                <span className="text-xl">🅰️</span>
                <div className="text-left">
                  <div>Phonics &amp; Sounds</div>
                  <div className="text-xs opacity-80 font-normal">Letters &amp; Pronunciation</div>
                </div>
              </button>
            </div>
          </div>

          {/* Big Start Button */}
          <button
            type="button"
            onClick={handleStart}
            disabled={!childName.trim()}
            className="btn-primary w-full py-4 text-xl sm:text-2xl font-black shadow-lg shadow-purple-300 transition cursor-pointer"
          >
            ▶ Start Learning with Teacher 🚀
          </button>

          {/* Quick Talking Tom Launcher */}
          <button
            type="button"
            onClick={() => setShowTomDirect(true)}
            className="w-full mt-3 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600 hover:from-amber-500 hover:via-pink-600 hover:to-purple-700 text-white font-black text-sm sm:text-base shadow-md transition cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
          >
            <span>🐱</span> Play with Talking Tom (2-Min Reward Game) 🎁
          </button>
        </div>

        {/* Footer note */}
        <div className="mt-6 text-center text-xs font-semibold text-purple-700/70">
          <p>Designed for CBSE Curriculum (Class 1 to 5) • Multiplication Tables up to 30</p>
          <p className="mt-0.5">Supports Web Speech API • Works on Phone, Tablet &amp; Laptop</p>
        </div>
      </div>
    </div>
  );
}
