import { AppShell } from "./app-shell";
import { EmptyState } from "./ui";
import { IconName } from "./ui/icons";

export function PlaceholderPage({
  eyebrow,
  title,
  description,
  icon = "layers",
  note,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon?: IconName;
  note?: string;
}) {
  return (
    <AppShell eyebrow={eyebrow} title={title} description={description} icon={icon}>
      <EmptyState
        icon={icon}
        title={`${title} is coming soon`}
        description={
          note ||
          "This area is part of the roadmap. The core Project → Knowledge → Resources → Document → Generate → Export flow is fully available today."
        }
      />
    </AppShell>
  );
}
