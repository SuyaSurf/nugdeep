"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { ArrowLeft, BookOpen, Lock, Shield, Trophy } from "lucide-react";
import AuthProvider from "@/components/AuthProvider";
import { getExpeditionCountry, getQuizProgressLabel, type CountryResponse } from "@/lib/expedition";

function CountryContent() {
	const params = useParams<{ countryCode: string }>();
	const { getToken, isLoaded, isSignedIn } = useAuth();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [country, setCountry] = useState<CountryResponse | null>(null);

	useEffect(() => {
		async function load() {
			if (!isLoaded) return;
			if (!isSignedIn) {
				setError("Sign in to open atlas cards.");
				setLoading(false);
				return;
			}
			try {
				const token = await getToken();
				setCountry(await getExpeditionCountry(token, params.countryCode));
			} catch (e: any) {
				setError(e.message || "Failed to load country");
			} finally {
				setLoading(false);
			}
		}
		load();
	}, [getToken, isLoaded, isSignedIn, params.countryCode]);

	if (loading) {
		return (
			<main className="flex min-h-screen items-center justify-center">
				<p className="text-slate-400">Opening atlas card...</p>
			</main>
		);
	}

	if (error || !country) {
		return (
			<main className="flex min-h-screen items-center justify-center px-6">
				<section className="game-chamber">
					<p className="lobby-kicker">Atlas card</p>
					<h1>Card unavailable</h1>
					<p className="text-red-300">{error || "No country data available"}</p>
					<Link className="lobby-primary-action" href="/expedition/atlas">Back to atlas</Link>
				</section>
			</main>
		);
	}

	if (!country.unlocked) {
		return (
			<main className="min-h-screen px-6 py-12">
				<div className="mx-auto max-w-3xl">
					<Link className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white" href="/expedition/atlas">
						<ArrowLeft className="h-4 w-4" />
						Back to atlas
					</Link>
					<section className="game-chamber">
						<Lock className="mx-auto mb-4 h-10 w-10 text-slate-500" />
						<p className="lobby-kicker">Locked country</p>
						<div className="mb-4 text-6xl grayscale">{country.flag_emoji}</div>
						<h1>{country.country_name}</h1>
						<p className="text-slate-400">{country.region}</p>
						<p className="mt-6 text-slate-300">
							This card opens after its daily expedition. Facts and quiz notes stay hidden until then.
						</p>
						<Link className="lobby-primary-action mt-6" href="/expedition">Today&apos;s expedition</Link>
					</section>
				</div>
			</main>
		);
	}

	return (
		<main className="min-h-screen px-6 py-12">
			<div className="mx-auto max-w-5xl">
				<Link className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white" href="/expedition/atlas">
					<ArrowLeft className="h-4 w-4" />
					Back to atlas
				</Link>
				<section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
					<div className="game-chamber">
						<p className="lobby-kicker">Atlas card</p>
						<div className="mb-4 text-7xl">{country.flag_emoji}</div>
						<h1>{country.country_name}</h1>
						<p className="text-slate-400">{country.region}</p>
						<div className="mt-6 grid gap-3">
							<FactMetric icon={Trophy} label="Best score" value={country.total_score ?? 0} />
							<FactMetric
								icon={BookOpen}
								label="Quizzes"
								value={getQuizProgressLabel(country.quiz_culture_score ?? 0, country.quiz_language_score ?? 0)}
							/>
							{country.streak_shield_earned && <FactMetric icon={Shield} label="Reward" value="Streak shield earned" />}
						</div>
					</div>
					<div className="rounded-lg border border-slate-700 bg-slate-900/70 p-6">
						<h2 className="mb-3 text-2xl font-semibold">Daily fact</h2>
						<p className="text-lg leading-8 text-slate-100">{country.daily_fact}</p>
						{country.deep_dive_facts && country.deep_dive_facts.length > 0 && (
							<div className="mt-8">
								<h3 className="mb-3 font-semibold">Deep dive notes</h3>
								<ul className="space-y-3 text-slate-400">
									{country.deep_dive_facts.map((fact) => (
										<li key={fact}>{fact}</li>
									))}
								</ul>
							</div>
						)}
					</div>
				</section>
			</div>
		</main>
	);
}

function FactMetric({
	icon: Icon,
	label,
	value,
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	value: string | number;
}) {
	return (
		<div className="rounded-lg border border-slate-700 bg-slate-950/50 p-4 text-left">
			<Icon className="mb-2 h-5 w-5 text-sky-300" />
			<p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
			<p className="mt-1 font-semibold text-white">{value}</p>
		</div>
	);
}

export default function CountryPage() {
	return (
		<AuthProvider>
			<CountryContent />
		</AuthProvider>
	);
}
