"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface TalkingTomRewardProps {
  childName: string;
  onFinish: () => void;
  taskTitle?: string;
}

export default function TalkingTomReward({
  childName,
  onFinish,
  taskTitle = "Lesson Task",
}: TalkingTomRewardProps) {
  // 2 Minutes = 120 Seconds
  const [secondsLeft, setSecondsLeft] = useState<number>(120);
  const [tomAction, setTomAction] = useState<"idle" | "talking" | "purring" | "drinking" | "laughing" | "dancing" | "poked">("idle");
  const [tomSpeech, setTomSpeech] = useState<string>("Meow! Great job completing your task! I am Talking Tom. Talk to me or tickle me!");
  const [isListening, setIsListening] = useState<boolean>(false);
  const [heardText, setHeardText] = useState<string>("");

  const recognitionRef = useRef<any>(null);
  const actionTimeoutRef = useRef<any>(null);

  // Play fun sound effects using Web Audio API
  const playSoundEffect = useCallback((type: "purr" | "slurp" | "giggle" | "jump" | "chime") => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === "purr") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(45, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.2);
      } else if (type === "slurp") {
        for (let i = 0; i < 4; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(300 + i * 150, ctx.currentTime + i * 0.15);
          gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.15);
          osc.stop(ctx.currentTime + i * 0.15 + 0.12);
        }
      } else if (type === "giggle") {
        for (let i = 0; i < 5; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(600 + (i % 2 === 0 ? 200 : 0), ctx.currentTime + i * 0.1);
          gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.1);
          osc.stop(ctx.currentTime + i * 0.1 + 0.08);
        }
      } else if (type === "chime") {
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
          gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.5);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.12);
          osc.stop(ctx.currentTime + idx * 0.12 + 0.5);
        });
      }
    } catch {
      // AudioContext policy fallback
    }
  }, []);

  // Speak with Tom's high-pitched, funny cartoon cat voice!
  const speakAsTom = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      onEnd?.();
      return;
    }

    window.speechSynthesis.cancel();
    setTomSpeech(text);
    setTomAction("talking");

    const utterance = new SpeechSynthesisUtterance(text);
    // Squeaky funny high pitch and faster pace for Talking Tom!
    utterance.pitch = 1.85;
    utterance.rate = 1.25;

    const voices = window.speechSynthesis.getVoices();
    const tomVoice = voices.find((v) => v.name.includes("Junior") || v.name.includes("Kid") || v.name.includes("Samantha")) || voices[0];
    if (tomVoice) utterance.voice = tomVoice;

    utterance.onend = () => {
      setTomAction("idle");
      onEnd?.();
    };

    utterance.onerror = () => {
      setTomAction("idle");
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  // 2-Minute Timer Countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          playSoundEffect("chime");
          speakAsTom(`Time is up, ${childName}! You played so well! Let us get back to learning to earn another 2 minutes!`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [childName, playSoundEffect, speakAsTom]);

  // Initial welcome message from Tom
  useEffect(() => {
    const timer = setTimeout(() => {
      speakAsTom(`Meow! Congratulations ${childName}! You unlocked 2 minutes of playtime with me! Tap me or speak into the microphone!`);
    }, 600);
    return () => clearTimeout(timer);
  }, [childName, speakAsTom]);

  // Cleanup
  useEffect(() => {
    const actionTimeout = actionTimeoutRef.current;
    const recognition = recognitionRef.current;
    return () => {
      if (actionTimeout) clearTimeout(actionTimeout);
      if (recognition) {
        try {
          recognition.stop();
        } catch {
          // ignore
        }
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Voice Mimic: Listen to child and repeat back in Tom's voice!
  const startListeningToChild = () => {
    if (typeof window === "undefined") return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      speakAsTom("Meow! Microphone is not supported on this browser, but you can tap my buttons below!");
      return;
    }

    try {
      window.speechSynthesis?.cancel();
      setIsListening(true);
      setHeardText("Tom is listening to your voice...");

      const rec = new SpeechRec();
      rec.lang = "en-IN";
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        setHeardText(`You said: "${transcript}"`);
        // Tom repeats what child said with funny cat additions!
        speakAsTom(`${transcript}! Meow! Hehehe!`);
      };

      rec.onerror = () => {
        setIsListening(false);
        setHeardText("");
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch {
      setIsListening(false);
    }
  };

  // Interactive Tom Actions
  const handlePetTom = () => {
    setTomAction("purring");
    playSoundEffect("purr");
    speakAsTom(`Purrrr! That feels so good, ${childName}! You are my best friend!`);
  };

  const handleTickleTom = () => {
    setTomAction("laughing");
    playSoundEffect("giggle");
    speakAsTom(`Hehehe! Hahaha! Stop it, ${childName}! My tummy tickles so much!`);
  };

  const handleFeedMilk = () => {
    setTomAction("drinking");
    playSoundEffect("slurp");
    speakAsTom(`Slurp, slurp, slurp! Ahhh, delicious cold milk! Thank you, ${childName}!`);
  };

  const handleTomDance = () => {
    setTomAction("dancing");
    speakAsTom(`Meow meow, la la la! Look at my cool cat dance moves! Join me, ${childName}!`);
  };

  const handlePokeTom = () => {
    setTomAction("poked");
    speakAsTom(`Ouch! Hey, gentle please, buddy! Hehehe!`);
  };

  // Format time (MM:SS)
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeString = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-900 text-white p-4 sm:p-6 flex flex-col items-center justify-between">
      {/* Top Banner & Timer */}
      <div className="w-full max-w-2xl bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-extrabold tracking-widest text-amber-300 bg-amber-400/20 px-3 py-1 rounded-full">
            ⭐ 2-Minute Game Reward Unlocked!
          </span>
          <h1 className="text-xl sm:text-2xl font-black mt-1 text-white">
            Talking Tom &amp; {childName} 🐱
          </h1>
          <p className="text-xs text-purple-200">Earned for completing: {taskTitle}</p>
        </div>

        {/* 2-Minute Countdown Display */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs font-bold text-purple-300 block">Reward Playtime:</span>
            <span
              className={`text-2xl sm:text-3xl font-black font-mono tracking-wider ${
                secondsLeft <= 20 ? "text-rose-400 animate-pulse" : "text-amber-400"
              }`}
            >
              ⏱️ {timeString}
            </span>
          </div>
          <button
            onClick={onFinish}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition shadow cursor-pointer"
          >
            Back to Learning 📚
          </button>
        </div>
      </div>

      {/* Progress bar of 2 minutes */}
      <div className="w-full max-w-2xl bg-white/10 h-2 rounded-full overflow-hidden my-3">
        <div
          className="bg-gradient-to-r from-amber-400 via-pink-500 to-purple-500 h-2 rounded-full transition-all duration-1000"
          style={{ width: `${(secondsLeft / 120) * 100}%` }}
        ></div>
      </div>

      {/* Tom's Speech Bubble */}
      <div className="w-full max-w-md mx-auto my-2">
        <div className="relative bg-white text-slate-800 p-4 rounded-3xl shadow-2xl border-2 border-purple-300 text-center font-extrabold text-sm sm:text-base">
          <p className="leading-snug">🐱 &ldquo;{tomSpeech}&rdquo;</p>
          <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-white"></div>
        </div>
        {heardText && (
          <p className="text-xs text-center text-purple-200 font-semibold mt-2">{heardText}</p>
        )}
      </div>

      {/* Animated Talking Tom Character */}
      <div className="my-2 relative flex flex-col items-center">
        <div
          onClick={handlePetTom}
          className={`cursor-pointer transition-transform duration-300 select-none ${
            tomAction === "laughing"
              ? "animate-bounce scale-105"
              : tomAction === "dancing"
              ? "animate-pulse rotate-3 scale-105"
              : tomAction === "talking"
              ? "scale-102"
              : "hover:scale-105"
          }`}
        >
          {/* Tom's SVG Avatar with Expression States */}
          <svg width="220" height="260" viewBox="0 0 200 240" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Cat Ears */}
            <path
              d="M35 70 L20 20 L70 45 Z"
              fill="#94a3b8"
              stroke="#64748b"
              strokeWidth="4"
              className={tomAction === "talking" ? "animate-spin" : ""}
            />
            <path d="M38 60 L28 32 L60 48 Z" fill="#f472b6" />

            <path d="M165 70 L180 20 L130 45 Z" fill="#94a3b8" stroke="#64748b" strokeWidth="4" />
            <path d="M162 60 L172 32 L140 48 Z" fill="#f472b6" />

            {/* Head */}
            <ellipse cx="100" cy="85" rx="65" ry="55" fill="#94a3b8" stroke="#64748b" strokeWidth="4" />

            {/* Whiskers */}
            <line x1="20" y1="85" x2="60" y2="90" stroke="#475569" strokeWidth="2.5" />
            <line x1="20" y1="100" x2="60" y2="98" stroke="#475569" strokeWidth="2.5" />
            <line x1="140" y1="90" x2="180" y2="85" stroke="#475569" strokeWidth="2.5" />
            <line x1="140" y1="98" x2="180" y2="100" stroke="#475569" strokeWidth="2.5" />

            {/* Eyes */}
            {tomAction === "purring" || tomAction === "laughing" ? (
              <>
                <path d="M65 75 Q75 65 85 75" stroke="#1e293b" strokeWidth="4" fill="none" strokeLinecap="round" />
                <path d="M115 75 Q125 65 135 75" stroke="#1e293b" strokeWidth="4" fill="none" strokeLinecap="round" />
              </>
            ) : (
              <>
                <ellipse cx="75" cy="75" rx="14" ry="18" fill="#ffffff" stroke="#334155" strokeWidth="3" />
                <circle cx="77" cy="75" r="7" fill="#0284c7" />
                <circle cx="79" cy="73" r="2.5" fill="#ffffff" />

                <ellipse cx="125" cy="75" rx="14" ry="18" fill="#ffffff" stroke="#334155" strokeWidth="3" />
                <circle cx="123" cy="75" r="7" fill="#0284c7" />
                <circle cx="125" cy="73" r="2.5" fill="#ffffff" />
              </>
            )}

            {/* Pink Nose */}
            <polygon points="95,95 105,95 100,103" fill="#f472b6" />

            {/* Animated Mouth */}
            {tomAction === "talking" ? (
              <ellipse cx="100" cy="115" rx="12" ry="10" fill="#dc2626" stroke="#991b1b" strokeWidth="2" />
            ) : tomAction === "drinking" ? (
              <circle cx="100" cy="114" r="8" fill="#dc2626" />
            ) : (
              <path d="M90 108 Q100 120 110 108" stroke="#1e293b" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            )}

            {/* Body */}
            <ellipse cx="100" cy="180" rx="55" ry="45" fill="#94a3b8" stroke="#64748b" strokeWidth="4" />
            {/* White Tummy patch (Tap to tickle!) */}
            <ellipse
              cx="100"
              cy="180"
              rx="35"
              ry="30"
              fill="#f1f5f9"
              className="hover:fill-pink-100 transition cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleTickleTom();
              }}
            />

            {/* Paws */}
            <ellipse cx="55" cy="165" rx="14" ry="22" fill="#94a3b8" stroke="#64748b" strokeWidth="3" />
            <ellipse cx="145" cy="165" rx="14" ry="22" fill="#94a3b8" stroke="#64748b" strokeWidth="3" />

            {/* Feet */}
            <ellipse cx="75" cy="225" rx="20" ry="12" fill="#64748b" />
            <ellipse cx="125" cy="225" rx="20" ry="12" fill="#64748b" />
          </svg>
        </div>

        <p className="text-xs text-purple-300 font-bold mt-1 animate-pulse">
          👆 Tap Tom&apos;s tummy to tickle, or head to pet him!
        </p>
      </div>

      {/* Action Buttons for Talking Tom */}
      <div className="w-full max-w-xl mx-auto flex flex-col gap-3">
        {/* Big Mic Button */}
        <button
          onClick={startListeningToChild}
          disabled={isListening}
          className={`py-3.5 px-6 rounded-2xl font-black text-base sm:text-lg flex items-center justify-center gap-3 transition shadow-lg cursor-pointer ${
            isListening
              ? "bg-rose-500 animate-pulse text-white"
              : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-emerald-900/50"
          }`}
        >
          <span className="text-2xl">🎙️</span>
          {isListening ? "Listening... Speak to Tom now!" : "Talk to Tom (He will repeat you!)"}
        </button>

        {/* Quick Fun Interactions */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={handleFeedMilk}
            className="py-2.5 px-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer"
          >
            <span className="text-xl">🥛</span> Give Milk
          </button>
          <button
            onClick={handleTickleTom}
            className="py-2.5 px-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer"
          >
            <span className="text-xl">🪶</span> Tickle
          </button>
          <button
            onClick={handlePetTom}
            className="py-2.5 px-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer"
          >
            <span className="text-xl">🐱</span> Pet Tom
          </button>
          <button
            onClick={handleTomDance}
            className="py-2.5 px-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer"
          >
            <span className="text-xl">💃</span> Dance
          </button>
        </div>

        {/* When 2 minutes expire */}
        {secondsLeft === 0 && (
          <div className="bg-amber-400 text-slate-900 p-4 rounded-2xl text-center font-bold shadow-lg animate-bounce mt-2">
            <p className="text-sm">⏰ 2-Minute Game Reward Finished!</p>
            <button
              onClick={onFinish}
              className="mt-2 px-6 py-2 bg-slate-900 text-white font-black text-sm rounded-xl hover:bg-slate-800 transition cursor-pointer"
            >
              Continue Next Learning Task 🚀
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
