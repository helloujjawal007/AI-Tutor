"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface TalkingTomRewardProps {
  childName: string;
  onFinish: () => void;
  taskTitle?: string;
}

// AudioContext singleton to prevent exceeding browser hardware context limits
let sharedAudioCtx: AudioContext | null = null;
function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;
  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

export default function TalkingTomReward({
  childName = "Aarav",
  onFinish,
  taskTitle = "Lesson Task",
}: TalkingTomRewardProps) {
  // 2 Minutes = 120 Seconds
  const [secondsLeft, setSecondsLeft] = useState<number>(120);
  const [tomAction, setTomAction] = useState<
    "idle" | "talking" | "purring" | "drinking" | "laughing" | "dancing" | "poked"
  >("idle");
  const [tomSpeech, setTomSpeech] = useState<string>(
    `Meow! Hello ${childName}! I am Talking Tom. Talk to me, tickle my tummy, or feed me milk!`
  );
  const [isListening, setIsListening] = useState<boolean>(false);
  const [heardText, setHeardText] = useState<string>("");
  const [mouthOpen, setMouthOpen] = useState<boolean>(false);
  const [customText, setCustomText] = useState<string>("");
  const [particles, setParticles] = useState<Array<{ id: number; emoji: string; x: number; y: number }>>([]);

  const recognitionRef = useRef<any>(null);
  const mouthIntervalRef = useRef<any>(null);
  const speechFallbackTimerRef = useRef<any>(null);

  // Trigger floating particles (hearts, notes, milk bubbles)
  const spawnParticles = useCallback((emoji: string, count: number = 5) => {
    const newItems = Array.from({ length: count }, (_, i) => ({
      id: Date.now() + i + Math.random(),
      emoji,
      x: 35 + Math.random() * 30, // percentage from left
      y: 40 + Math.random() * 20, // percentage from top
    }));
    setParticles((prev) => [...prev, ...newItems]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newItems.some((n) => n.id === p.id)));
    }, 1500);
  }, []);

  // Play fun synthesized sound effects using Web Audio API
  const playSoundEffect = useCallback(
    (type: "purr" | "slurp" | "giggle" | "meow" | "dance" | "boing" | "chime") => {
      const ctx = getAudioContext();
      if (!ctx) return;

      try {
        if (ctx.state === "suspended") {
          ctx.resume().catch(() => {});
        }

        if (type === "purr") {
          // Low rumbling sawtooth cat purr with filter
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();

          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(45, ctx.currentTime);
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(120, ctx.currentTime);

          gain.gain.setValueAtTime(0.25, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 1.4);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 1.4);
        } else if (type === "meow") {
          // Authentic cat meow formant pitch sweep
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";

          osc.frequency.setValueAtTime(380, ctx.currentTime);
          osc.frequency.linearRampToValueAtTime(640, ctx.currentTime + 0.22);
          osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.65);

          gain.gain.setValueAtTime(0.02, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.15);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.65);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.65);
        } else if (type === "slurp") {
          // Drinking water/milk bubbles
          for (let i = 0; i < 5; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            const t = ctx.currentTime + i * 0.12;

            osc.frequency.setValueAtTime(320 + i * 70, t);
            osc.frequency.exponentialRampToValueAtTime(800 + i * 40, t + 0.08);

            gain.gain.setValueAtTime(0.18, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(t);
            osc.stop(t + 0.1);
          }
        } else if (type === "giggle") {
          // Playful giggles
          const freqs = [550, 680, 600, 750, 820, 700];
          freqs.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            const t = ctx.currentTime + idx * 0.08;

            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.18, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.06);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(t);
            osc.stop(t + 0.06);
          });
        } else if (type === "dance") {
          // Cheerful 8-note dance party melody
          const notes = [523, 659, 784, 880, 784, 659, 587, 523];
          notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            const t = ctx.currentTime + i * 0.13;

            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.11);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(t);
            osc.stop(t + 0.11);
          });
        } else if (type === "boing") {
          // Funny poke spring sound
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";

          osc.frequency.setValueAtTime(220, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(550, ctx.currentTime + 0.15);
          osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.35);

          gain.gain.setValueAtTime(0.25, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.35);
        } else if (type === "chime") {
          const notes = [523.25, 659.25, 783.99, 1046.5];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            const t = ctx.currentTime + idx * 0.12;

            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(t);
            osc.stop(t + 0.5);
          });
        }
      } catch {
        // Fallback silently if audio context is blocked
      }
    },
    []
  );

  // Speak with Tom's high-pitched, comical cartoon cat voice
  const speakAsTom = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window === "undefined") {
      onEnd?.();
      return;
    }

    setTomSpeech(text);
    setTomAction("talking");

    if (!("speechSynthesis" in window)) {
      setTimeout(() => {
        setTomAction("idle");
        onEnd?.();
      }, 1500);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      // High pitch and cheerful pace for comical cartoon cat voice
      utterance.pitch = 1.75;
      utterance.rate = 1.2;

      const voices = window.speechSynthesis.getVoices();
      const tomVoice =
        voices.find(
          (v) =>
            v.lang.startsWith("en") &&
            (v.name.includes("Junior") ||
              v.name.includes("Kid") ||
              v.name.includes("Samantha") ||
              v.name.includes("Victoria") ||
              v.name.includes("Zira") ||
              v.name.includes("Female"))
        ) ||
        voices.find((v) => v.lang.startsWith("en")) ||
        voices[0];

      if (tomVoice) utterance.voice = tomVoice;

      const cleanupSpeech = () => {
        if (speechFallbackTimerRef.current) clearTimeout(speechFallbackTimerRef.current);
        setTomAction("idle");
        onEnd?.();
      };

      utterance.onend = cleanupSpeech;
      utterance.onerror = cleanupSpeech;

      // Safety timeout: ensure Tom's mouth stops moving even if browser event drops
      const estimatedDurationMs = Math.max(1600, text.length * 90);
      speechFallbackTimerRef.current = setTimeout(cleanupSpeech, estimatedDurationMs);

      window.speechSynthesis.speak(utterance);
    } catch {
      setTomAction("idle");
      onEnd?.();
    }
  }, []);

  // Oscillate mouth movement while talking
  useEffect(() => {
    if (tomAction === "talking") {
      mouthIntervalRef.current = setInterval(() => {
        setMouthOpen((prev) => !prev);
      }, 140);
    } else {
      setMouthOpen(false);
      if (mouthIntervalRef.current) clearInterval(mouthIntervalRef.current);
    }
    return () => {
      if (mouthIntervalRef.current) clearInterval(mouthIntervalRef.current);
    };
  }, [tomAction]);

  // 2-Minute Timer Countdown (120s down to 0)
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          playSoundEffect("chime");
          speakAsTom(`Time is up, ${childName}! You played so well! Let us learn more to earn another 2 minutes!`);
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
      playSoundEffect("meow");
      speakAsTom(`Meow! Congratulations ${childName}! You unlocked 2 minutes of fun with me! Tap me or speak!`);
    }, 400);
    return () => clearTimeout(timer);
  }, [childName, playSoundEffect, speakAsTom]);

  // Cleanup on unmount
  useEffect(() => {
    const recognition = recognitionRef.current;
    return () => {
      if (speechFallbackTimerRef.current) clearTimeout(speechFallbackTimerRef.current);
      if (mouthIntervalRef.current) clearInterval(mouthIntervalRef.current);
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

  // Voice Mimic: Listen to child and repeat back in Tom's squeaky cartoon voice!
  const startListeningToChild = () => {
    if (typeof window === "undefined") return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      playSoundEffect("meow");
      setHeardText("Microphone is not supported in this browser. Please use the quick chat buttons or type below!");
      speakAsTom("Microphone is not supported, but you can tap any funny phrase below!");
      return;
    }

    try {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      setIsListening(true);
      setHeardText("🎙️ Tom is listening... Speak into your microphone now!");
      playSoundEffect("meow");

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
        spawnParticles("😸", 4);
        playSoundEffect("meow");
        // Tom repeats what child said with funny cat additions!
        speakAsTom(`${transcript}! Meow! Hehehe!`);
      };

      rec.onerror = (e: any) => {
        setIsListening(false);
        if (e.error === "not-allowed") {
          setHeardText("Microphone permission was blocked. You can tap the phrase chips or type below!");
          speakAsTom("Microphone was blocked, but you can tap any phrase below!");
        } else if (e.error === "no-speech") {
          setHeardText("I did not hear anything. Tap microphone and speak clearly!");
        } else {
          setHeardText("Tap below to make Tom talk!");
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch {
      setIsListening(false);
      setHeardText("Tap below to make Tom talk!");
    }
  };

  // Quick preset speech buttons (works instantly without microphone permission)
  const handleQuickSay = (phrase: string) => {
    setHeardText(`You said: "${phrase}"`);
    playSoundEffect("meow");
    spawnParticles("⭐", 5);
    speakAsTom(`${phrase}! Meow! Hehehe!`);
  };

  // Custom text input repeat
  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;
    setHeardText(`You typed: "${customText}"`);
    playSoundEffect("meow");
    spawnParticles("💬", 4);
    speakAsTom(`${customText}! Meow!`);
    setCustomText("");
  };

  // Interactive Tom Actions
  const handlePetTom = () => {
    setTomAction("purring");
    playSoundEffect("purr");
    spawnParticles("❤️", 6);
    speakAsTom(`Purrrr! That feels so good, ${childName}! You are my best friend!`);
  };

  const handleTickleTom = () => {
    setTomAction("laughing");
    playSoundEffect("giggle");
    spawnParticles("✨", 6);
    speakAsTom(`Hehehe! Hahaha! Stop it, ${childName}! My tummy tickles so much!`);
  };

  const handleFeedMilk = () => {
    setTomAction("drinking");
    playSoundEffect("slurp");
    spawnParticles("🥛", 5);
    speakAsTom(`Slurp, slurp, slurp! Ahhh, delicious cold milk! Thank you, ${childName}!`);
  };

  const handleTomDance = () => {
    setTomAction("dancing");
    playSoundEffect("dance");
    spawnParticles("🎵", 8);
    speakAsTom(`Meow meow, la la la! Look at my cool cat dance moves! Join me, ${childName}!`);
  };

  const handlePokeTom = () => {
    setTomAction("poked");
    playSoundEffect("boing");
    spawnParticles("💥", 4);
    speakAsTom(`Ouch! Hey, gentle please, buddy! Hehehe!`);
  };

  // Format time (MM:SS)
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeString = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-900 to-slate-950 text-white p-4 sm:p-6 flex flex-col items-center justify-between relative overflow-hidden select-none">
      {/* Floating Particles Overlay */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute text-2xl sm:text-3xl pointer-events-none transition-all duration-1000 ease-out animate-bounce z-50"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
          }}
        >
          {p.emoji}
        </div>
      ))}

      {/* Top Banner & Timer */}
      <div className="w-full max-w-2xl bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-wrap items-center justify-between gap-4 z-10">
        <div>
          <span className="text-xs uppercase font-extrabold tracking-widest text-amber-300 bg-amber-400/20 px-3 py-1 rounded-full border border-amber-300/30">
            ⭐ 2-Minute Reward Game
          </span>
          <h1 className="text-xl sm:text-2xl font-black mt-1 text-white flex items-center gap-2">
            <span>Talking Tom &amp; {childName}</span>
            <span className="text-2xl animate-pulse">🐱</span>
          </h1>
          <p className="text-xs text-purple-200">Unlocked for completing: {taskTitle}</p>
        </div>

        {/* 2-Minute Countdown Display */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[11px] font-bold text-purple-300 block">Time Left:</span>
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
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition shadow-lg cursor-pointer hover:scale-105 active:scale-95"
          >
            Back to Learning 📚
          </button>
        </div>
      </div>

      {/* Progress bar of 2 minutes */}
      <div className="w-full max-w-2xl bg-white/10 h-2.5 rounded-full overflow-hidden my-2 border border-white/10">
        <div
          className="bg-gradient-to-r from-amber-400 via-pink-500 to-purple-400 h-2.5 rounded-full transition-all duration-1000"
          style={{ width: `${(secondsLeft / 120) * 100}%` }}
        ></div>
      </div>

      {/* Tom's Speech Bubble */}
      <div className="w-full max-w-md mx-auto my-2 z-10">
        <div className="relative bg-white text-slate-800 p-4 rounded-3xl shadow-2xl border-2 border-purple-300 text-center font-extrabold text-sm sm:text-base">
          <p className="leading-snug">🐱 &ldquo;{tomSpeech}&rdquo;</p>
          <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-white"></div>
        </div>
        {heardText && (
          <p className="text-xs text-center text-amber-300 font-bold mt-2 bg-black/40 py-1 px-3 rounded-full inline-block mx-auto max-w-full truncate">
            {heardText}
          </p>
        )}
      </div>

      {/* Animated Talking Tom Character */}
      <div className="my-2 relative flex flex-col items-center z-10">
        <div
          className={`cursor-pointer transition-transform duration-300 select-none ${
            tomAction === "laughing"
              ? "animate-bounce scale-105"
              : tomAction === "dancing"
              ? "animate-pulse scale-105"
              : tomAction === "poked"
              ? "rotate-6 scale-95"
              : tomAction === "purring"
              ? "scale-105"
              : "hover:scale-102"
          }`}
        >
          {/* Tom's SVG Avatar with Expression States */}
          <svg width="220" height="250" viewBox="0 0 200 240" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Milk Bowl (visible during drinking) */}
            {tomAction === "drinking" && (
              <g id="milk-bowl">
                <ellipse cx="100" cy="225" rx="42" ry="14" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="3" />
                <ellipse cx="100" cy="223" rx="36" ry="10" fill="#ffffff" />
                <ellipse cx="95" cy="223" rx="10" ry="4" fill="#f1f5f9" />
                <circle cx="108" cy="222" r="3" fill="#e2e8f0" />
              </g>
            )}

            {/* Left Ear */}
            <g
              id="left-ear"
              className={tomAction === "purring" || tomAction === "dancing" ? "animate-pulse" : ""}
              onClick={handlePetTom}
            >
              <path d="M35 70 L20 20 L70 45 Z" fill="#94a3b8" stroke="#475569" strokeWidth="4" />
              <path d="M38 60 L28 32 L60 48 Z" fill="#f472b6" />
            </g>

            {/* Right Ear */}
            <g
              id="right-ear"
              className={tomAction === "purring" || tomAction === "dancing" ? "animate-pulse" : ""}
              onClick={handlePetTom}
            >
              <path d="M165 70 L180 20 L130 45 Z" fill="#94a3b8" stroke="#475569" strokeWidth="4" />
              <path d="M162 60 L172 32 L140 48 Z" fill="#f472b6" />
            </g>

            {/* Head (Clickable to Pet) */}
            <ellipse
              cx="100"
              cy="85"
              rx="65"
              ry="55"
              fill="#94a3b8"
              stroke="#475569"
              strokeWidth="4"
              onClick={handlePetTom}
              className="cursor-pointer"
            />

            {/* Whiskers */}
            <line x1="20" y1="85" x2="60" y2="90" stroke="#334155" strokeWidth="2.5" />
            <line x1="20" y1="100" x2="60" y2="98" stroke="#334155" strokeWidth="2.5" />
            <line x1="140" y1="90" x2="180" y2="85" stroke="#334155" strokeWidth="2.5" />
            <line x1="140" y1="98" x2="180" y2="100" stroke="#334155" strokeWidth="2.5" />

            {/* Eyes */}
            {tomAction === "purring" || tomAction === "laughing" ? (
              // Happy squinting eyes
              <>
                <path d="M62 76 Q75 62 88 76" stroke="#1e293b" strokeWidth="4.5" fill="none" strokeLinecap="round" />
                <path d="M112 76 Q125 62 138 76" stroke="#1e293b" strokeWidth="4.5" fill="none" strokeLinecap="round" />
                {/* Blushing cheeks */}
                <ellipse cx="55" cy="92" rx="8" ry="5" fill="#f472b6" opacity="0.6" />
                <ellipse cx="145" cy="92" rx="8" ry="5" fill="#f472b6" opacity="0.6" />
              </>
            ) : tomAction === "poked" ? (
              // Dizzy spiral eyes
              <>
                <circle cx="75" cy="75" r="14" fill="#ffffff" stroke="#334155" strokeWidth="3" />
                <path d="M70 75 Q75 70 80 75 Q75 80 70 75" stroke="#e11d48" strokeWidth="3" fill="none" />
                <circle cx="125" cy="75" r="14" fill="#ffffff" stroke="#334155" strokeWidth="3" />
                <path d="M120 75 Q125 70 130 75 Q125 80 120 75" stroke="#e11d48" strokeWidth="3" fill="none" />
              </>
            ) : (
              // Normal big bright cartoon eyes
              <>
                <ellipse cx="75" cy="75" rx="15" ry="18" fill="#ffffff" stroke="#334155" strokeWidth="3" />
                <circle cx="76" cy="75" r="8" fill="#0284c7" />
                <circle cx="78" cy="73" r="3" fill="#ffffff" />

                <ellipse cx="125" cy="75" rx="15" ry="18" fill="#ffffff" stroke="#334155" strokeWidth="3" />
                <circle cx="124" cy="75" r="8" fill="#0284c7" />
                <circle cx="126" cy="73" r="3" fill="#ffffff" />
              </>
            )}

            {/* Pink Nose */}
            <polygon points="94,95 106,95 100,103" fill="#f472b6" onClick={handlePokeTom} />

            {/* Animated Mouth */}
            {tomAction === "talking" ? (
              mouthOpen ? (
                // Open talking mouth
                <g>
                  <ellipse cx="100" cy="116" rx="14" ry="12" fill="#b91c1c" stroke="#991b1b" strokeWidth="2.5" />
                  <ellipse cx="100" cy="122" rx="9" ry="5" fill="#f472b6" />
                </g>
              ) : (
                // Closed talking mouth
                <ellipse cx="100" cy="113" rx="10" ry="4" fill="#b91c1c" stroke="#991b1b" strokeWidth="2" />
              )
            ) : tomAction === "drinking" ? (
              // Lapping tongue
              <g>
                <circle cx="100" cy="114" r="8" fill="#b91c1c" />
                <ellipse cx="100" cy="120" rx="6" ry="7" fill="#f472b6" />
              </g>
            ) : tomAction === "laughing" ? (
              // Big laughing mouth
              <g>
                <path d="M88 110 Q100 130 112 110 Z" fill="#b91c1c" stroke="#991b1b" strokeWidth="2.5" />
                <ellipse cx="100" cy="122" rx="7" ry="4" fill="#f472b6" />
              </g>
            ) : (
              // Happy gentle smile
              <path d="M88 108 Q100 120 112 108" stroke="#1e293b" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            )}

            {/* Body */}
            <ellipse
              cx="100"
              cy="180"
              rx="55"
              ry="45"
              fill="#94a3b8"
              stroke="#475569"
              strokeWidth="4"
              onClick={handleTickleTom}
              className="cursor-pointer"
            />

            {/* White Tummy patch (Tap to tickle!) */}
            <ellipse
              cx="100"
              cy="180"
              rx="36"
              ry="30"
              fill="#f1f5f9"
              className="hover:fill-pink-100 transition cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleTickleTom();
              }}
            />

            {/* Paws */}
            <ellipse
              cx="52"
              cy="165"
              rx="14"
              ry="22"
              fill="#94a3b8"
              stroke="#475569"
              strokeWidth="3"
              onClick={handlePokeTom}
            />
            <ellipse
              cx="148"
              cy="165"
              rx="14"
              ry="22"
              fill="#94a3b8"
              stroke="#475569"
              strokeWidth="3"
              onClick={handlePokeTom}
            />

            {/* Feet */}
            <ellipse cx="75" cy="225" rx="20" ry="12" fill="#64748b" onClick={handlePokeTom} />
            <ellipse cx="125" cy="225" rx="20" ry="12" fill="#64748b" onClick={handlePokeTom} />
          </svg>
        </div>

        <p className="text-xs text-purple-200 font-bold mt-1">
          👆 Tap Tom&apos;s <strong>Head</strong> to pet, or <strong>Tummy</strong> to tickle!
        </p>
      </div>

      {/* Main Interactive Controls */}
      <div className="w-full max-w-xl mx-auto flex flex-col gap-3 z-10">
        {/* Big Microphone Talk Button */}
        <button
          onClick={startListeningToChild}
          disabled={isListening}
          className={`py-3.5 px-6 rounded-2xl font-black text-base sm:text-lg flex items-center justify-center gap-3 transition shadow-xl cursor-pointer ${
            isListening
              ? "bg-rose-500 animate-pulse text-white ring-4 ring-rose-400"
              : "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-emerald-950/50 hover:scale-102 active:scale-98"
          }`}
        >
          <span className="text-2xl">{isListening ? "🔴" : "🎙️"}</span>
          <span>{isListening ? "Tom is listening... Speak now!" : "Talk to Tom (He will repeat you!)"}</span>
        </button>

        {/* 4 Quick Fun Physical Actions */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={handleFeedMilk}
            className="py-2.5 px-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer hover:scale-105 active:scale-95 shadow"
          >
            <span className="text-2xl">🥛</span>
            <span>Give Milk</span>
          </button>
          <button
            onClick={handleTickleTom}
            className="py-2.5 px-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer hover:scale-105 active:scale-95 shadow"
          >
            <span className="text-2xl">🪶</span>
            <span>Tickle</span>
          </button>
          <button
            onClick={handlePetTom}
            className="py-2.5 px-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer hover:scale-105 active:scale-95 shadow"
          >
            <span className="text-2xl">🐱</span>
            <span>Pet Tom</span>
          </button>
          <button
            onClick={handleTomDance}
            className="py-2.5 px-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer hover:scale-105 active:scale-95 shadow"
          >
            <span className="text-2xl">💃</span>
            <span>Dance</span>
          </button>
        </div>

        {/* Quick Fun Speech Chips (Works 100% even if mic is blocked) */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5">
          <p className="text-[11px] font-bold text-purple-300 uppercase tracking-wider mb-2 text-center">
            Tap a phrase for Tom to say in funny voice:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {[
              "Hello Tom! 🐾",
              "I love learning! 🎓",
              "Tell me a joke! 😂",
              "Sing a song! 🎵",
              "You are so cute! ❤️",
              "Dance party! 💃",
            ].map((phrase) => (
              <button
                key={phrase}
                onClick={() => handleQuickSay(phrase)}
                className="py-1 px-3 bg-white/10 hover:bg-white/25 border border-white/20 rounded-xl text-xs font-semibold transition cursor-pointer text-purple-100 hover:text-white"
              >
                {phrase}
              </button>
            ))}
          </div>

          {/* Type anything for Tom to repeat */}
          <form onSubmit={handleCustomSubmit} className="flex items-center gap-2 mt-2.5">
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Type anything for Tom to say..."
              className="flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl bg-white/10 text-white placeholder-purple-300/60 border border-white/20 focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
            <button
              type="submit"
              disabled={!customText.trim()}
              className="bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-900 font-black text-xs sm:text-sm py-2 px-3.5 rounded-xl transition cursor-pointer shadow whitespace-nowrap"
            >
              Repeat! 🐱
            </button>
          </form>
        </div>

        {/* When 2 minutes expire */}
        {secondsLeft === 0 && (
          <div className="bg-amber-400 text-slate-900 p-4 rounded-2xl text-center font-bold shadow-xl animate-bounce mt-2">
            <p className="text-base font-black">⏰ 2-Minute Game Reward Finished!</p>
            <p className="text-xs font-semibold text-slate-800 mt-0.5">
              Great job! Complete your next task to earn another 2 minutes with Tom!
            </p>
            <button
              onClick={onFinish}
              className="mt-3 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm rounded-xl transition cursor-pointer shadow-md"
            >
              Continue Next Learning Task 🚀
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
