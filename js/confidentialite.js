/* ==========================================================
   confidentialite.js : complète la page « Comment ça marche et confidentialité » avec les réglages RÉELS du site
   (js/config.js) : la vérification complémentaire est-elle activée ? Quels seuils ? Ainsi la page dit toujours vrai.
   Rien n'est envoyé : on lit seulement la configuration.
   ========================================================== */

(function () {
  "use strict";
  const cfg = (window.CONFIG_SITE && window.CONFIG_SITE.reputation) || {};
  const anglais = document.documentElement.lang === "en";

  // Même contrôle que js/reputation.js : seulement une adresse https://....workers.dev (ou localhost pour les essais)
  function valide(valeur) {
    if (typeof valeur !== "string" || !valeur.trim()) return false;
    try {
      const u = new URL(valeur.trim());
      if (u.username || u.password || u.search || u.hash || (u.pathname !== "/" && u.pathname !== "")) return false;
      return (u.protocol === "https:" && /^[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$/i.test(u.hostname)) ||
             (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1"));
    } catch (e) { return false; }
  }

  const statut = document.getElementById("statut-reputation");
  if (statut) {
    const active = valide(cfg.urlWorker);
    statut.textContent = anglais
      ? (active ? "Status of this check on this site: ON." : "Status of this check on this site: OFF. Nothing is sent.")
      : (active ? "État de cette vérification sur ce site : ACTIVÉE." : "État de cette vérification sur ce site : DÉSACTIVÉE. Rien n'est envoyé.");
  }

  const seuilRouge = Number.isInteger(cfg.seuilRouge) && cfg.seuilRouge >= 1 ? cfg.seuilRouge : 2;
  let seuilAlerte = Number.isInteger(cfg.seuilAlerte) && cfg.seuilAlerte >= 1 ? cfg.seuilAlerte : 1;
  if (seuilAlerte > seuilRouge) seuilAlerte = seuilRouge;
  const a = document.getElementById("seuil-alerte"), r = document.getElementById("seuil-rouge");
  if (a) a.textContent = String(seuilAlerte);
  if (r) r.textContent = String(seuilRouge);
})();
