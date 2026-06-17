"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import AuthProvider from "@/components/AuthProvider";

function CreateContent() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [hint, setHint] = useState("");
  const [words, setWords] = useState([
    { word: "", correct_category: "", decoys: "" },
    { word: "", correct_category: "", decoys: "" },
    { word: "", correct_category: "", decoys: "" },
    { word: "", correct_category: "", decoys: "" },
    { word: "", correct_category: "", decoys: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const wordSet = words
      .filter((w) => w.word && w.correct_category)
      .map((w) => ({
        word: w.word,
        correct_category: w.correct_category,
        decoys: w.decoys.split(",").map((s) => s.trim()).filter(Boolean),
      }));

    if (wordSet.length < 3) {
      setError("Add at least 3 words");
      setLoading(false);
      return;
    }

    try {
      const token = await getToken();
      const res = await apiFetch("/api/v1/communities", {
        token,
        method: "POST",
        body: JSON.stringify({
          name,
          description,
          hint,
          hidden: true,
          puzzle: {
            category_ids: ["pop_culture"],
            difficulty: 3,
            timer_seconds: 50,
            word_set: wordSet,
          },
        }),
      });
      router.push(`/join/${res.slug}`);
    } catch (e: any) {
      setError(e.message || "Create failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold mb-6">Create Community</h1>
      {error && <p className="text-red-400 mb-4">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Community name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-slate-800 text-slate-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-rose-600"
          required
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-slate-800 text-slate-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-rose-600"
          rows={3}
        />
        <input
          type="text"
          placeholder="Hint (shown before unlock)"
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-slate-800 text-slate-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-rose-600"
        />

        <div className="space-y-3">
          <p className="text-sm text-slate-400 font-medium">Puzzle words</p>
          {words.map((w, i) => (
            <div key={i} className="grid grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Word"
                value={w.word}
                onChange={(e) => {
                  const next = [...words];
                  next[i].word = e.target.value;
                  setWords(next);
                }}
                className="px-3 py-2 rounded bg-slate-800 text-sm text-slate-100 placeholder-slate-500 outline-none"
              />
              <input
                type="text"
                placeholder="Category"
                value={w.correct_category}
                onChange={(e) => {
                  const next = [...words];
                  next[i].correct_category = e.target.value;
                  setWords(next);
                }}
                className="px-3 py-2 rounded bg-slate-800 text-sm text-slate-100 placeholder-slate-500 outline-none"
              />
              <input
                type="text"
                placeholder="Decoys, comma"
                value={w.decoys}
                onChange={(e) => {
                  const next = [...words];
                  next[i].decoys = e.target.value;
                  setWords(next);
                }}
                className="px-3 py-2 rounded bg-slate-800 text-sm text-slate-100 placeholder-slate-500 outline-none"
              />
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-500 transition disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create + Share"}
        </button>
      </form>
    </main>
  );
}

export default function CreatePage() {
  return (
    <AuthProvider>
      <CreateContent />
    </AuthProvider>
  );
}