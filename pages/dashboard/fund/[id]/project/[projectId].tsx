import { useRouter } from "next/router";
import { useEffect, useState } from "react";

type Tab = "infos" | "heures" | "documents" | "reporting";

interface Project {
  id: string;
  name: string;
  address?: string;
  budget?: string;
  createdAt: string;
}

export default function ProjectDetail() {
  const router = useRouter();
  const { id, projectId } = router.query;

  const [activeTab, setActiveTab] = useState<Tab>("infos");
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `/api/gp/fund/${id}/project/${projectId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      setProject(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "infos":
        return (
          <div className="grid grid-cols-2 gap-6">
            <Field label="Nom du projet" value={project?.name || "-"} />
            <Field label="Adresse" value={project?.address || "-"} />
            <Field label="Budget" value={project?.budget || "-"} />
            <Field
              label="Date de création"
              value={
                project
                  ? new Date(project.createdAt).toLocaleDateString()
                  : "-"
              }
            />
          </div>
        );

      case "heures":
        return (
          <div className="text-zinc-600">
            Tableau des heures ici.
          </div>
        );

      case "documents":
        return (
          <div className="text-zinc-600">
            Gestion des documents ici.
          </div>
        );

      case "reporting":
        return (
          <div className="text-zinc-600">
            Reporting financier ici.
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-zinc-200 p-10">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-200 px-12 py-10">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <button
            onClick={() => router.push(`/dashboard/fund/${id}`)}
            className="text-sm text-zinc-500 hover:text-black mb-2"
          >
            ← Retour au fonds
          </button>

          <h1 className="text-3xl font-semibold">
            {project?.name}
          </h1>
        </div>

        <button
          onClick={() => {
            localStorage.removeItem("token");
            router.push("/login");
          }}
          className="bg-black text-white px-6 py-3 rounded-xl"
        >
          Logout
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 mb-8">
        <TabButton
          label="Infos"
          active={activeTab === "infos"}
          onClick={() => setActiveTab("infos")}
        />
        <TabButton
          label="Heures"
          active={activeTab === "heures"}
          onClick={() => setActiveTab("heures")}
        />
        <TabButton
          label="Documents"
          active={activeTab === "documents"}
          onClick={() => setActiveTab("documents")}
        />
        <TabButton
          label="Reporting"
          active={activeTab === "reporting"}
          onClick={() => setActiveTab("reporting")}
        />
      </div>

      {/* Card */}
      <div className="bg-white rounded-3xl shadow-lg p-10 max-w-7xl">
        {renderContent()}
      </div>
    </div>
  );
}

/* ---------- UI Components ---------- */

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-2 rounded-xl text-sm font-medium transition ${
        active
          ? "bg-black text-white"
          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
      }`}
    >
      {label}
    </button>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-zinc-500">{label}</span>
      <div className="bg-zinc-100 rounded-xl px-5 py-4">
        {value}
      </div>
    </div>
  );
}