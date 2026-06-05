import { useEffect, useState } from "react";
import { useRouter } from "next/router";

interface FundRecord {
  id: string;
  name: string;
  currency: string;
  entityId?: string | null;
  projects?: { id: string }[];
}

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

type ClassValue = string | false | null | undefined;

const cn = (...classes: ClassValue[]) => classes.filter(Boolean).join(" ");
const PAGE_BG = "bg-[#ececf1]";
const CARD =
  "rounded-[1.5rem] border border-black/10 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.05)]";
const BUTTON_BLUE =
  "inline-flex items-center justify-center rounded-full bg-blue-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-px hover:bg-blue-600 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50";
const BUTTON_DARK =
  "inline-flex items-center justify-center rounded-full bg-black px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-px hover:bg-slate-800 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50";

export default function LegacyFundPage() {
  const router = useRouter();
  const fundId = typeof router.query.id === "string" ? router.query.id : undefined;
  const [fund, setFund] = useState<FundRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = async <T,>(url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      throw new Error("Your session has expired. Please sign in again.");
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });

    const payload = (await response.json()) as ApiResponse<T>;

    if (response.status === 401) {
      localStorage.removeItem("token");
      router.replace("/login");
    }

    if (!response.ok && !payload.data) {
      throw new Error(payload.message || "Unable to complete request");
    }

    return payload.data as T;
  };

  const fetchFund = async () => {
    if (!fundId) return null;
    const data = await request<any>(`/api/gp/fund/${fundId}`);
    return (data?.fund ?? data) as FundRecord;
  };

  const ensureEntities = async () => {
    setSyncing(true);
    setError(null);

    try {
      await request("/api/entities/ensure-from-legacy-funds", {
        method: "POST",
      });

      const refreshedFund = await fetchFund();
      setFund(refreshedFund);

      if (refreshedFund?.entityId) {
        router.replace(`/dashboard/entity/${refreshedFund.entityId}`);
      }
    } catch (syncError) {
      setError(
        syncError instanceof Error
          ? syncError.message
          : "Unable to sync this legacy fund"
      );
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (!fundId) return;

    const loadFund = async () => {
      try {
        const fundData = await fetchFund();
        setFund(fundData);

        if (fundData?.entityId) {
          router.replace(`/dashboard/entity/${fundData.entityId}`);
          return;
        }

        await ensureEntities();
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load this legacy fund"
        );
      } finally {
        setLoading(false);
      }
    };

    loadFund();
  }, [fundId]);

  if (loading) {
    return (
      <main className={cn(PAGE_BG, "min-h-screen px-6 py-20 text-black")}>
        <div className="mx-auto max-w-3xl">
          <div className={cn(CARD, "animate-pulse p-8")}>
            <div className="h-6 w-32 rounded-full bg-black/5" />
            <div className="mt-5 h-10 w-64 rounded-2xl bg-black/5" />
            <div className="mt-4 h-4 w-80 rounded bg-black/5" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={cn(PAGE_BG, "min-h-screen px-6 py-20 text-black")}>
      <div className="mx-auto max-w-3xl">
        <div className={cn(CARD, "p-8")}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-500">
            Legacy fund route
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
            {fund?.entityId
              ? "Opening entity workspace"
              : fund?.name || "Legacy fund workspace"}
          </h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-black/50">
            Funds are now handled through entity workspaces. This route stays
            alive for compatibility while legacy records are linked forward.
          </p>

          {fund && (
            <div className="mt-6 rounded-[1.25rem] border border-black/5 bg-[#f7f7f9] p-4">
              <p className="text-sm font-semibold">{fund.name}</p>
              <p className="mt-1 text-sm font-medium text-black/60">
                Currency: {fund.currency}
              </p>
              <p className="mt-1 text-sm font-medium text-black/60">
                Linked entity: {fund.entityId || "Not linked yet"}
              </p>
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {fund?.entityId ? (
              <button
                type="button"
                onClick={() => router.replace(`/dashboard/entity/${fund.entityId}`)}
                className={BUTTON_BLUE}
              >
                Open entity workspace
              </button>
            ) : (
              <button
                type="button"
                onClick={ensureEntities}
                disabled={syncing}
                className={BUTTON_BLUE}
              >
                {syncing ? "Syncing..." : "Sync legacy fund"}
              </button>
            )}

            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className={BUTTON_DARK}
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
