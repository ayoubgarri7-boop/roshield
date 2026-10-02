/* ==========================================================
   commun.js : construit le menu du haut et le pied de page
   sur TOUTES les pages (ils ne sont écrits qu'ici, une seule fois).

   Chaque page HTML contient simplement :
     <div id="entete"></div>   <- le menu arrive ici
     <main> ... </main>
     <div id="pied"></div>     <- le pied de page arrive ici
   ========================================================== */

(function () {
  "use strict"; // mode strict : JavaScript signale plus d'erreurs de code

  const cfg = window.CONFIG_SITE;
  const t = cfg.textes;

  // --- Petite fonction pour créer un élément HTML proprement ---
  // On utilise createElement + textContent (et non innerHTML) : le texte
  // est traité comme du TEXTE, jamais comme du code. C'est la bonne habitude.
  function creer(balise, classe, texte) {
    const el = document.createElement(balise);
    if (classe) el.className = classe;
    if (texte) el.textContent = texte;
    return el;
  }

  // --- Icônes (SVG écrits par nous, jamais envoyés par l'utilisateur) ---
  // Ici innerHTML est sans danger, car le contenu est écrit par nous.
  const ICONE_BOUCLIER =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" ' +
    'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 3l8 3v6c0 4.5-3.2 8.3-8 9-4.8-.7-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>';

  // Le nom de la page en cours, ex: "guides.html" ("index.html" si on est à la racine)
  const pageActuelle = location.pathname.split("/").pop() || "index.html";

  // --- 1. Titre de l'onglet : "Titre de la page – NomDuSite" ---
  // On lit le <title> écrit dans la page et on y ajoute le nom du site.
  document.title = document.title
    ? document.title + " – " + cfg.nom
    : cfg.nom;

  // --- 2. Le menu du haut ---
  function construireEntete() {
    const conteneur = document.getElementById("entete");
    if (!conteneur) return;

    const header = creer("header", "entete");
    const barre = creer("div", "entete__barre conteneur");

    // Logo : carré vert + nom + badge
    const logo = creer("a", "logo");
    logo.href = "index.html";
    logo.setAttribute("aria-label", cfg.nom + " - accueil");
    logo.appendChild(creer("span", "logo__carre", cfg.lettreLogo));
    logo.appendChild(creer("span", "logo__nom", cfg.nom));
    if (cfg.badge) logo.appendChild(creer("span", "badge-mini", cfg.badge));
    barre.appendChild(logo);

    // Liens de navigation
    const nav = creer("nav", "nav");
    nav.id = "nav-principale";
    cfg.menu.forEach(function (item) {
      const a = creer("a", "nav__lien", item.texte);
      a.href = item.fichier;
      if (item.fichier === pageActuelle) {
        a.classList.add("actif");
        a.setAttribute("aria-current", "page");
      }
      nav.appendChild(a);
    });
    barre.appendChild(nav);

    // Bouton vert à droite
    const bouton = creer("a", "bouton bouton--principal bouton--petit entete__cta");
    bouton.href = "verificateur.html";
    bouton.innerHTML = ICONE_BOUCLIER; // icône (notre SVG)
    bouton.appendChild(document.createTextNode(t.boutonMenu));
    barre.appendChild(bouton);

    // Bouton "burger" (téléphone uniquement)
    const burger = creer("button", "burger");
    burger.type = "button";
    burger.setAttribute("aria-label", t.ouvrirMenu);
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-controls", "nav-principale");
    burger.appendChild(creer("span"));
    burger.appendChild(creer("span"));
    burger.appendChild(creer("span"));
    burger.addEventListener("click", function () {
      const ouvert = header.classList.toggle("menu-ouvert");
      burger.setAttribute("aria-expanded", String(ouvert));
    });
    barre.appendChild(burger);

    header.appendChild(barre);
    conteneur.appendChild(header);
  }

  // --- 3. Le pied de page ---
  function construirePied() {
    const conteneur = document.getElementById("pied");
    if (!conteneur) return;

    const footer = creer("footer", "pied");
    const contenu = creer("div", "pied__contenu conteneur");

    // Colonne gauche : nom + phrase
    const gauche = creer("div", "pied__gauche");
    gauche.appendChild(creer("strong", "pied__nom", cfg.nom));
    gauche.appendChild(creer("p", "pied__phrase", t.pied));
    contenu.appendChild(gauche);

    // Emplacement du futur bouton de don
    const don = creer("a", "bouton bouton--secondaire bouton--petit");
    if (cfg.lienDon) {
      don.href = cfg.lienDon;
      don.target = "_blank";
      // noopener : la page ouverte ne peut pas contrôler la nôtre
      don.rel = "noopener noreferrer";
      don.textContent = t.don;
    } else {
      don.classList.add("desactive");
      don.setAttribute("aria-disabled", "true");
      don.textContent = t.donBientot;
    }
    contenu.appendChild(don);

    footer.appendChild(contenu);

    // Mention légale
    const bas = creer("div", "pied__bas conteneur");
    bas.appendChild(creer("p", "", t.pasAffilie));
    footer.appendChild(bas);

    conteneur.appendChild(footer);
  }

  construireEntete();
  construirePied();

  // --- 4. Remplace tous les <span data-nom></span> par le nom du site ---
  document.querySelectorAll("[data-nom]").forEach(function (el) {
    el.textContent = cfg.nom;
  });
})();
