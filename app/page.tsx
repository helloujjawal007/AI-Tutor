"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser } from "@/app/lib/supabase-browser";

export default function HomePage() {
  const [childName, setChildName] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });
  }, []);

  const handleStart = async () => {
    setIsStarting(true);
    const { data: profile } = await supabaseBrowser.auth.getUser();

    if (profile.user) {
      alert(`Welcome ${childName}! Lesson starting...`);
      setIsStarting(false);
    } else {
      alert("Please sign in with Supabase");
      setIsStarting(false);
    }
  };

  if (isStarting) {
    return <div className="flex items-center justify-center min-h-screen bg-background"><div className="spinner"></div></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto p-4">
        <div className="card p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">Tables Buddy</h2>
          <p className="text-muted-text mb-6">
            A talking virtual assistant that teaches multiplication tables
          </p>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Child's Name</label>
            <input
              value={childName}
              onChange={(e: any) => setChildName(e.target.value)}
              placeholder="Enter child's name"
              className="input"
              required
            />
          </div>
          <button
            onClick={handleStart}
            disabled={!childName.trim() || isLoggedIn === false}
            className="btn-primary w-full py-4 mt-4 text-2xl font-bold"
          >
            {isLoggedIn === false ? "Sign in first" : "▶ Start"}
          </button>
        </div>
        <div className="mt-8 text-center text-muted-text small">
          <p>Chrome/Edge works best for speech features.</p>
          <p>Use "Type Answer" mode if microphone is blocked.</p>
        </div>
      </div>
    </div>
  );
}