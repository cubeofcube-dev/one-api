import type { TFunction } from "i18next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TooltipProps } from "recharts";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

import { getDisplayInCurrency, getQuotaPerUnit } from "../services/chartConfig";

interface BaseMetricRow {
	day: string;
	request_count: number;
	quota: number;
	prompt_tokens: number;
	completion_tokens: number;
}

interface ModelRow extends BaseMetricRow {
	model_name: string;
}

interface UserRow extends BaseMetricRow {
	username: string;
	user_id: number;
}

interface TokenRow extends BaseMetricRow {
	token_name: string;
	username: string;
	user_id: number;
}

interface UseDashboardDataArgs {
	fromDate: string;
	toDate: string;
	dashUser: string;
	isAdmin: boolean;
	validateDateRange: (from: string, to: string) => string;
	setDateError: (value: string) => void;
	t: TFunction;
}

export const useDashboardData = ({
	fromDate,
	toDate,
	dashUser,
	isAdmin,
	validateDateRange,
	setDateError,
	t,
}: UseDashboardDataArgs) => {
	const [rows, setRows] = useState<ModelRow[]>([]);
	const [userRows, setUserRows] = useState<UserRow[]>([]);
	const [tokenRows, setTokenRows] = useState<TokenRow[]>([]);
	const [loading, setLoading] = useState(false);
	const [lastUpdated, setLastUpdated] = useState<number | null>(null);
	const [statisticsMetric, setStatisticsMetric] = useState<
		"tokens" | "requests" | "expenses"
	>("tokens");
	const abortControllerRef = useRef<AbortController | null>(null);

	const loadStats = useCallback(
		async (rangeOverride?: { from: string; to: string }) => {
			const targetFrom = rangeOverride?.from ?? fromDate;
			const targetTo = rangeOverride?.to ?? toDate;
			const validationError = validateDateRange(targetFrom, targetTo);
			if (validationError) {
				setDateError(validationError);
				return;
			}

			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}

			const abortController = new AbortController();
			abortControllerRef.current = abortController;

			setLoading(true);
			setDateError("");

			try {
				const params = new URLSearchParams();
				params.set("from_date", targetFrom);
				params.set("to_date", targetTo);
				if (isAdmin) {
					params.set("user_id", dashUser || "all");
				}

				const res = await api.get(`/api/user/dashboard?${params.toString()}`, {
					signal: abortController.signal,
				});

				if (abortController.signal.aborted) {
					return;
				}

				const { success, data, message } = res.data;
				if (!success) {
					setDateError(message || t("dashboard.errors.fetch_failed"));
					setRows([]);
					setUserRows([]);
					setTokenRows([]);
					return;
				}

				const logs = data?.logs || data || [];
				const userLogs = data?.user_logs || [];
				const tokenLogs = data?.token_logs || [];

				setRows(
					logs.map((row: any) => ({
						day: row.Day,
						model_name: row.ModelName,
						request_count: row.RequestCount,
						quota: row.Quota,
						prompt_tokens: row.PromptTokens,
						completion_tokens: row.CompletionTokens,
					})),
				);

				setUserRows(
					userLogs.map((row: any) => ({
						day: row.Day,
						username: row.Username,
						user_id: Number(row.UserId ?? 0),
						request_count: row.RequestCount,
						quota: row.Quota,
						prompt_tokens: row.PromptTokens,
						completion_tokens: row.CompletionTokens,
					})),
				);

				setTokenRows(
					tokenLogs.map((row: any) => ({
						day: row.Day,
						username: row.Username,
						token_name: row.TokenName,
						user_id: Number(row.UserId ?? 0),
						request_count: row.RequestCount,
						quota: row.Quota,
						prompt_tokens: row.PromptTokens,
						completion_tokens: row.CompletionTokens,
					})),
				);

				setLastUpdated(Math.floor(Date.now() / 1000));
			} catch (error: any) {
				if (error.name === "AbortError" || error.name === "CanceledError") {
					return;
				}
				console.error("Failed to fetch dashboard data:", error);
				setDateError(t("dashboard.errors.fetch_failed"));
				setRows([]);
				setUserRows([]);
				setTokenRows([]);
			} finally {
				if (!abortController.signal.aborted) {
					setLoading(false);
				}
			}
		},
		[dashUser, fromDate, isAdmin, toDate, t, validateDateRange, setDateError],
	);

	useEffect(() => {
		loadStats();
	}, [loadStats]);

	const dailyAgg = useMemo(() => {
		const map: Record<
			string,
			{ date: string; requests: number; quota: number; tokens: number }
		> = {};
		for (const r of rows) {
			if (!map[r.day]) {
				map[r.day] = { date: r.day, requests: 0, quota: 0, tokens: 0 };
			}
			map[r.day].requests += r.request_count || 0;
			map[r.day].quota += r.quota || 0;
			map[r.day].tokens += (r.prompt_tokens || 0) + (r.completion_tokens || 0);
		}
		return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
	}, [rows]);

	const xAxisDays = useMemo(() => {
		const values = new Set<string>();
		for (const row of rows) {
			if (row.day) values.add(row.day);
		}
		for (const row of userRows) {
			if (row.day) values.add(row.day);
		}
		for (const row of tokenRows) {
			if (row.day) values.add(row.day);
		}
		return Array.from(values).sort((a, b) => a.localeCompare(b));
	}, [rows, userRows, tokenRows]);

	const timeSeries = useMemo(() => {
		const quotaPerUnit = getQuotaPerUnit();
		const displayInCurrency = getDisplayInCurrency();
		return dailyAgg.map((day) => ({
			date: day.date,
			requests: day.requests,
			quota: displayInCurrency ? day.quota / quotaPerUnit : day.quota,
			tokens: day.tokens,
		}));
	}, [dailyAgg]);

	const computeStackedSeries = useCallback(
		<T extends BaseMetricRow>(
			rowsSource: T[],
			daysList: string[],
			labelFn: (row: T) => string | null,
		) => {
			const quotaPerUnit = getQuotaPerUnit();
			const displayInCurrency = getDisplayInCurrency();
			const dayToValues: Record<string, Record<string, number>> = {};
			for (const day of daysList) {
				dayToValues[day] = {};
			}

			const uniqueKeys: string[] = [];
			const seen = new Set<string>();

			for (const row of rowsSource) {
				const label = labelFn(row);
				if (!label) continue;
				if (!seen.has(label)) {
					uniqueKeys.push(label);
					seen.add(label);
				}

				if (!dayToValues[row.day]) {
					dayToValues[row.day] = {};
				}

				let value: number;
				switch (statisticsMetric) {
					case "requests":
						value = row.request_count || 0;
						break;
					case "expenses":
						value = row.quota || 0;
						if (displayInCurrency) {
							value = value / quotaPerUnit;
						}
						break;
					default:
						value = (row.prompt_tokens || 0) + (row.completion_tokens || 0);
						break;
				}

				dayToValues[row.day][label] =
					(dayToValues[row.day][label] || 0) + value;
			}

			const stackedData = daysList.map((day) => ({
				date: day,
				...(dayToValues[day] || {}),
			}));
			return { uniqueKeys, stackedData };
		},
		[statisticsMetric],
	);

	const { uniqueKeys: modelKeys, stackedData: modelStackedData } = useMemo(
		() =>
			computeStackedSeries(rows, xAxisDays, (row) =>
				row.model_name ? row.model_name : t("dashboard.fallbacks.model"),
			),
		[rows, xAxisDays, t, computeStackedSeries],
	);

	const { uniqueKeys: userKeys, stackedData: userStackedData } = useMemo(
		() =>
			computeStackedSeries(userRows, xAxisDays, (row) =>
				row.username ? row.username : t("dashboard.fallbacks.user"),
			),
		[userRows, xAxisDays, t, computeStackedSeries],
	);

	const { uniqueKeys: tokenKeys, stackedData: tokenStackedData } = useMemo(
		() =>
			computeStackedSeries(tokenRows, xAxisDays, (row) => {
				const token =
					row.token_name && row.token_name.trim().length > 0
						? row.token_name
						: t("dashboard.fallbacks.token");
				const owner =
					row.username && row.username.trim().length > 0
						? row.username
						: t("dashboard.fallbacks.owner");
				return `${token}(${owner})`;
			}),
		[tokenRows, xAxisDays, t, computeStackedSeries],
	);

	const metricLabel = useMemo(() => {
		switch (statisticsMetric) {
			case "requests":
				return t("dashboard.metrics.requests");
			case "expenses":
				return t("dashboard.metrics.expenses");
			default:
				return t("dashboard.metrics.tokens");
		}
	}, [statisticsMetric, t]);

	const formatStackedTick = useCallback(
		(value: number) => {
			switch (statisticsMetric) {
				case "requests":
					return formatNumber(value);
				case "expenses":
					return getDisplayInCurrency()
						? `$${Number(value).toFixed(2)}`
						: formatNumber(value);
				default:
					return formatNumber(value);
			}
		},
		[statisticsMetric],
	);

	const stackedTooltip = useMemo(() => {
		return ({ active, payload, label }: TooltipProps<number, string>) => {
			if (active && payload && payload.length) {
				const filtered = payload
					.filter(
						(entry) =>
							entry?.value &&
							typeof entry.value === "number" &&
							entry.value > 0,
					)
					.sort((a, b) => (b?.value as number) - (a?.value as number));

				if (!filtered.length) {
					return null;
				}

				const formatValue = (value: number) => {
					switch (statisticsMetric) {
						case "requests":
							return formatNumber(value);
						case "expenses":
							return getDisplayInCurrency()
								? `$${value.toFixed(6)}`
								: formatNumber(value);
						default:
							return formatNumber(value);
					}
				};

				const isDark =
					typeof document !== "undefined" &&
					document.documentElement.classList.contains("dark");
				const tooltipBg = isDark ? "rgba(17,24,39,1)" : "rgba(255,255,255,1)";
				const tooltipText = isDark
					? "rgba(255,255,255,0.95)"
					: "rgba(17,24,39,0.9)";

				return (
					<div
						style={{
							backgroundColor: tooltipBg,
							border: "1px solid var(--border)",
							borderRadius: "8px",
							padding: "12px 16px",
							fontSize: "12px",
							color: tooltipText,
							boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
						}}
					>
						<div
							style={{
								fontWeight: "600",
								marginBottom: "8px",
								color: "var(--foreground)",
							}}
						>
							{label}
						</div>
						{filtered.map((entry, index) => (
							<div
								key={`${entry?.name ?? "series"}-${index}`}
								style={{
									marginBottom: "4px",
									display: "flex",
									alignItems: "center",
								}}
							>
								<span
									style={{
										display: "inline-block",
										width: "12px",
										height: "12px",
										backgroundColor: entry?.color,
										borderRadius: "50%",
										marginRight: "8px",
									}}
								></span>
								<span style={{ fontWeight: "600", color: "var(--foreground)" }}>
									{entry?.name}: {formatValue(entry?.value as number)}
								</span>
							</div>
						))}
					</div>
				);
			}

			return null;
		};
	}, [statisticsMetric]);

	const rangeTotals = useMemo(() => {
		let requests = 0;
		let quota = 0;
		let tokens = 0;
		const modelSet = new Set<string>();

		for (const row of rows) {
			requests += row.request_count || 0;
			quota += row.quota || 0;
			tokens += (row.prompt_tokens || 0) + (row.completion_tokens || 0);
			if (row.model_name) {
				modelSet.add(row.model_name);
			}
		}

		const dayCount = dailyAgg.length;
		const avgCostPerRequestRaw = requests ? quota / requests : 0;
		const avgTokensPerRequest = requests ? tokens / requests : 0;
		const avgDailyRequests = dayCount ? requests / dayCount : 0;
		const avgDailyQuotaRaw = dayCount ? quota / dayCount : 0;
		const avgDailyTokens = dayCount ? tokens / dayCount : 0;

		return {
			requests,
			quota,
			tokens,
			avgCostPerRequestRaw,
			avgTokensPerRequest,
			avgDailyRequests,
			avgDailyQuotaRaw,
			avgDailyTokens,
			dayCount,
			uniqueModels: modelSet.size,
		};
	}, [rows, dailyAgg]);

	const byModel = useMemo(() => {
		const mm: Record<
			string,
			{ model: string; requests: number; quota: number; tokens: number }
		> = {};
		for (const r of rows) {
			const key = r.model_name;
			if (!mm[key]) mm[key] = { model: key, requests: 0, quota: 0, tokens: 0 };
			mm[key].requests += r.request_count || 0;
			mm[key].quota += r.quota || 0;
			mm[key].tokens += (r.prompt_tokens || 0) + (r.completion_tokens || 0);
		}
		return Object.values(mm);
	}, [rows]);

	const modelLeaders = useMemo(() => {
		if (!byModel.length) {
			return {
				mostRequested: null,
				mostTokens: null,
				mostQuota: null,
			};
		}

		const mostRequested = [...byModel].sort(
			(a, b) => b.requests - a.requests,
		)[0];
		const mostTokens = [...byModel].sort((a, b) => b.tokens - a.tokens)[0];
		const mostQuota = [...byModel].sort((a, b) => b.quota - a.quota)[0];

		return { mostRequested, mostTokens, mostQuota };
	}, [byModel]);

	const rangeInsights = useMemo(() => {
		if (!dailyAgg.length) {
			return {
				busiestDay: null as {
					date: string;
					requests: number;
					quota: number;
					tokens: number;
				} | null,
				tokenHeavyDay: null as {
					date: string;
					requests: number;
					quota: number;
					tokens: number;
				} | null,
			};
		}

		let busiestDay = dailyAgg[0];
		let tokenHeavyDay = dailyAgg[0];

		for (const day of dailyAgg) {
			if (day.requests > busiestDay.requests) {
				busiestDay = day;
			}
			if (day.tokens > tokenHeavyDay.tokens) {
				tokenHeavyDay = day;
			}
		}

		return { busiestDay, tokenHeavyDay };
	}, [dailyAgg]);

	return {
		rows,
		userRows,
		tokenRows,
		loading,
		lastUpdated,
		statisticsMetric,
		setStatisticsMetric,
		loadStats,
		modelKeys,
		modelStackedData,
		userKeys,
		userStackedData,
		tokenKeys,
		tokenStackedData,
		metricLabel,
		stackedTooltip,
		formatStackedTick,
		timeSeries,
		rangeTotals,
		modelLeaders,
		rangeInsights,
	};
};
