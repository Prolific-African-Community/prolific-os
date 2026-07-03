import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "admin@prolific.local";
const ADMIN_PASSWORD = "Admin123!";

const slug = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

interface TemplateSeed {
  id?: string;
  name: string;
  type: string;
  description: string;
  structure: string;
  generationRules: string;
}

const RULES_COMMON =
  "Write a complete, standardized professional deliverable — not a chat answer. Use the project knowledge, resources and instructions as primary source material. Preserve all supplied numbers, names, prices, surfaces and capacities exactly. Never invent unsupported facts: mark unknowns as [à compléter] and reasoned assumptions as 'Hypothèse à confirmer'. Develop every major section with real analysis, implications, dependencies and decisions to make — no shallow bullet-only sections. Use compact, valid Markdown tables for tabular data and detail complex items in subsections. Clean Markdown only: one H1, ## sections, ### subsections.";

const TEMPLATES: TemplateSeed[] = [
  {
    name: "Cahier des charges professionnel",
    type: "Cahier des charges",
    description:
      "Cahier des charges standardisé (version de travail) à valider avec les parties prenantes.",
    structure:
      "# Cahier des charges — [Nom du projet]\nBloc métadonnées (Projet, Type de document, Statut: Version de travail, Version v0.1, Date, Auteur: Prolific OS, Périmètre) puis une note de cadrage en citation.\nSections: 1. Résumé exécutif; 2. Contexte et origine du projet; 3. Objectifs du cahier des charges; 4. Périmètre du projet; 5. Hors périmètre; 6. Parties prenantes (tableau: rôle, responsabilité, implication); 7. Description de l'actif, du site, du produit ou du service; 8. Hypothèses connues; 9. Besoins fonctionnels; 10. Besoins opérationnels; 11. Besoins techniques; 12. Besoins digitaux; 13. Exigences de sécurité, d'accès, d'assurance et de contrôle; 14. Contraintes réglementaires et points de conformité à vérifier; 15. Organisation des flux et processus cibles; 16. Phasage de déploiement; 17. Livrables attendus; 18. Critères d'acceptation; 19. Risques, dépendances et arbitrages; 20. Informations manquantes / à compléter; 21. Prochaines étapes; 22. Annexes.",
    generationRules:
      RULES_COMMON +
      " Rédige en français professionnel et formel. Chaque section: paragraphes explicatifs + implications opérationnelles + arbitrages requis. Utilise des tableaux compacts pour les offres/tarifs/phasage puis détaille chaque ligne en sous-section ###. Cible 3 500–5 000 mots si le contexte le permet, minimum 2 500.",
  },
  {
    name: "Business plan professionnel",
    type: "Business Plan",
    description:
      "Business plan structuré et crédible, aligné sur le contexte du projet.",
    structure:
      "Sections: Résumé exécutif; Présentation du projet; Analyse du marché et de la demande; Offre et proposition de valeur; Modèle économique et tarification; Plan opérationnel; Plan commercial (go-to-market); Organisation et équipe; Feuille de route et jalons; Hypothèses financières (tableau des chiffres connus); Risques et mesures d'atténuation; Besoins de financement et emploi des fonds; Hypothèses à confirmer; Questions ouvertes; Prochaines étapes.",
    generationRules:
      RULES_COMMON +
      " N'invente aucun chiffre financier: n'utilise que les montants fournis, marque le reste [à compléter]. Distingue clairement faits et hypothèses.",
  },
  {
    name: "Spécification technique",
    type: "Technical Specification",
    description:
      "Spécification technique détaillée avec exigences fonctionnelles et non fonctionnelles.",
    structure:
      "Sections: Objectif et portée; Périmètre et hors-périmètre; Définitions et références; Exigences fonctionnelles (numérotées FR-x); Exigences non fonctionnelles (performance, disponibilité, scalabilité — NFR-x); Architecture et composants; Modèle de données / interfaces; Intégrations et dépendances; Sécurité et contrôle d'accès; Contraintes et hypothèses; Critères d'acceptation et approche de test; Risques et questions ouvertes; Déploiement / phasage; Annexes.",
    generationRules:
      RULES_COMMON +
      " Les exigences doivent être spécifiques et testables. Numérote-les. Sépare fonctionnel et non-fonctionnel.",
  },
  {
    name: "Proposition commerciale",
    type: "Proposal",
    description:
      "Proposition commerciale persuasive mais factuelle, centrée sur le besoin client.",
    structure:
      "Sections: Résumé exécutif; Compréhension du contexte et des besoins; Approche et solution proposée; Périmètre et livrables; Méthodologie et phasage; Calendrier; Équipe et rôles; Tarification et conditions commerciales (chiffres fournis uniquement); Hypothèses; Différenciateurs (preuves, sans remplissage marketing); Risques et dépendances; Prochaines étapes.",
    generationRules:
      RULES_COMMON +
      " Ton professionnel et convaincant, jamais du remplissage marketing. Aucune affirmation non étayée.",
  },
  {
    name: "Rapport stratégique",
    type: "Report",
    description:
      "Rapport stratégique orienté décision, avec recommandation claire.",
    structure:
      "Sections: Résumé exécutif; Contexte et cadrage; Analyse de la situation (données fournies uniquement); Constats clés; Options stratégiques et arbitrages; Recommandation; Feuille de route de mise en œuvre; Risques et dépendances; Indicateurs de succès (KPI); Hypothèses et questions ouvertes; Prochaines étapes.",
    generationRules:
      RULES_COMMON +
      " Mène avec l'insight et une recommandation claire, étayée par les données disponibles.",
  },
  {
    name: "Manuel opérationnel (SOP)",
    type: "SOP",
    description: "Procédure opérationnelle standard, claire et actionnable.",
    structure:
      "Sections: Objet et portée; Rôles et responsabilités; Prérequis et matériel; Procédures pas à pas (étapes numérotées, une action par étape); Sécurité, accès et conformité; Contrôles qualité et points de contrôle; Exceptions et escalade; Enregistrements et traçabilité; Revue et révision.",
    generationRules:
      RULES_COMMON + " Instructions non ambiguës et opérationnelles. Une action par étape.",
  },
  {
    name: "Project brief",
    type: "Project Brief",
    description:
      "Brief de projet concis mais complet pour aligner les parties prenantes.",
    structure:
      "Sections: Vue d'ensemble; Contexte et problème; Objectifs et critères de succès; Périmètre et hors-périmètre; Parties prenantes; Livrables; Calendrier / phasage; Hypothèses budgétaires (chiffres fournis uniquement); Risques et dépendances; Hypothèses et questions ouvertes; Prochaines étapes.",
    generationRules: RULES_COMMON,
  },
  {
    name: "Product requirements (PRD)",
    type: "PRD",
    description: "Document d'exigences produit orienté utilisateur et mesurable.",
    structure:
      "Sections: Résumé; Problème; Objectifs et non-objectifs; Utilisateurs cibles et personas; User stories / cas d'usage; Exigences fonctionnelles; Exigences non fonctionnelles; UX et parcours; Dépendances et intégrations; Métriques et critères de succès; Risques et questions ouvertes; Jalons et phasage.",
    generationRules: RULES_COMMON,
  },
  {
    name: "Contrat / accord (projet)",
    type: "Contract",
    description:
      "Projet d'accord structuré, clairement marqué comme document de travail à faire relire par un juriste.",
    structure:
      "Sections: Parties; Préambule; Définitions; Objet et périmètre; Obligations de chaque partie; Durée et résiliation; Conditions financières; Responsabilité et garanties; Confidentialité; Droit applicable; Signatures.",
    generationRules:
      RULES_COMMON +
      " Insère [à compléter] pour toute partie, date ou montant non fournis. Ajoute une note visible indiquant qu'une relecture juridique est requise.",
  },
];

async function main() {
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
      role: UserRole.ADMIN,
      name: "Prolific Admin",
    },
    create: {
      email: ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
      role: UserRole.ADMIN,
      name: "Prolific Admin",
    },
  });

  for (const template of TEMPLATES) {
    const id = template.id ?? slug(template.name);
    const data = {
      name: template.name,
      type: template.type,
      description: template.description,
      structure: template.structure,
      generationRules: template.generationRules,
    };

    await prisma.template.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
