"use client";

export const dynamic = "force-dynamic";

import AuthProvider from "@/components/AuthProvider";
import WordCardGame from "@/components/wordcard/WordCardGame";

function WordCardPageContent() {
  return <WordCardGame />;
}

export default function WordCardPage() {
  return (
    <AuthProvider>
      <WordCardPageContent />
    </AuthProvider>
  );
}
