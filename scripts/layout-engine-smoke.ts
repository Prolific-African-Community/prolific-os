import assert from "assert";
import { mkdirSync, writeFileSync } from "fs";
import { composeDocument } from "../lib/composition";
import { resolveLayout, serializeLayoutInspection } from "../lib/layout";

const pixel = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

const markdown = `# Prouver ce qui est vrai à l’ère de l’intelligence artificielle

## Fragilité de la confiance numérique ?
Les preuves numériques circulent vite, mais leur origine, leur intégrité et leur contexte deviennent difficiles à vérifier.

## Une urgence mesurable
- 73 % des PME échangent encore des justificatifs non vérifiables.
- 3 systèmes indépendants interviennent dans une transaction moyenne.
- 18 jours sont nécessaires pour résoudre une contestation documentaire.

## Des systèmes actuels fragmentés
1. Création de la preuve par une organisation.
2. Transmission par des canaux hétérogènes.
3. Vérification tardive et manuelle.
4. Décision sans chaîne de confiance continue.

## Quatre garanties de recherche
- Authenticité de la source.
- Intégrité du contenu.
- Traçabilité de la décision.
- Explicabilité de la vérification.

## Cycle de vie de la preuve
1. Émission.
2. Enregistrement.
3. Transmission.
4. Vérification.
5. Contestation.
6. Résolution et apprentissage.

## Cas d’étude — transaction d’une PME sénégalaise
1. Une PME émet un justificatif commercial.
2. La banque vérifie la provenance et le mandat.
3. Le partenaire confirme la livraison.
4. La preuve consolidée déclenche la décision de financement.

## Contributions scientifiques et méthodologie
1. Formaliser un modèle de preuve contextualisée.
2. Construire un protocole de vérification reproductible.
3. Tester le processus avec des cas réels.
4. Mesurer les effets sur la confiance et la décision.

## Feuille de route sur trois ans
1. Année 1 — cadrage théorique et terrain exploratoire.
2. Année 2 — prototype, expérimentation et collecte.
3. Année 3 — validation, généralisation et publications.

## Adéquation du candidat et besoins d’encadrement
Le candidat combine architecture des systèmes, pratique entrepreneuriale et accès au terrain sénégalais.

- Encadrement scientifique sur la confiance numérique.
- Accès à un laboratoire interdisciplinaire.
- Partenariats bancaires et PME pour l’expérimentation.
`;

const composition = composeDocument({
  markdown,
  title: "Prouver ce qui est vrai à l’ère de l’intelligence artificielle",
  language: "fr",
  documentType: "Présentation de projet doctoral",
  coverEnabled: true,
  images: [
    {
      assetId: "doctoral-cover",
      filename: "doctoral-cover.png",
      role: "cover",
      target: "cover",
      sectionTitle: null,
      size: "full_width",
      caption: null,
      buffer: pixel,
      mime: "image/png",
      width: 1920,
      height: 1080,
    },
  ],
});

const layoutA = resolveLayout(composition, { mode: "presentation" });
const layoutB = resolveLayout(composition, { mode: "presentation" });
assert.deepEqual(layoutA, layoutB, "Layout resolution must be deterministic");
assert(layoutA.pages.length >= 9 && layoutA.pages.length <= 11, `Expected approximately 10 slides, got ${layoutA.pages.length}`);
assert.equal(layoutA.pages[0].template, "full-bleed-cover");
assert(layoutA.pages.some((page) => page.template === "big-question"));
assert(layoutA.pages.some((page) => page.template === "three-metrics"));
assert(layoutA.pages.some((page) => page.template === "four-pillars"));
assert(layoutA.pages.some((page) => page.template === "lifecycle"));
assert(layoutA.pages.some((page) => page.template === "case-study-journey"), layoutA.pages.map((page) => page.template).join(", "));
assert(layoutA.pages.some((page) => page.template === "three-year-roadmap"));
assert(layoutA.pages.some((page) => page.template === "candidate-closing"));
assert.equal(layoutA.metrics.unresolvedBlockingIssues, 0, "Golden deck must have no unresolved collisions or bounds failures");

for (const page of layoutA.pages) {
  for (const element of page.regions.flatMap((region) => region.elements)) {
    assert(element.bounds.x >= 0 && element.bounds.y >= 0);
    assert(element.bounds.x + element.bounds.width <= 1.000001);
    assert(element.bounds.y + element.bounds.height <= 1.000001);
  }
}

const documentLayout = resolveLayout(composition, { mode: "paginated-document" });
assert(documentLayout.pages.length > 1);
assert.equal(documentLayout.pages[0].role, "cover");

const denseComposition = composeDocument({
  markdown: `# Dense\n\n## Dense section\n${Array.from({ length: 9 }, (_, index) => `${index + 1}. A substantial supporting point ${index + 1} with enough explanation to require visible space on a slide.`).join("\n")}`,
  title: "Dense",
  language: "en",
  coverEnabled: false,
});
const denseLayout = resolveLayout(denseComposition, { mode: "presentation", policy: { maxVisibleWordsPerSlide: 35 } });
assert(denseLayout.pages.length > 2, "Dense presentation content should split across slides");

const tableComposition = composeDocument({
  markdown: "# Table\n\n## Wide table\n| A | B | C | D | E | F | G |\n|---|---|---|---|---|---|---|\n|1|2|3|4|5|6|7|",
  title: "Table",
  language: "en",
  coverEnabled: false,
});
const tableLayout = resolveLayout(tableComposition, { mode: "paginated-document" });
assert(tableLayout.pages.some((page) => page.orientation === "landscape"));
assert(tableLayout.decisions.some((decision) => decision.action === "landscape"));

mkdirSync("tmp/layout-inspection", { recursive: true });
writeFileSync("tmp/layout-inspection/doctoral-layout.json", serializeLayoutInspection(layoutA));

console.log(JSON.stringify({ slides: layoutA.pages.length, templates: layoutA.pages.map((page) => page.template), warnings: layoutA.warnings, quality: layoutA.metrics.aggregateQuality, inspection: "tmp/layout-inspection/doctoral-layout.json" }, null, 2));
