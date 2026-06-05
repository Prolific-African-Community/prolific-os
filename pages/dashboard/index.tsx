import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

interface EntityListItem {
  id: string;
  name: string;
  legalName?: string | null;
  type: string;
  country: string;
  baseCurrency: string;
  accountingStandard: string;
  isActive: boolean;
  createdAt: string;
  organizationName?: string | null;
  projectsCount: number;
  transactionsCount: number;
  draftJournalEntriesCount: number;
  postedJournalEntriesCount: number;
  counterpartiesCount: number;
  documentsCount: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

interface OrganizationOption {
  id: string;
  name: string;
}

interface EntityForm {
  organizationId: string;
  name: string;
  legalName: string;
  type: string;
  country: string;
  baseCurrency: string;
  accountingStandard: string;
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
const INPUT =
  "w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black outline-none transition placeholder:text-black/30 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";
const ENTITY_TYPES = [
  "COMPANY",
  "FUND",
  "SPV",
  "HOLDING",
  "FAMILY_OFFICE",
  "PORTFOLIO",
  "OTHER",
];
const ACCOUNTING_STANDARDS = [
  "LUX_GAAP",
  "IFRS",
  "FRENCH_GAAP",
  "OHADA",
  "OTHER",
];

const initialEntityForm = (): EntityForm => ({
  organizationId: "",
  name: "",
  legalName: "",
  type: "COMPANY",
  country: "LU",
  baseCurrency: "EUR",
  accountingStandard: "LUX_GAAP",
});

function LogoMark() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-6 w-7 items-center gap-[3px]">
        <span className="h-6 w-3 rounded-[2px] bg-black" />
        <span className="h-6 w-3 rounded-[2px] bg-black" />
      </div>
      <span className="text-sm font-bold tracking-tight text-black">
        Proliquid
      </span>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className={cn(CARD, "p-5")}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/45">
          {label}
        </p>
        <span
          className={cn(
            "h-2.5 w-2.5 rounded-full",
            accent ? "bg-blue-500" : "bg-black/10"
          )}
        />
      </div>
      <p className="mt-4 text-3xl font-bold tracking-[-0.04em]">{value}</p>
    </div>
  );
}

