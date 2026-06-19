"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Calendar, CheckCircle2, Filter, Globe, Lock, Search, Shield, Trophy } from "lucide-react";
import AuthProvider from "@/components/AuthProvider";
import {
	getAtlasStats,
	getExpeditionAtlas,
	getQuizProgressLabel,
	getRegionProgress,
	type AtlasResponse,
} from "@/lib/expedition";

type SortMode = "recent" | "score" | "name" | "locked";

function AtlasContent() {
	const { getToken, isLoaded, isSignedIn } = useAuth();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [data, setData] = useState<AtlasResponse | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedRegion, setSelectedRegion] = useState("all");
	const [sortBy, setSortBy] = useState<SortMode>("recent");

	useEffect(() => {
		async function load() {
			if (!isLoaded) return;
			if (!isSignedIn) {
				setError("Sign in to open your atlas.");
				setLoading(false);
				return;
			}
			try {
				const token = await getToken();
				setData(await getExpeditionAtlas(token));
			} catch (e: any) {
				setError(e.message || "Failed to load atlas");
			} finally {
				setLoading(false);
			}
		}
		load();
	}, [getToken, isLoaded, isSignedIn]);

	const stats = useMemo(() => (data ? getAtlasStats(data) : null), [data]);
	const regionProgress = useMemo(() => (data ? getRegionProgress(data) : []), [data]);
	const cards = useMemo(() => {
		if (!data) return [];
		const unlocked = data.unlocked.map((entry) => ({
			...entry,
			unlocked: true,
			sortDate: new Date(entry.discovered_date).getTime(),
		}));
		const locked = data.locked.map((entry) => ({
			country_code: entry.country_code,
			country_name: entry.country_name ?? entry.country_code,
			region: entry.region,
			flag_emoji: entry.flag_emoji ?? "?",
			discovered_date: "",
			expedition_score: 0,
			quiz_culture_score: 0,
			quiz_language_score: 0,
			total_score: 0,
			streak_shield_earned: false,
			unlocked: false,
			sortDate: 0,
		}));
		return [...unlocked, ...locked];
	}, [data]);

	const filteredCards = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		const filtered = cards.filter((entry) => {
			const matchesQuery =
				!query ||
				entry.country_name.toLowerCase().includes(query) ||
				entry.country_code.toLowerCase().includes(query) ||
				entry.region.toLowerCase().includes(query);
			const matchesRegion = selectedRegion === "all" || entry.region === selectedRegion;
			return matchesQuery && matchesRegion;
		});

		return [...filtered].sort((a, b) => {
			if (sortBy === "locked") return Number(a.unlocked) - Number(b.unlocked) || a.country_name.localeCompare(b.country_name);
			if (sortBy === "score") return b.total_score - a.total_score || a.country_name.localeCompare(b.country_name);
			if (sortBy === "name") return a.country_name.localeCompare(b.country_name);
			return b.sortDate - a.sortDate || a.country_name.localeCompare(b.country_name);
		});
	}, [cards, searchQuery, selectedRegion, sortBy]);

	if (loading) {
		return (
			<main className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<Globe className="mx-auto mb-4 h-12 w-12 animate-pulse text-slate-400" />
					<p className="text-slate-400">Loading your atlas...</p>
				</div>
			</main>
		);
	}

	if (error || !data || !stats) {
		return (
			<main className="flex min-h-screen items-center justify-center px-6">
				<div className="text-center">
					<p className="mb-4 text-red-300">{error || "No atlas data available"}</p>
					<button type="button" className="lobby-primary-action" onClick={() => window.location.reload()}>
						Retry
					</button>
				</div>
			</main>
		);
	}

	return (
		<main className="min-h-screen bg-slate-950 px-6 py-12">
			<div className="mx-auto max-w-7xl">
				<header className="mb-8 grid gap-6 lg:grid-cols-[1fr_360px]">
					<div>
						<p className="lobby-kicker">Expedition atlas</p>
						<h1 className="text-5xl font-bold text-white">Your country collection</h1>
						<p className="mt-3 max-w-2xl text-slate-400">
							Unlocked countries keep their facts, quiz scores, and streak shield progress. Locked countries show the route still waiting.
						</p>
					</div>
					<div className="rounded-lg border border-slate-700 bg-slate-900/70 p-5">
						<div className="mb-3 flex items-center justify-between">
							<span className="text-sm uppercase tracking-wide text-slate-500">Overall progress</span>
							<span className="font-semibold text-sky-300">{stats.completionPercentage}%</span>
						</div>
						<div className="h-2 overflow-hidden rounded-full bg-slate-800">
							<div className="h-full rounded-full bg-sky-400" style={{ width: `${stats.completionPercentage}%` }} />
						</div>
						<p className="mt-3 text-sm text-slate-400">
							{stats.discovered} of {stats.total} countries discovered
						</p>
					</div>
				</header>

				<section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
					<Metric icon={Globe} label="Countries" value={`${stats.discovered}/${stats.total}`} />
					<Metric icon={Trophy} label="Total score" value={stats.totalScore.toLocaleString()} />
					<Metric icon={Shield} label="Shields" value={stats.shieldsEarned} />
					<Metric icon={Calendar} label="Regions started" value={regionProgress.filter((item) => item.discovered > 0).length} />
				</section>

				<section className="mb-8 rounded-lg border border-slate-800 bg-slate-900/50 p-5">
					<div className="mb-4 flex items-center gap-2 text-sm uppercase tracking-wide text-slate-500">
						<Filter className="h-4 w-4" />
						Region progress
					</div>
					<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
						{regionProgress.map((item) => (
							<button
								key={item.region}
								type="button"
								onClick={() => setSelectedRegion(item.region)}
								className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-left transition hover:border-sky-500"
							>
								<div className="flex items-center justify-between gap-3">
									<strong>{item.region}</strong>
									<span className="text-sm text-slate-400">{item.discovered}/{item.total}</span>
								</div>
								<div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
									<div className="h-full rounded-full bg-emerald-400" style={{ width: `${item.completionPercentage}%` }} />
								</div>
							</button>
						))}
					</div>
				</section>

				<section className="mb-8 flex flex-col gap-3 md:flex-row">
					<label className="relative flex-1">
						<Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
						<input
							type="search"
							placeholder="Search countries or regions"
							value={searchQuery}
							onChange={(event) => setSearchQuery(event.target.value)}
							className="w-full rounded-lg border border-slate-700 bg-slate-900 py-3 pl-10 pr-4 text-white outline-none transition focus:border-sky-500"
						/>
					</label>
					<select
						value={selectedRegion}
						onChange={(event) => setSelectedRegion(event.target.value)}
						className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-sky-500"
					>
						<option value="all">All regions</option>
						{regionProgress.map((item) => (
							<option key={item.region} value={item.region}>{item.region}</option>
						))}
					</select>
					<select
						value={sortBy}
						onChange={(event) => setSortBy(event.target.value as SortMode)}
						className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-sky-500"
					>
						<option value="recent">Recent first</option>
						<option value="score">Top score</option>
						<option value="name">Name</option>
						<option value="locked">Locked first</option>
					</select>
				</section>

				{filteredCards.length === 0 ? (
					<div className="rounded-lg border border-slate-800 bg-slate-900/60 py-16 text-center">
						<Globe className="mx-auto mb-4 h-14 w-14 text-slate-600" />
						<p className="text-lg text-slate-300">No countries match that search.</p>
						<button
							type="button"
							className="mt-5 rounded-lg border border-slate-700 px-5 py-3 text-slate-200 hover:border-slate-400"
							onClick={() => {
								setSearchQuery("");
								setSelectedRegion("all");
							}}
						>
							Clear filters
						</button>
					</div>
				) : (
					<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{filteredCards.map((entry) => (
							<Link
								key={entry.country_code}
								href={`/expedition/atlas/${entry.country_code}`}
								className={`rounded-lg border p-5 transition ${
									entry.unlocked
										? "border-slate-700 bg-slate-900/80 hover:border-sky-500"
										: "border-slate-800 bg-slate-900/40 opacity-80 hover:border-slate-600"
								}`}
							>
								<div className="mb-4 flex items-start justify-between">
									<span className={entry.unlocked ? "text-5xl" : "text-4xl grayscale"}>{entry.flag_emoji}</span>
									{entry.unlocked ? (
										entry.streak_shield_earned ? <Shield className="h-5 w-5 text-amber-300" /> : <CheckMark />
									) : (
										<Lock className="h-5 w-5 text-slate-500" />
									)}
								</div>
								<h2 className="text-xl font-semibold text-white">{entry.country_name}</h2>
								<p className="mt-1 text-sm text-slate-400">{entry.region}</p>
								{entry.unlocked ? (
									<div className="mt-5 space-y-2 text-sm">
										<div className="flex justify-between border-b border-slate-800 pb-2">
											<span className="text-slate-500">Total</span>
											<strong className="text-emerald-300">{entry.total_score}</strong>
										</div>
										<p className="text-slate-400">
											{getQuizProgressLabel(entry.quiz_culture_score, entry.quiz_language_score)}
										</p>
										<p className="text-xs text-slate-500">
											Discovered {new Date(entry.discovered_date).toLocaleDateString()}
										</p>
									</div>
								) : (
									<p className="mt-5 text-sm text-slate-500">
										Locked. Complete its daily expedition when this route opens.
									</p>
								)}
							</Link>
						))}
					</div>
				)}

				<div className="mt-10 flex justify-center">
					<Link className="lobby-primary-action" href="/expedition">Today&apos;s expedition</Link>
				</div>
			</div>
		</main>
	);
}

function Metric({
	icon: Icon,
	label,
	value,
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	value: string | number;
}) {
	return (
		<div className="rounded-lg border border-slate-800 bg-slate-900/70 p-5">
			<Icon className="mb-3 h-5 w-5 text-sky-300" />
			<p className="text-sm text-slate-500">{label}</p>
			<p className="mt-1 text-2xl font-semibold text-white">{value}</p>
		</div>
	);
}

function CheckMark() {
	return (
		<CheckCircle2 className="h-5 w-5 text-emerald-300" />
	);
}

export default function AtlasPage() {
	return (
		<AuthProvider>
			<AtlasContent />
		</AuthProvider>
	);
}
