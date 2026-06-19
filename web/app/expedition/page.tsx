"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { BookOpen, CheckCircle2, Globe2, Share2, Trophy } from "lucide-react";
import AuthProvider from "@/components/AuthProvider";
import { getEngine } from "@/lib/games/engines";
import type { GameResult, GameState } from "@/lib/games/game-engine";
import {
	buildExpeditionShareText,
	completeExpedition,
	getExpeditionToday,
	submitExpeditionQuiz,
	type CompleteRequest,
	type QuizQuestion,
	type QuizRequest,
	type TodayResponse,
} from "@/lib/expedition";

type ExpeditionPhase = "teaser" | "challenge" | "result" | "reveal" | "quiz" | "complete";
type QuizPhase = "culture" | "language";

function ExpeditionContent() {
	const { getToken, isLoaded, isSignedIn } = useAuth();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [data, setData] = useState<TodayResponse | null>(null);
	const [phase, setPhase] = useState<ExpeditionPhase>("teaser");
	const [challengeState, setChallengeState] = useState<GameState | null>(null);
	const [challengeResult, setChallengeResult] = useState<GameResult | null>(null);
	const [leaderboardRank, setLeaderboardRank] = useState<number | undefined>();
	const [quizPhase, setQuizPhase] = useState<QuizPhase>("culture");
	const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
	const [deepFacts, setDeepFacts] = useState<string[]>([]);

	useEffect(() => {
		async function load() {
			if (!isLoaded) return;
			if (!isSignedIn) {
				setError("Sign in to start today's expedition.");
				setLoading(false);
				return;
			}
			try {
				const token = await getToken();
				const response = await getExpeditionToday(token);
				setData(response);
				if (response.status.unlocked) {
					setDeepFacts(response.destination.deep_dive_facts ?? []);
					if (response.status.quiz_culture_score > 0 && response.status.quiz_language_score > 0) {
						setPhase("complete");
					} else {
						setQuizPhase(response.status.quiz_culture_score > 0 ? "language" : "culture");
						setPhase("reveal");
					}
				}
			} catch (e: any) {
				setError(e.message || "Failed to load expedition");
			} finally {
				setLoading(false);
			}
		}
		load();
	}, [getToken, isLoaded, isSignedIn]);

	const engine = data ? getEngine(data.destination.challenge_type) : undefined;
	const Renderer = engine?.Renderer;

	const currentQuestions = useMemo<QuizQuestion[]>(() => {
		if (!data) return [];
		return quizPhase === "culture"
			? data.destination.quiz_culture ?? []
			: data.destination.quiz_language ?? [];
	}, [data, quizPhase]);

	const shareText = useMemo(() => {
		if (!data) return "";
		return buildExpeditionShareText({
			countryName: data.destination.country_name,
			flagEmoji: data.destination.flag_emoji,
			dailyFact: data.destination.daily_fact ?? "Today's country joined my atlas.",
			score: data.status.total_score || data.status.expedition_score,
			rank: leaderboardRank,
			streak: data.streak.current_streak,
			discovered: data.atlas.discovered,
			total: data.atlas.total,
			url: typeof window === "undefined" ? "https://nugdeep.suya.surf" : window.location.origin,
		});
	}, [data, leaderboardRank]);

	const refreshToday = async (token: string | null) => {
		const refreshed = await getExpeditionToday(token);
		setData(refreshed);
		setDeepFacts(refreshed.destination.deep_dive_facts ?? []);
		return refreshed;
	};

	const startChallenge = () => {
		if (!data || !engine) {
			setError("Challenge engine not found");
			return;
		}
		setChallengeResult(null);
		setChallengeState(engine.createInitialState(`${data.date}-${data.destination.country_code}`));
		setPhase("challenge");
	};

	const handleChallengeInput = (input: unknown) => {
		if (!data || !engine || !challengeState) return;
		const nextState = engine.processInput(challengeState, input);
		setChallengeState(nextState);
		if (nextState.status === "resolved") {
			setChallengeResult(engine.resolve(nextState, nextState));
			setPhase("result");
		}
	};

	const submitChallenge = async () => {
		if (!data || !challengeResult) return;

		const req: CompleteRequest = {
			country_code: data.destination.country_code,
			challenge_type: data.destination.challenge_type,
			raw_score: challengeResult.myScore,
			duration_ms: 0,
			accuracy: Math.min(Math.max(challengeResult.myScore / 1000, 0), 1),
		};

		try {
			const token = await getToken();
			const response = await completeExpedition(token, req);
			setLeaderboardRank(response.leaderboard_rank);
			if (!response.unlocked) {
				setData({
					...data,
					status: {
						...data.status,
						expedition_score: response.expedition_score,
					},
					streak: response.streak,
				});
				setPhase("teaser");
				return;
			}
			const refreshed = await refreshToday(token);
			setQuizPhase(refreshed.status.quiz_culture_score > 0 ? "language" : "culture");
			setQuizAnswers([]);
			setPhase("reveal");
		} catch (e: any) {
			setError(e.message || "Failed to submit challenge");
		}
	};

	const handleQuizAnswer = async (answer: number) => {
		if (!data) return;
		const answers = [...quizAnswers, answer];
		setQuizAnswers(answers);
		if (answers.length < currentQuestions.length) return;

		const req: QuizRequest = {
			country_code: data.destination.country_code,
			quiz_type: quizPhase,
			answers,
		};

		try {
			const token = await getToken();
			const response = await submitExpeditionQuiz(token, req);
			const nextData = {
				...data,
				status: {
					...data.status,
					quiz_culture_score: quizPhase === "culture" ? response.score : data.status.quiz_culture_score,
					quiz_language_score: quizPhase === "language" ? response.score : data.status.quiz_language_score,
					total_score: response.total_score,
				},
			};
			setData(nextData);
			setDeepFacts(response.deep_dive_facts);
			setQuizAnswers([]);
			if (quizPhase === "culture") {
				setQuizPhase("language");
			} else {
				setPhase("complete");
			}
		} catch (e: any) {
			setError(e.message || "Failed to submit quiz");
		}
	};

	if (loading) {
		return (
			<main className="flex min-h-screen items-center justify-center">
				<p className="text-slate-400">Loading today&apos;s expedition...</p>
			</main>
		);
	}

	if (error || !data) {
		return (
			<main className="flex min-h-screen items-center justify-center px-6">
				<div className="max-w-md text-center">
					<p className="mb-4 text-red-300">{error || "No expedition available"}</p>
					<Link className="lobby-primary-action" href="/lobby">Back to lobby</Link>
				</div>
			</main>
		);
	}

	if (phase === "challenge" && Renderer && challengeState) {
		return (
			<main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
				<Renderer
					state={challengeState}
					isMyTurn
					onInput={handleChallengeInput}
					result={challengeResult ?? undefined}
				/>
			</main>
		);
	}

	if (phase === "result") {
		const unlocked = (challengeResult?.myScore ?? 0) >= data.destination.score_threshold;
		return (
			<main className="flex min-h-screen items-center justify-center px-6 py-12">
				<section className="game-chamber">
					<Trophy className="mx-auto mb-4 h-10 w-10 text-amber-300" aria-hidden="true" />
					<p className="lobby-kicker">Challenge result</p>
					<h1>{unlocked ? "Country signal found" : "Signal slipped away"}</h1>
					<p className="text-slate-300">
						Score {challengeResult?.myScore ?? 0} / 1000. Target {data.destination.score_threshold}.
					</p>
					<button type="button" className="lobby-primary-action" onClick={submitChallenge}>
						{unlocked ? "Reveal country" : "Record attempt"}
					</button>
				</section>
			</main>
		);
	}

	if (phase === "reveal") {
		return (
			<main className="min-h-screen px-6 py-12">
				<section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
					<div className="game-chamber">
						<p className="lobby-kicker">Unlocked today</p>
						<div className="mb-4 text-7xl">{data.destination.flag_emoji}</div>
						<h1>{data.destination.country_name}</h1>
						<p className="text-slate-400">{data.destination.region}</p>
						<p className="mt-6 text-lg leading-8 text-slate-100">
							{data.destination.daily_fact ?? "The daily fact is ready after unlock."}
						</p>
						<div className="mt-6 grid gap-3 sm:grid-cols-3">
							<Stat label="Score" value={data.status.expedition_score} />
							<Stat label="Streak" value={`${data.streak.current_streak} days`} />
							<Stat label="Atlas" value={`${data.atlas.discovered}/${data.atlas.total}`} />
						</div>
					</div>
					<div className="rounded-lg border border-slate-700 bg-slate-900/70 p-6">
						<BookOpen className="mb-4 h-8 w-8 text-sky-300" aria-hidden="true" />
						<h2 className="mb-3 text-2xl font-semibold">Deep dive</h2>
						<p className="mb-6 text-slate-400">
							Two short quizzes turn this unlock into a permanent atlas card.
						</p>
						<button type="button" className="lobby-primary-action" onClick={() => setPhase("quiz")}>
							Start {quizPhase === "culture" ? "culture" : "language"} quiz
						</button>
						<Link className="mt-3 block text-sm text-slate-400 hover:text-white" href="/expedition/atlas">
							Open atlas instead
						</Link>
					</div>
				</section>
			</main>
		);
	}

	if (phase === "quiz") {
		const question = currentQuestions[quizAnswers.length];
		if (!question) {
			return (
				<main className="flex min-h-screen items-center justify-center px-6">
					<section className="game-chamber">
						<p className="lobby-kicker">Quiz unavailable</p>
						<h1>No questions loaded</h1>
						<button type="button" className="lobby-primary-action" onClick={() => setPhase("reveal")}>
							Back to reveal
						</button>
					</section>
				</main>
			);
		}
		return (
			<main className="flex min-h-screen items-center justify-center px-6 py-12">
				<section className="game-chamber">
					<p className="lobby-kicker">{quizPhase === "culture" ? "Culture quiz" : "Language quiz"}</p>
					<h1 className="text-3xl">{question.question}</h1>
					<p className="text-slate-400">
						Question {quizAnswers.length + 1} of {currentQuestions.length}
					</p>
					<div className="mt-6 grid w-full max-w-xl gap-3">
						{question.options.map((option, index) => (
							<button
								key={`${option}-${index}`}
								type="button"
								className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-left text-slate-100 transition hover:border-sky-400 hover:bg-slate-800"
								onClick={() => handleQuizAnswer(index)}
							>
								{option}
							</button>
						))}
					</div>
				</section>
			</main>
		);
	}

	if (phase === "complete") {
		return (
			<main className="min-h-screen px-6 py-12">
				<section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
					<div className="game-chamber">
						<CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-emerald-300" aria-hidden="true" />
						<p className="lobby-kicker">Expedition complete</p>
						<h1>{data.destination.country_name} is in your atlas</h1>
						<p className="text-slate-400">Total score: {data.status.total_score}</p>
						<div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
							<Link className="lobby-primary-action" href="/expedition/atlas">Open atlas</Link>
							<Link className="rounded-lg border border-slate-700 px-5 py-3 text-center text-slate-200 hover:border-slate-400" href="/lobby">
								Back to lobby
							</Link>
						</div>
					</div>
					<div className="rounded-lg border border-slate-700 bg-slate-900/70 p-6">
						<Share2 className="mb-4 h-8 w-8 text-sky-300" aria-hidden="true" />
						<h2 className="mb-3 text-2xl font-semibold">Share discovery</h2>
						<textarea
							readOnly
							value={shareText}
							className="h-44 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 p-4 text-sm text-slate-200"
						/>
						{deepFacts.length > 0 && (
							<div className="mt-5">
								<h3 className="mb-2 font-semibold">Atlas notes</h3>
								<ul className="space-y-2 text-sm text-slate-400">
									{deepFacts.slice(0, 4).map((fact) => (
										<li key={fact}>{fact}</li>
									))}
								</ul>
							</div>
						)}
					</div>
				</section>
			</main>
		);
	}

	return (
		<main className="min-h-screen px-6 py-12">
			<section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
				<div className="game-chamber">
					<Globe2 className="mx-auto mb-4 h-10 w-10 text-sky-300" aria-hidden="true" />
					<p className="lobby-kicker">Daily expedition</p>
					<h1>Today&apos;s destination is hiding</h1>
					<p className="text-slate-400">
						Prove your skill to reveal a country, a daily fact, and two quick quiz cards.
					</p>
					<div className="mt-6 rounded-lg border border-slate-700 bg-slate-900/70 p-5 text-left">
						<p className="text-sm uppercase tracking-wide text-slate-500">Known signal</p>
						<p className="mt-2 text-2xl font-semibold">{data.destination.region}</p>
						<p className="mt-1 text-sm text-slate-400">Target score: {data.destination.score_threshold}</p>
					</div>
					<button type="button" className="lobby-primary-action mt-6" onClick={startChallenge}>
						Start challenge
					</button>
				</div>
				<div className="rounded-lg border border-slate-700 bg-slate-900/70 p-6">
					<h2 className="mb-4 text-2xl font-semibold">Your run</h2>
					<div className="grid gap-3">
						<Stat label="Current streak" value={`${data.streak.current_streak} days`} />
						<Stat label="Best streak" value={`${data.streak.longest_streak} days`} />
						<Stat label="Atlas" value={`${data.atlas.discovered}/${data.atlas.total}`} />
					</div>
					<Link className="mt-6 block text-sm text-slate-400 hover:text-white" href="/expedition/atlas">
						View atlas
					</Link>
				</div>
			</section>
		</main>
	);
}

function Stat({ label, value }: { label: string; value: string | number }) {
	return (
		<div className="rounded-lg border border-slate-700 bg-slate-950/50 p-4">
			<p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
			<p className="mt-1 text-xl font-semibold text-white">{value}</p>
		</div>
	);
}

export default function ExpeditionPage() {
	return (
		<AuthProvider>
			<ExpeditionContent />
		</AuthProvider>
	);
}