export default function WorkspaceDashboard() {
  const router = useRouter();
  const [entities, setEntities] = useState<EntityListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [canCreateEntities, setCanCreateEntities] = useState(false);
  const [showCreateEntity, setShowCreateEntity] = useState(false);
  const [creatingEntity, setCreatingEntity] = useState(false);
  const [organizationOptions, setOrganizationOptions] = useState<OrganizationOption[]>([]);
  const [entityForm, setEntityForm] = useState<EntityForm>(initialEntityForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

    if (!response.ok || !payload.success) {
      throw new Error(payload.message || "Unable to complete request");
    }

    return payload.data as T;
  };

  const loadEntities = async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    }

    setError(null);

    try {
      const data = await request<EntityListItem[]>("/api/entities");
      setEntities(data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load entities"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!router.isReady) return;
    loadEntities();
  }, [router.isReady]);

  useEffect(() => {
    if (!router.isReady) return;

    const role = localStorage.getItem("role");

    if (role === "ADMIN") {
      setCanManageUsers(true);
      setCanCreateEntities(true);
      return;
    }

    const probeUserManagement = async () => {
      try {
        await request("/api/organization/users");
        setCanManageUsers(true);
        setCanCreateEntities(true);
      } catch {
        setCanManageUsers(false);
        setCanCreateEntities(false);
      }
    };

    probeUserManagement();
  }, [router.isReady]);

  useEffect(() => {
    if (!router.isReady) return;

    const role = localStorage.getItem("role");

    if (role !== "ADMIN") {
      setOrganizationOptions([]);
      return;
    }

    const loadOrganizations = async () => {
      try {
        const data = await request<{ id: string; name: string }[]>(
          "/api/admin/organizations"
        );
        setOrganizationOptions(
          data.map((organization) => ({
            id: organization.id,
            name: organization.name,
          }))
        );
      } catch {
        setOrganizationOptions([]);
      }
    };

    loadOrganizations();
  }, [router.isReady]);

  const kpis = useMemo(
    () => ({
      totalEntities: entities.length,
      activeEntities: entities.filter((entity) => entity.isActive).length,
      draftEntries: entities.reduce(
        (sum, entity) => sum + entity.draftJournalEntriesCount,
        0
      ),
      postedEntries: entities.reduce(
        (sum, entity) => sum + entity.postedJournalEntriesCount,
        0
      ),
      documents: entities.reduce((sum, entity) => sum + entity.documentsCount, 0),
    }),
    [entities]
  );

  const handleSyncLegacyFunds = async () => {
    setSyncing(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await request<{
        migratedCount: number;
        skippedCount: number;
      }>("/api/entities/ensure-from-legacy-funds", {
        method: "POST",
      });

      setSuccess(
        `Legacy sync completed. Migrated ${data.migratedCount} fund${
          data.migratedCount === 1 ? "" : "s"
        }, skipped ${data.skippedCount}.`
      );
      await loadEntities(true);
    } catch (syncError) {
      setError(
        syncError instanceof Error
          ? syncError.message
          : "Unable to sync legacy funds"
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.replace("/login");
  };

  const handleCreateEntity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreatingEntity(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = await request<{
        entity: {
          id: string;
        };
      }>("/api/entities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId: entityForm.organizationId || undefined,
          name: entityForm.name,
          legalName: entityForm.legalName || undefined,
          type: entityForm.type,
          country: entityForm.country,
          baseCurrency: entityForm.baseCurrency,
          accountingStandard: entityForm.accountingStandard,
        }),
      });

      await loadEntities(true);
      setEntityForm(initialEntityForm);
      setShowCreateEntity(false);
      setSuccess("Entity created successfully.");
      await router.push(`/dashboard/entity/${payload.entity.id}`);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create entity"
      );
    } finally {
      setCreatingEntity(false);
    }
  };

  return (
    <div className={cn(PAGE_BG, "min-h-screen text-black")}>
      <header className="border-b border-black/5 bg-[#ececf1]/90 backdrop-blur-md">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5">
          <LogoMark />
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full border border-black px-4 py-2 text-xs font-bold text-black transition hover:bg-black hover:text-white"
          >
            Logout
          </button>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-6 pb-16 pt-8">
        <section className={cn(CARD, "p-6")}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-500">
                Workspace
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em]">
                Entities
              </h1>
              <p className="mt-2 text-sm font-medium text-black/50">
                Entities, accounting, projects and reporting.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {canCreateEntities && (
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateEntity((current) => !current);
                    setError(null);
                    setSuccess(null);
                  }}
                  className={BUTTON_BLUE}
                >
                  + Create entity
                </button>
              )}
              {canManageUsers && (
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/users")}
                  className="rounded-full border border-black/10 px-4 py-2.5 text-xs font-semibold text-black transition hover:border-black hover:bg-black hover:text-white"
                >
                  Users
                </button>
              )}
              <button
                type="button"
                onClick={() => loadEntities(true)}
                disabled={refreshing}
                className={BUTTON_DARK}
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
              <button
                type="button"
                onClick={handleSyncLegacyFunds}
                disabled={syncing}
                className={BUTTON_BLUE}
              >
                {syncing ? "Syncing..." : "Sync legacy funds"}
              </button>
            </div>
          </div>
        </section>

        {canCreateEntities && showCreateEntity && (
          <section className={cn(CARD, "mt-4 p-6")}>
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-500">
                New entity
              </p>
              <h2 className="text-xl font-semibold tracking-[-0.04em]">
                Create entity
              </h2>
              <p className="text-sm font-medium text-black/50">
                Create a new operational workspace for accounting, projects and
                reporting.
              </p>
            </div>

            <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleCreateEntity}>
              {organizationOptions.length > 0 && (
                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
                    Organization
                  </span>
                  <select
                    value={entityForm.organizationId}
                    onChange={(event) =>
                      setEntityForm((current) => ({
                        ...current,
                        organizationId: event.target.value,
                      }))
                    }
                    className={INPUT}
                  >
                    <option value="">Use linked organization</option>
                    {organizationOptions.map((organization) => (
                      <option key={organization.id} value={organization.id}>
                        {organization.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
                  Entity name
                </span>
                <input
                  value={entityForm.name}
                  onChange={(event) =>
                    setEntityForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className={INPUT}
                  placeholder="Proliquid Operating Entity"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
                  Legal name
                </span>
                <input
                  value={entityForm.legalName}
                  onChange={(event) =>
                    setEntityForm((current) => ({
                      ...current,
                      legalName: event.target.value,
                    }))
                  }
                  className={INPUT}
                  placeholder="Optional"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
                  Type
                </span>
                <select
                  value={entityForm.type}
                  onChange={(event) =>
                    setEntityForm((current) => ({
                      ...current,
                      type: event.target.value,
                    }))
                  }
                  className={INPUT}
                >
                  {ENTITY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
                  Country
                </span>
                <input
                  value={entityForm.country}
                  onChange={(event) =>
                    setEntityForm((current) => ({
                      ...current,
                      country: event.target.value.toUpperCase(),
                    }))
                  }
                  className={INPUT}
                  maxLength={2}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
                  Base currency
                </span>
                <input
                  value={entityForm.baseCurrency}
                  onChange={(event) =>
                    setEntityForm((current) => ({
                      ...current,
                      baseCurrency: event.target.value.toUpperCase(),
                    }))
                  }
                  className={INPUT}
                  maxLength={3}
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
                  Accounting standard
                </span>
                <select
                  value={entityForm.accountingStandard}
                  onChange={(event) =>
                    setEntityForm((current) => ({
                      ...current,
                      accountingStandard: event.target.value,
                    }))
                  }
                  className={INPUT}
                >
                  {ACCOUNTING_STANDARDS.map((standard) => (
                    <option key={standard} value={standard}>
                      {standard}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-wrap gap-3 md:col-span-2">
                <button type="submit" disabled={creatingEntity} className={BUTTON_BLUE}>
                  {creatingEntity ? "Creating..." : "Create entity"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateEntity(false);
                    setEntityForm(initialEntityForm);
                  }}
                  className="rounded-full border border-black/10 px-4 py-2.5 text-xs font-semibold text-black transition hover:border-black hover:bg-black hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {(error || success) && (
          <section className="mt-4 space-y-3">
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
                {success}
              </div>
            )}
          </section>
        )}

        <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard label="Total entities" value={kpis.totalEntities} accent />
          <KpiCard label="Active entities" value={kpis.activeEntities} />
          <KpiCard label="Draft entries" value={kpis.draftEntries} />
          <KpiCard label="Posted entries" value={kpis.postedEntries} />
          <KpiCard label="Documents" value={kpis.documents} />
        </section>

        <section className={cn(CARD, "mt-4 overflow-hidden")}>
          <div className="border-b border-black/5 px-6 py-5">
            <h2 className="text-lg font-semibold tracking-[-0.03em]">
              Entity workspace index
            </h2>
          </div>

          {loading ? (
            <div className="px-6 py-12">
              <div className="animate-pulse space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-12 rounded-2xl bg-black/5" />
                ))}
              </div>
            </div>
          ) : !entities.length ? (
            <div className="px-6 py-14 text-center">
              <p className="text-base font-semibold">No entities available yet.</p>
              <p className="mt-2 text-sm font-medium text-black/50">
                Use legacy fund sync to bootstrap entities from existing fund
                records if needed.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                {canCreateEntities && (
                  <button
                    type="button"
                    onClick={() => setShowCreateEntity(true)}
                    className={BUTTON_BLUE}
                  >
                    Create first entity
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSyncLegacyFunds}
                  disabled={syncing}
                  className={BUTTON_DARK}
                >
                  {syncing ? "Syncing..." : "Sync legacy funds"}
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#f7f7f9] text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40">
                  <tr>
                    <th className="px-6 py-4">Entity</th>
                    <th className="px-4 py-4">Type</th>
                    <th className="px-4 py-4">Currency</th>
                    <th className="px-4 py-4">Accounting</th>
                    <th className="px-4 py-4 text-center">Projects</th>
                    <th className="px-4 py-4">Created</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {entities.map((entity) => (
                    <tr className="transition hover:bg-black/[0.02]" key={entity.id}>
                      <td className="px-6 py-5">
                        <div>
                          <p className="font-semibold">{entity.name}</p>
                          <p className="mt-1 text-xs font-medium text-black/45">
                            {entity.organizationName || entity.legalName || entity.country}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-5">
                        <span className="rounded-full bg-[#f4f4f7] px-3 py-2 text-[10px] font-semibold tracking-[0.12em] text-black/55">
                          {entity.type}
                        </span>
                      </td>
                      <td className="px-4 py-5 font-medium text-black/75">
                        {entity.baseCurrency}
                      </td>
                      <td className="px-4 py-5 font-medium text-black/60">
                        {entity.accountingStandard}
                      </td>
                      <td className="px-4 py-5 text-center font-semibold text-black/60">
                        {entity.projectsCount}
                      </td>
                      <td className="px-4 py-5 font-medium text-black/60">
                        {formatDate(entity.createdAt)}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              router.push(`/dashboard/entity/${entity.id}`)
                            }
                            className="rounded-full border border-black/10 px-3 py-2 text-[10px] font-semibold transition hover:border-black hover:bg-black hover:text-white"
                          >
                            Open
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/dashboard/entity/${entity.id}?tab=accounting`
                              )
                            }
                            className="rounded-full bg-black px-3 py-2 text-[10px] font-semibold text-white transition hover:bg-slate-800"
                          >
                            Accounting
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
