/* ==========================================================
   securite.js : la checklist cochable.

   Les cases cochées restent seulement EN MÉMOIRE de la page
   (dans le navigateur) : si on recharge la page, tout est décoché.
   Rien n'est envoyé nulle part et rien n'est enregistré.
   (Pour garder les cases d'une visite à l'autre, il faudrait
   utiliser localStorage : une idée pour une version future.)
   ========================================================== */

(function () {
  "use strict";

  const cases = document.querySelectorAll(".check__entree");
  const texte = document.getElementById("progres-texte");
  const barre = document.getElementById("progres-barre");
  const rempli = document.getElementById("progres-rempli");
  const fin = document.getElementById("progres-fin");
  const boutonReset = document.getElementById("bouton-reset");

  if (!cases.length) return;

  // Les textes viennent de la config de la langue (config-en.js pour l'anglais).
  // Sans config (page française), on garde exactement les textes français d'origine.
  const textesConfig = (window.CONFIG_SITE && window.CONFIG_SITE.textes) || {};
  const formaterProgression = textesConfig.progression || function (faits, total) {
    return faits + " sur " + total + " faits";
  };
  if (textesConfig.progressionFin) fin.textContent = textesConfig.progressionFin;

  // Recompte les cases cochées et met à jour l'affichage
  function majProgression() {
    const total = cases.length;
    let faits = 0;
    cases.forEach(function (c) { if (c.checked) faits++; });

    texte.textContent = formaterProgression(faits, total);
    barre.setAttribute("aria-valuenow", String(faits));
    rempli.style.width = (faits / total) * 100 + "%";
    fin.hidden = faits !== total;
  }

  cases.forEach(function (c) { c.addEventListener("change", majProgression); });

  boutonReset.addEventListener("click", function () {
    cases.forEach(function (c) { c.checked = false; });
    majProgression();
  });

  majProgression();
})();
