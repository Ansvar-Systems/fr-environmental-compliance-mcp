/**
 * France Environmental Compliance MCP -- Data Ingestion Script
 *
 * Sources:
 *   - Code de l'environnement (Livre V Titre Ier: ICPE)
 *   - Nomenclature ICPE (rubriques 2101, 2102, 2111, 2160)
 *   - Directive Nitrates 91/676/CEE -- 7eme programme d'actions national (PAN 7)
 *   - Arrete du 19 decembre 2011 (programmes d'actions nitrates)
 *   - Arrete du 4 mai 2017 (mise en oeuvre PAN)
 *   - Calendrier d'epandage (periodes d'interdiction par type d'effluent)
 *   - BCAE 4 (conditionnalite PAC) -- bandes tampon
 *   - Loi sur l'eau (Code de l'environnement, Livre II)
 *   - IOTA (installations, ouvrages, travaux, activites) -- nomenclature eau
 *   - Arrete du 27 decembre 2013 (prescriptions generales ICPE elevage)
 *   - Reglement CE 1107/2009 -- produits phytopharmaceutiques
 *   - Arrete du 4 mai 2017 (ZNT habitations)
 *   - Code de l'evaluation environnementale (R. 122-2)
 *   - 6 Agences de l'Eau (prescriptions par bassin)
 *   - SDAGE et SAGE (schemas directeurs d'amenagement et de gestion des eaux)
 *
 * Usage: npm run ingest
 */

import { createDatabase } from '../src/db.js';
import { mkdirSync, writeFileSync } from 'fs';

mkdirSync('data', { recursive: true });
const db = createDatabase('data/database.db');

const now = new Date().toISOString().split('T')[0];

// ---------------------------------------------------------------------------
// Clear existing data (idempotent re-runs)
// ---------------------------------------------------------------------------
db.run('DELETE FROM nvz_rules');
db.run('DELETE FROM storage_requirements');
db.run('DELETE FROM buffer_strip_rules');
db.run('DELETE FROM abstraction_rules');
db.run('DELETE FROM pollution_prevention');
db.run('DELETE FROM eia_screening');
db.run('DELETE FROM search_index');

// ---------------------------------------------------------------------------
// 1. NVZ Rules -- Zones vulnerables nitrates, calendrier d'epandage,
//    seuils ICPE, programmes d'actions nitrates (PAN 7)
// ---------------------------------------------------------------------------

const nvzRules: Array<[string, string | null, string | null, string | null, string | null, string | null, string, string, string]> = [
  // =====================================================================
  // 1a. Calendrier d'epandage -- effluents de type I (fumier, compost)
  // =====================================================================
  [
    'Epandage fumier sur grandes cultures (type I)',
    'fumier (type I)',
    null,
    'Nov 15',
    'Jan 15',
    null,
    'Effluents de type I (fumier compact, compost) : interdiction d\'epandage du 15 novembre au 15 janvier sur grandes cultures (cereales, oleagineux, proteagineux). En dehors de cette periode, epandage autorise sous conditions.',
    'Arrete du 19 decembre 2011 art. 2-3 ; PAN 7 ; Directive Nitrates 91/676/CEE',
    'FR',
  ],
  [
    'Epandage fumier sur prairies (type I)',
    'fumier (type I)',
    null,
    'Nov 15',
    'Jan 15',
    null,
    'Effluents de type I (fumier, compost) sur prairies implantees depuis plus de 6 mois : interdiction du 15 novembre au 15 janvier. Epandage autorise le reste de l\'annee dans la limite de 170 kg N/ha/an d\'origine animale.',
    'Arrete du 19 decembre 2011 art. 2-3 ; PAN 7',
    'FR',
  ],
  [
    'Epandage fumier sur cultures derobees (type I)',
    'fumier (type I)',
    null,
    'Nov 15',
    'Jan 15',
    null,
    'Effluents de type I sur cultures derobees (CIPAN) : interdiction du 15 novembre au 15 janvier. L\'epandage avant l\'implantation d\'un CIPAN est autorise si l\'enfouissement est rapide.',
    'Arrete du 19 decembre 2011 art. 2-3 ; PAN 7',
    'FR',
  ],
  [
    'Epandage fumier sur sols nus (type I)',
    'fumier (type I)',
    null,
    'Jul 1',
    'Jan 15',
    null,
    'Effluents de type I (fumier, compost) sur sol nu sans culture en place : interdiction du 1er juillet au 15 janvier. L\'epandage est interdit en l\'absence de culture ou de CIPAN.',
    'Arrete du 19 decembre 2011 art. 2-3 ; PAN 7',
    'FR',
  ],

  // =====================================================================
  // 1b. Calendrier d'epandage -- effluents de type II (lisier, purin, boues)
  // =====================================================================
  [
    'Epandage lisier sur grandes cultures (type II)',
    'lisier (type II)',
    null,
    'Oct 1',
    'Jan 31',
    null,
    'Effluents de type II (lisier, purin, eaux brunes, boues) : interdiction d\'epandage du 1er octobre au 31 janvier sur grandes cultures. Contrainte plus longue que le type I car azote plus rapidement disponible et risque de lixiviation accru.',
    'Arrete du 19 decembre 2011 art. 2-3 ; PAN 7 ; Directive Nitrates 91/676/CEE',
    'FR',
  ],
  [
    'Epandage lisier sur prairies (type II)',
    'lisier (type II)',
    null,
    'Oct 15',
    'Jan 31',
    null,
    'Effluents de type II (lisier, purin) sur prairies implantees depuis plus de 6 mois : interdiction du 15 octobre au 31 janvier. Le couvert herbace limite le risque de ruissellement.',
    'Arrete du 19 decembre 2011 art. 2-3 ; PAN 7',
    'FR',
  ],
  [
    'Epandage lisier sur cultures derobees (type II)',
    'lisier (type II)',
    null,
    'Aug 15',
    'Jan 31',
    null,
    'Effluents de type II sur cultures derobees (CIPAN) : interdiction du 15 aout au 31 janvier. Periode plus stricte que prairies car absorption limitee.',
    'Arrete du 19 decembre 2011 art. 2-3 ; PAN 7',
    'FR',
  ],
  [
    'Epandage lisier sur sols nus (type II)',
    'lisier (type II)',
    null,
    'Jul 1',
    'Jan 31',
    null,
    'Effluents de type II (lisier, purin, boues) sur sol nu sans culture : interdiction du 1er juillet au 31 janvier. Risque majeur de pollution des eaux en l\'absence de couvert vegetal.',
    'Arrete du 19 decembre 2011 art. 2-3 ; PAN 7',
    'FR',
  ],

  // =====================================================================
  // 1c. Calendrier d'epandage -- engrais azotes mineraux
  // =====================================================================
  [
    'Epandage engrais azotes mineraux sur grandes cultures',
    'engrais mineral',
    null,
    'Sep 1',
    'Jan 31',
    null,
    'Engrais azotes mineraux (ammonitrate, uree, solution azotee) : interdiction du 1er septembre au 31 janvier sur grandes cultures d\'automne et de printemps. Exception : premier apport fractionne possible a partir du 1er fevrier.',
    'Arrete du 19 decembre 2011 art. 2 ; PAN 7',
    'FR',
  ],
  [
    'Epandage engrais azotes mineraux sur prairies',
    'engrais mineral',
    null,
    'Nov 1',
    'Jan 31',
    null,
    'Engrais azotes mineraux sur prairies : interdiction du 1er novembre au 31 janvier. L\'absorption par l\'herbe est faible en hiver.',
    'Arrete du 19 decembre 2011 art. 2 ; PAN 7',
    'FR',
  ],

  // =====================================================================
  // 1d. Plafond Directive Nitrates et equilibre de fertilisation
  // =====================================================================
  [
    'Plafond azote d\'origine animale (Directive Nitrates)',
    'effluents d\'elevage',
    null,
    null,
    null,
    '170 kg N/ha/an d\'origine animale',
    'Plafond de 170 kg d\'azote d\'origine animale par hectare de SAU epandable et par an. Ce plafond inclut les dejections au paturage. Pour les exploitations depassant ce plafond, un plan de gestion des effluents (PGE) est obligatoire.',
    'Directive Nitrates 91/676/CEE art. 5 ; Code de l\'environnement R. 211-81',
    'FR',
  ],
  [
    'Equilibre de la fertilisation azotee',
    null,
    null,
    null,
    null,
    null,
    'Obligation d\'equilibre de la fertilisation : la dose d\'azote totale (organique + minerale) ne doit pas exceder les besoins des cultures. Plan previsionnel de fumure (PPF) et cahier d\'enregistrement des pratiques d\'epandage obligatoires en zone vulnerable.',
    'Arrete du 19 decembre 2011 art. 4-5 ; PAN 7',
    'FR',
  ],
  [
    'Plan previsionnel de fumure (PPF)',
    null,
    null,
    null,
    null,
    null,
    'Tout exploitant en zone vulnerable doit etablir un plan previsionnel de fumure avant chaque campagne culturale, mentionnant pour chaque ilot : la culture, la dose previsionnelle, le type d\'effluent, la surface epandable. Le PPF doit etre conserve 5 ans.',
    'Arrete du 19 decembre 2011 art. 4 ; PAN 7',
    'FR',
  ],
  [
    'Cahier d\'enregistrement des pratiques',
    null,
    null,
    null,
    null,
    null,
    'Enregistrement obligatoire de chaque epandage : date, nature et quantite d\'effluent, surface concernee, ilot cultural. Tenue du cahier d\'enregistrement, conservation 5 ans minimum. Consultable par les services de controle (DDT, police de l\'eau).',
    'Arrete du 19 decembre 2011 art. 5 ; PAN 7',
    'FR',
  ],

  // =====================================================================
  // 1e. Conditions d'epandage (interdictions generales)
  // =====================================================================
  [
    'Interdiction d\'epandage sur sol gele ou enneige',
    null,
    null,
    null,
    null,
    null,
    'L\'epandage de tout effluent organique ou mineral est interdit sur sol gele en profondeur (plus de 24h), enneige (couche > 1 cm couvrant uniformement le sol), ou sature en eau. Le risque de ruissellement est trop eleve.',
    'Arrete du 19 decembre 2011 art. 3 ; Code de l\'environnement R. 211-81',
    'FR',
  ],
  [
    'Interdiction d\'epandage sur terrains en forte pente',
    null,
    null,
    null,
    null,
    null,
    'L\'epandage d\'effluents liquides (type II) est interdit sur les parcelles dont la pente est superieure a 7% en direction d\'un cours d\'eau, sauf mise en place de bandes enherbees ou dispositifs anti-ruissellement. Pour les effluents de type I, la pente limite est de 15%.',
    'Arrete du 19 decembre 2011 art. 3 ; PAN 7',
    'FR',
  ],
  [
    'Interdiction d\'epandage a proximite des points d\'eau',
    null,
    null,
    null,
    null,
    null,
    'Distances minimales d\'epandage : 35 m des cours d\'eau, 50 m des points de prelevement AEP (eau potable), 100 m des lieux de baignade et piscicultures. Distances reduites a 10 m le long des cours d\'eau si bande enherbee et enfouissement rapide.',
    'Arrete du 19 decembre 2011 art. 3 ; Arrete du 27 decembre 2013',
    'FR',
  ],

  // =====================================================================
  // 1f. ICPE nomenclature agricole -- seuils
  // =====================================================================
  [
    'ICPE rubrique 2101 -- elevage de bovins',
    null,
    null,
    null,
    null,
    null,
    'Rubrique 2101 (bovins). Declaration (D) : de 50 a 100 vaches laitieres ou 100 a 400 bovins a l\'engraissement. Enregistrement (E) : de 101 a 400 vaches laitieres ou 401 a 800 bovins. Autorisation (A) : > 400 vaches laitieres ou > 800 bovins. Les seuils sont exprimes en nombre d\'animaux-equivalents.',
    'Code de l\'environnement R. 511-9 ; Nomenclature ICPE rubrique 2101',
    'FR',
  ],
  [
    'ICPE rubrique 2102 -- elevage de porcs',
    null,
    null,
    null,
    null,
    null,
    'Rubrique 2102 (porcs). Declaration (D) : de 50 a 450 animaux-equivalents porcs. Enregistrement (E) : de 451 a 2000 animaux-equivalents. Autorisation (A) : > 2000 animaux-equivalents. Le seuil IED (Directive sur les emissions industrielles) est de 2000 places porcs a l\'engrais ou 750 places truies.',
    'Code de l\'environnement R. 511-9 ; Nomenclature ICPE rubrique 2102 ; Directive IED 2010/75/UE',
    'FR',
  ],
  [
    'ICPE rubrique 2111 -- elevage de volailles',
    null,
    null,
    null,
    null,
    null,
    'Rubrique 2111 (volailles, gibier a plumes). Declaration (D) : de 5000 a 20 000 emplacements volailles. Enregistrement (E) : de 20 001 a 40 000 emplacements. Autorisation (A) : > 40 000 emplacements. Le seuil IED est de 40 000 places poulets de chair ou 40 000 places poules pondeuses.',
    'Code de l\'environnement R. 511-9 ; Nomenclature ICPE rubrique 2111 ; Directive IED 2010/75/UE',
    'FR',
  ],
  [
    'ICPE rubrique 2160 -- silos et installations de stockage de cereales',
    null,
    null,
    null,
    null,
    null,
    'Rubrique 2160 (silos de cereales, grains, produits alimentaires). Declaration (D) : volume > 5000 m3. Enregistrement (E) : volume > 15 000 m3. Autorisation avec servitudes (AS) : volume > 15 000 m3 si risque d\'explosion (ATEX). Risques : incendie, explosion de poussieres, fumigation.',
    'Code de l\'environnement R. 511-9 ; Nomenclature ICPE rubrique 2160',
    'FR',
  ],

  // =====================================================================
  // 1g. CIPAN et couverture des sols en zone vulnerable
  // =====================================================================
  [
    'Couverture des sols en interculture (CIPAN)',
    null,
    null,
    null,
    null,
    null,
    'En zone vulnerable, obligation de couvrir les sols pendant l\'interculture longue (entre une culture de cereales et une culture de printemps). La culture intermediaire pieges a nitrates (CIPAN) ou un couvert vegetal doit etre implante avant le 1er octobre et maintenu au minimum 2 mois. Destruction chimique interdite, broyage et incorporation mecaniques uniquement.',
    'Arrete du 19 decembre 2011 art. 6 ; PAN 7',
    'FR',
  ],
  [
    'Gestion des repousses de colza et cereales',
    null,
    null,
    null,
    null,
    null,
    'Les repousses denses de colza ou de cereales peuvent remplacer l\'implantation d\'un CIPAN, a condition qu\'elles soient presentes avant le 1er octobre et maintenues au moins 2 mois. Le prefet peut adapter cette mesure par arrete departemental.',
    'Arrete du 19 decembre 2011 art. 6 ; PAN 7 ; Programmes d\'actions regionaux',
    'FR',
  ],

  // =====================================================================
  // 1h. Zones d'actions renforcees (ZAR)
  // =====================================================================
  [
    'Zones d\'actions renforcees (ZAR)',
    null,
    null,
    null,
    null,
    null,
    'Dans les zones d\'actions renforcees (ZAR), les mesures du PAN 7 sont renforcees : periodes d\'interdiction d\'epandage plus longues, couverture des sols obligatoire y compris en interculture courte, limitation a 170 kg N/ha sur chaque ilot (pas seulement en moyenne), obligation de reliquats azotes post-recolte. Les ZAR sont definies par les prefets dans les programmes d\'actions regionaux.',
    'Arrete du 19 decembre 2011 art. 8 ; Programmes d\'actions regionaux (PAR)',
    'FR',
  ],
];

const insertNvz = db.instance.prepare(
  `INSERT INTO nvz_rules (activity, material_type, soil_type, closed_period_start, closed_period_end, max_application_rate, conditions, regulation_ref, jurisdiction)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

for (const row of nvzRules) {
  insertNvz.run(...row);
}
console.log(`Inserted ${nvzRules.length} NVZ / nitrates rules.`);

// ---------------------------------------------------------------------------
// 2. Storage Requirements -- Capacites de stockage des effluents
// ---------------------------------------------------------------------------

const storageReqs: Array<[string, number | null, string, number | null, string | null, string | null, string]> = [
  [
    'Lisier (fosse a lisier)',
    6,
    'Fosse a lisier etanche (beton ou geomembrane). Capacite de stockage minimale de 6 mois en zone vulnerable hors ZAR. Construction conforme aux normes NF (epreuve d\'etancheite obligatoire). Couverture recommandee (bache, croute naturelle) pour reduction des emissions d\'ammoniac.',
    35,
    'Controle d\'etancheite tous les 5 ans pour les ouvrages neufs. Inspection visuelle mensuelle des parois, joints, canalisations. Niveaumetre obligatoire pour les fosses > 500 m3.',
    'Arrete du 27 decembre 2013 art. 26-30 ; RSD art. 153 ; Code de l\'environnement R. 211-81',
    'FR',
  ],
  [
    'Lisier en zone vulnerable (6 mois)',
    6,
    'Capacite minimale de 6 mois de stockage en zone vulnerable classique. Le calcul tient compte de la production d\'effluents (vaches laitieres : 18 m3/UGB/an, porcs : 5 m3/place/an), des eaux de lavage et des eaux pluviales recueillies.',
    35,
    'Verification annuelle de la capacite au regard du cheptel. Registre des vidanges obligatoire.',
    'Arrete du 19 decembre 2011 art. 7 ; PAN 7',
    'FR',
  ],
  [
    'Lisier en zone d\'actions renforcees (ZAR, 7 mois)',
    7,
    'Capacite de stockage portee a 7 mois dans les zones d\'actions renforcees (ZAR). Adaptation des ouvrages existants dans un delai de 2 ans apres classement en ZAR.',
    35,
    'Idem zone vulnerable. Controle renforce par la DDT.',
    'Arrete du 19 decembre 2011 art. 8 ; Programmes d\'actions regionaux',
    'FR',
  ],
  [
    'Fumier compact (fumiere)',
    4,
    'Fumiere couverte ou non, aire betonnee etanche avec collecte des jus. Capacite de stockage minimale de 4 mois. Le fumier compact pailleux peut etre stocke au champ sous conditions (tas de fumier compact > 2 mois sur la meme parcelle, pas sur sol hydromorphe, a distance des cours d\'eau).',
    35,
    'Nettoyage de la fumiere apres chaque vidange. Collecte et stockage des jus de fumiere dans une fosse etanche. Le stockage au champ est limite a 10 mois.',
    'Arrete du 27 decembre 2013 art. 26-30 ; PAN 7 art. 7',
    'FR',
  ],
  [
    'Fumier au champ (stockage temporaire)',
    null,
    'Le stockage au champ du fumier compact pailleux est autorise sous conditions strictes : fumier ayant subi un minimum de 2 mois de maturation, duree de stockage maximale de 10 mois, interdiction de stocker au meme endroit avant 3 ans, distance minimale de 35 m des cours d\'eau et 50 m des habitations.',
    35,
    'Tenir un registre des dates et lieux de stockage au champ. Pas de stockage en zone inondable ou sur sol hydromorphe.',
    'Arrete du 19 decembre 2011 art. 7 ; PAN 7',
    'FR',
  ],
  [
    'Fientes de volailles',
    4,
    'Stockage des fientes de volailles : batiment couvert ou fumiere couverte avec collecte des lixiviats. Capacite de 4 mois minimum. Les fientes humides (< 55% MS) doivent etre stockees en ouvrage etanche couvert.',
    50,
    'Sechage des fientes recommande pour reduire le volume et les odeurs. Controle des nuisances olfactives.',
    'Arrete du 27 decembre 2013 ; Nomenclature ICPE rubrique 2111',
    'FR',
  ],
  [
    'Stockage carburant (fioul, GNR)',
    null,
    'Cuves de stockage de carburant (fioul domestique, GNR) : cuve double paroi ou cuve simple paroi avec bac de retention de 100% de la capacite. Installation conforme a l\'arrete du 1er juillet 2004. Cuve enterree : detection de fuites obligatoire.',
    null,
    'Controle periodique des cuves : tous les 5 ans (cuves enterrees), annuel (inspection visuelle, jaugeage). Cuves abandonnees : vidange, degazage et neutralisation obligatoires.',
    'Arrete du 1er juillet 2004 ; Code de l\'environnement R. 211-81',
    'FR',
  ],
  [
    'Produits phytopharmaceutiques (stockage)',
    null,
    'Local de stockage des produits phytopharmaceutiques : ferme a cle, aere, avec sol etanche et bac de retention. Separation des semences, engrais et aliments pour animaux. Armoire ou local dedie, signalisation conforme.',
    null,
    'Inventaire annuel des stocks. Elimination des PPNU (produits phytopharmaceutiques non utilises) via les collectes ADIVALOR. Fiche de donnees de securite (FDS) disponible sur site.',
    'Arrete du 12 septembre 2006 ; Code rural L. 253-1 a L. 253-17',
    'FR',
  ],
  [
    'Ensilage (silo couloir)',
    null,
    'Silo couloir avec dalle betonnee etanche et systeme de collecte des jus d\'ensilage. Les jus d\'ensilage (DBO5 : 30 000 a 80 000 mg/l) sont tres polluants : collecte obligatoire dans une fosse etanche. Interdiction de rejet direct dans le milieu naturel.',
    50,
    'Entretien annuel de la dalle. Verification de l\'etancheite des joints. Jus d\'ensilage : utilisation en epandage ou traitement avant rejet.',
    'Arrete du 27 decembre 2013 art. 35 ; RSD',
    'FR',
  ],
  [
    'Eaux blanches et vertes de salle de traite',
    null,
    'Les eaux de lavage de salle de traite (eaux blanches = lait dilue, eaux vertes = lavage quai) sont des effluents d\'elevage a part entiere. Elles doivent etre collectees et stockees dans la fosse a lisier ou traitees par un systeme agere (lagunage, epandage).',
    null,
    'Capacite de stockage : integrer les eaux blanches et vertes dans le calcul de capacite de la fosse (environ 10 a 20 l/VL/jour). Pas de rejet direct dans le milieu naturel.',
    'Arrete du 27 decembre 2013 art. 26 ; Code de l\'environnement R. 211-81',
    'FR',
  ],
];

const insertStorage = db.instance.prepare(
  `INSERT INTO storage_requirements (material, min_capacity_months, construction_standard, separation_distance_m, inspection_frequency, regulation_ref, jurisdiction)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);

for (const row of storageReqs) {
  insertStorage.run(...row);
}
console.log(`Inserted ${storageReqs.length} storage requirements.`);

// ---------------------------------------------------------------------------
// 3. Buffer Strip Rules -- Bandes tampon, ZNT, distances d'epandage
// ---------------------------------------------------------------------------

const bufferStrips: Array<[string, string | null, number | null, string, string | null, string, string]> = [
  [
    'Cours d\'eau (bande tampon BCAE 4)',
    'Epandage et traitement phytopharmaceutique',
    5,
    'Bande tampon enherbee ou boisee de 5 metres minimum le long de tous les cours d\'eau et plans d\'eau repertories sur les cartes IGN au 1/25 000. Conditionnalite PAC (BCAE 4). Pas d\'epandage de fertilisants ni de produits phytopharmaceutiques sur la bande tampon. Entretien par fauche ou paturage extensif autorise.',
    'Eco-regime PAC possible',
    'BCAE 4 ; Arrete du 24 avril 2015 ; Reglement UE 2021/2115',
    'FR',
  ],
  [
    'Cours d\'eau (distance d\'epandage effluents)',
    'Epandage d\'effluents organiques',
    35,
    'Distance minimale de 35 metres entre la zone d\'epandage et la berge des cours d\'eau. Reduction a 10 metres possible si mise en place d\'une bande enherbee et enfouissement des effluents dans les 24 heures (12 heures en zone vulnerable renforcee).',
    null,
    'Arrete du 19 decembre 2011 art. 3 ; Arrete du 27 decembre 2013',
    'FR',
  ],
  [
    'Points de prelevement d\'eau potable (AEP)',
    'Epandage et traitements',
    50,
    'Distance minimale de 50 metres autour des captages d\'eau destinee a la consommation humaine (AEP). Les perimetres de protection rapprochee (PPR) des captages peuvent imposer des distances superieures ou des interdictions totales d\'epandage.',
    null,
    'Code de la sante publique L. 1321-2 ; Arrete du 27 decembre 2013',
    'FR',
  ],
  [
    'Habitations et locaux habites',
    'Epandage d\'effluents d\'elevage',
    50,
    'Distance minimale de 50 metres entre la zone d\'epandage des effluents d\'elevage et les habitations de tiers. Distance portee a 100 metres pour l\'epandage de boues de station d\'epuration. Distances derogables par convention avec les riverains (accord ecrit).',
    null,
    'Arrete du 27 decembre 2013 art. 27 ; RSD art. 153',
    'FR',
  ],
  [
    'ZNT habitations -- produits phytopharmaceutiques (5 m)',
    'Traitement phytopharmaceutique',
    5,
    'Zone de Non-Traitement (ZNT) de 5 metres vis-a-vis des habitations pour les produits phytopharmaceutiques dont la fiche AMM ne mentionne pas de distance specifique. Distance par defaut instauree suite au decret du 27 decembre 2019.',
    null,
    'Decret 2019-1500 du 27 decembre 2019 ; Arrete du 4 mai 2017 modifie',
    'FR',
  ],
  [
    'ZNT habitations -- produits phytopharmaceutiques (10 m)',
    'Traitement phytopharmaceutique',
    10,
    'Zone de Non-Traitement (ZNT) de 10 metres vis-a-vis des habitations pour les produits classes CMR 2 (cancerogenes, mutagenes, reprotoxiques de categorie 2). Liste des produits sur le site de l\'ANSES.',
    null,
    'Decret 2019-1500 ; Arrete du 27 decembre 2019 ; ANSES avis',
    'FR',
  ],
  [
    'ZNT habitations -- produits phytopharmaceutiques (20 m)',
    'Traitement phytopharmaceutique',
    20,
    'Zone de Non-Traitement (ZNT) de 20 metres vis-a-vis des habitations pour les produits classes CMR 1A ou 1B (cancerogenes, mutagenes, reprotoxiques de categorie 1). Distance non reductible, meme avec materiel anti-derive.',
    null,
    'Decret 2019-1500 ; Arrete du 27 decembre 2019 ; Reglement CE 1107/2009',
    'FR',
  ],
  [
    'ZNT cours d\'eau -- produits phytopharmaceutiques',
    'Traitement phytopharmaceutique',
    5,
    'Zone de Non-Traitement (ZNT) de 5 metres minimum le long des cours d\'eau pour les produits phytopharmaceutiques (distance par defaut). Certains produits imposent 20 m, 50 m ou 100 m selon les conditions d\'AMM de l\'ANSES. Reduction possible a 5 m avec materiel anti-derive homologue.',
    null,
    'Arrete du 4 mai 2017 modifie ; AMM ANSES',
    'FR',
  ],
  [
    'Lieux de baignade et piscicultures',
    'Epandage d\'effluents',
    200,
    'Distance minimale de 200 metres des lieux de baignade declares et des piscicultures. Distance calculee depuis la limite de l\'ilot d\'epandage jusqu\'a la limite du site concerne.',
    null,
    'Arrete du 27 decembre 2013 art. 27 ; Code de la sante publique',
    'FR',
  ],
  [
    'Perimetre de protection des captages AEP',
    'Toute activite agricole',
    null,
    'Les perimetres de protection des captages AEP (immediat, rapproche, eloigne) sont definis par arrete prefectoral apres etude hydrogeologique (declaration d\'utilite publique). Dans le perimetre rapproche : interdiction ou restriction d\'epandage, limitation des produits phytopharmaceutiques, prescriptions specifiques selon la vulnerabilite de la ressource.',
    null,
    'Code de la sante publique L. 1321-2 ; Arrete prefectoral de DUP',
    'FR',
  ],
];

const insertBuffer = db.instance.prepare(
  `INSERT INTO buffer_strip_rules (watercourse_type, activity, min_width_m, conditions, scheme_payment, regulation_ref, jurisdiction)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);

for (const row of bufferStrips) {
  insertBuffer.run(...row);
}
console.log(`Inserted ${bufferStrips.length} buffer strip / ZNT rules.`);

// ---------------------------------------------------------------------------
// 4. Abstraction Rules -- Loi sur l'eau, IOTA, Agences de l'Eau
// ---------------------------------------------------------------------------

const abstractionRules: Array<[string, number | null, number, string | null, string, string]> = [
  [
    'Prelevement en eaux superficielles (> 400 m3/h)',
    null,
    1,
    null,
    'Nomenclature IOTA rubrique 1.2.1.0 : prelevement en eaux superficielles superieur a 400 m3/h ou 2% du debit du cours d\'eau -- regime d\'autorisation. Dossier loi sur l\'eau aupres de la DDT. Etude d\'impact sur le debit d\'etiage et les milieux aquatiques obligatoire.',
    'FR',
  ],
  [
    'Prelevement en eaux superficielles (entre 5% et 400 m3/h)',
    null,
    1,
    'Declaration obligatoire',
    'Nomenclature IOTA rubrique 1.2.1.0 : prelevement entre le seuil de declaration (5% du debit) et 400 m3/h -- regime de declaration. Formulaire CERFA a deposer en prefecture.',
    'FR',
  ],
  [
    'Prelevement en eaux souterraines (> 200 000 m3/an)',
    null,
    1,
    null,
    'Nomenclature IOTA rubrique 1.1.2.0 : prelevement en eaux souterraines superieur a 200 000 m3/an -- regime d\'autorisation. Dossier loi sur l\'eau, etude hydrogeologique, suivi piezometrique obligatoire.',
    'FR',
  ],
  [
    'Prelevement en eaux souterraines (entre 10 000 et 200 000 m3/an)',
    null,
    1,
    'Declaration obligatoire',
    'Nomenclature IOTA rubrique 1.1.2.0 : prelevement entre 10 000 et 200 000 m3/an -- regime de declaration. Installation d\'un compteur volumetrique obligatoire.',
    'FR',
  ],
  [
    'Forage (creation de puits ou forage)',
    null,
    1,
    'Declaration obligatoire, meme pour usage domestique',
    'Tout forage ou puits doit etre declare en mairie (Code minier art. L. 411-1). Pour usage agricole : declaration loi sur l\'eau si prelevement > 10 000 m3/an. Le foreur doit etre agree par le prefet.',
    'FR',
  ],
  [
    'Irrigation -- gestion volumetrique (ZRE)',
    null,
    1,
    null,
    'En zone de repartition des eaux (ZRE), le prelevement pour irrigation est soumis a autorisation unique collective (OUGC -- organisme unique de gestion collective). Attribution de volumes par exploitation. Compteur volumetrique obligatoire. Arretes secheresse : restrictions en 4 niveaux (vigilance, alerte, alerte renforcee, crise).',
    'FR',
  ],
  [
    'Arretes secheresse -- restrictions de prelevement',
    null,
    0,
    null,
    'En cas de secheresse, le prefet peut prendre des arretes de restriction des usages de l\'eau. 4 niveaux : vigilance (sensibilisation), alerte (reduction de 25%), alerte renforcee (reduction de 50%), crise (arret des prelevements sauf eau potable et securite). Suivi sur le site Propluvia.',
    'FR',
  ],
  [
    'Agence de l\'Eau Seine-Normandie -- prescriptions bassin',
    null,
    0,
    null,
    'Agence de l\'Eau Seine-Normandie : 11eme programme (2019-2024). Redevances prelevements et pollutions. Aides aux stockages de substitution, aires de lavage, zones tampons humides. SDAGE Seine-Normandie : objectif de bon etat ecologique des masses d\'eau (DCE). Prescriptions specifiques pour les zones d\'alimentation de captages (ZAC).',
    'FR',
  ],
  [
    'Agence de l\'Eau Loire-Bretagne -- prescriptions bassin',
    null,
    0,
    null,
    'Agence de l\'Eau Loire-Bretagne : programme 2019-2024. Focus sur la lutte contre les algues vertes (plan PABAN) en Bretagne, reduction des nitrates dans les bassins versants cotiers, restauration de la continuite ecologique. SDAGE Loire-Bretagne : objectifs DCE et limitation des prelevements en etiage.',
    'FR',
  ],
  [
    'Agence de l\'Eau Adour-Garonne -- prescriptions bassin',
    null,
    0,
    null,
    'Agence de l\'Eau Adour-Garonne : programme 2019-2024. Accompagnement de l\'irrigation durable (retenues de substitution sous conditions), plan de gestion des etiages (PGE), lutte contre les pollutions diffuses d\'origine agricole. SDAGE Adour-Garonne.',
    'FR',
  ],
  [
    'Agence de l\'Eau Rhone-Mediterranee-Corse -- prescriptions bassin',
    null,
    0,
    null,
    'Agence de l\'Eau Rhone-Mediterranee-Corse : programme 2019-2024. Adaptation au changement climatique, economie d\'eau, reduction des pesticides en zones viticoles et arboricoles. SDAGE Rhone-Mediterranee et SDAGE de Corse.',
    'FR',
  ],
  [
    'Agence de l\'Eau Rhin-Meuse -- prescriptions bassin',
    null,
    0,
    null,
    'Agence de l\'Eau Rhin-Meuse : programme 2019-2024. Protection des eaux souterraines (nappe d\'Alsace), reduction des produits phytopharmaceutiques. SDAGE Rhin-Meuse.',
    'FR',
  ],
  [
    'Agence de l\'Eau Artois-Picardie -- prescriptions bassin',
    null,
    0,
    null,
    'Agence de l\'Eau Artois-Picardie : programme 2019-2024. Reduction des pollutions diffuses (grandes cultures intensives), protection des captages AEP (25 captages prioritaires). SDAGE Artois-Picardie.',
    'FR',
  ],
];

const insertAbstraction = db.instance.prepare(
  `INSERT INTO abstraction_rules (source_type, threshold_m3_per_day, licence_required, exemptions, conditions, jurisdiction)
   VALUES (?, ?, ?, ?, ?, ?)`
);

for (const row of abstractionRules) {
  insertAbstraction.run(...row);
}
console.log(`Inserted ${abstractionRules.length} abstraction / IOTA / Agences de l'Eau rules.`);

// ---------------------------------------------------------------------------
// 5. Pollution Prevention -- Reglementation epandage, distances, timing
// ---------------------------------------------------------------------------

const pollutionPrev: Array<[string, string, string, string, string, string]> = [
  [
    'Epandage des effluents d\'elevage -- regles generales',
    'Pollution des eaux de surface et souterraines par les nitrates, le phosphore, les agents pathogenes. Emissions d\'ammoniac (NH3) et de protoxyde d\'azote (N2O).',
    'Respect du calendrier d\'epandage (PAN 7). Equilibre de la fertilisation (PPF). Doses maximales : 170 kg N organique/ha/an (Directive Nitrates). Techniques d\'epandage : incorporation rapide du lisier dans les 12 heures. Pendillards ou injecteurs recommandes pour reduire les emissions d\'ammoniac.',
    'Plan previsionnel de fumure (PPF) et cahier d\'enregistrement obligatoires en zone vulnerable. Analyse de sol tous les 5 ans. Respect des periodes d\'interdiction et des distances aux cours d\'eau, habitations, captages AEP.',
    'Arrete du 19 decembre 2011 ; PAN 7 ; Directive Nitrates 91/676/CEE',
    'FR',
  ],
  [
    'Distances d\'epandage (resume)',
    'Pollution des eaux, nuisances olfactives pour les riverains.',
    'Distances minimales reglementaires : 35 m des cours d\'eau (reductible a 10 m sous conditions), 50 m des habitations (effluents), 100 m des habitations (boues de STEP), 50 m des captages AEP, 200 m des lieux de baignade et piscicultures. Pas d\'epandage dans les perimetres de protection immediats des captages.',
    'Les distances peuvent etre renforcees par les programmes d\'actions regionaux (PAR) ou les arretes prefectoraux. Tenir un registre des parcelles epandues et des distances respectees.',
    'Arrete du 27 decembre 2013 art. 27 ; Code de l\'environnement R. 211-81',
    'FR',
  ],
  [
    'Produits phytopharmaceutiques -- utilisation',
    'Contamination des eaux, atteinte a la biodiversite, sante publique (riverains, applicateurs).',
    'Agrophone (Certiphyto) obligatoire pour tout utilisateur professionnel. Controle technique du pulverisateur tous les 3 ans. Registre phytopharmaceutique obligatoire (traitement, dose, parcelle, date, meteo). Respect des ZNT cours d\'eau (5 a 100 m selon AMM) et ZNT habitations (5, 10 ou 20 m). Materiel anti-derive homologue pour reduire les ZNT. Interdiction de traitement par vent > 19 km/h.',
    'Arrete du 4 mai 2017 modifie ; Decret 2019-1500 ; Reglement CE 1107/2009 ; Code rural L. 253-1',
    'Arrete du 4 mai 2017 ; Decret 2019-1500 ; Reglement CE 1107/2009',
    'FR',
  ],
  [
    'Aires de lavage et gestion des effluents phytopharmaceutiques',
    'Polution ponctuelle par les eaux de rincage des pulverisateurs (concentration en pesticides jusqu\'a 1000 fois la norme eau potable).',
    'Aire de lavage etanche avec collecte des effluents. Traitement des effluents phytopharmaceutiques par systeme agree : Phytobac, Heliosec, Osmofilm, BF Bulles, charbon actif. Rincage au champ recommande (dilution x100 par 3 rincages). Interdiction de lavage sur les aires de ravitaillement ou dans les cours de ferme sans systeme de collecte.',
    'Arrete du 12 septembre 2006 modifie. Gestion des PPNU (produits non utilises) et emballages vides via ADIVALOR. Responsabilite du detenteur jusqu\'a elimination conforme.',
    'Arrete du 12 septembre 2006 ; Code de l\'environnement R. 211-81 ; ADIVALOR',
    'FR',
  ],
  [
    'Batiments d\'elevage -- distances d\'implantation',
    'Nuisances olfactives, pollution des eaux, emissions d\'ammoniac.',
    'Distances d\'implantation des batiments d\'elevage et annexes (stockages d\'effluents) : 100 m des habitations de tiers et zones destinees a l\'habitation (PLU), 50 m des cours d\'eau (bord a bord), 35 m des puits et forages. Distances modulables dans les ICPE soumises a enregistrement ou autorisation.',
    'Les distances sont fixees par le RSD (reglement sanitaire departemental) ou les arretes prefectoraux ICPE. Les ICPE soumises a autorisation font l\'objet d\'une etude d\'impact incluant l\'odeur et les emissions.',
    'RSD ; Arrete du 27 decembre 2013 ; Code de l\'environnement R. 511-9',
    'FR',
  ],
  [
    'Pollution des eaux par les nitrates -- contentieux europeen',
    'Eutrophisation des eaux cotieres (algues vertes en Bretagne), contamination des nappes phreatiques (depassement 50 mg/l NO3).',
    'La France a ete condamnee par la CJUE en 2014 (affaire C-237/12) pour insuffisance de la transposition de la Directive Nitrates. Le 7eme programme d\'actions (PAN 7) est la reponse reglementaire. Les zones vulnerables couvrent environ 70% de la SAU francaise. Renforcement continu des mesures dans les ZAR.',
    'Surveillance des masses d\'eau par les Agences de l\'Eau. Monitoring des nitrates dans les eaux souterraines et superficielles. Rapportage quadriennal a la Commission europeenne.',
    'Directive Nitrates 91/676/CEE ; CJUE C-237/12 ; Code de l\'environnement R. 211-75 a R. 211-81',
    'FR',
  ],
  [
    'Emissions d\'ammoniac (NEC) et plan national',
    'L\'ammoniac (NH3) contribue aux particules fines (PM2.5) et a l\'eutrophisation. L\'agriculture represente 94% des emissions francaises de NH3.',
    'Plan national de reduction des emissions de polluants atmospheriques (PREPA) : objectif de reduction de 13% des emissions de NH3 en 2030 par rapport a 2005. Mesures : couverture des fosses a lisier, incorporation rapide des effluents, alimentation biphase des porcs, traitement des effluents volailles.',
    'Directive NEC 2016/2284/UE transposee par le decret 2017-949. PREPA (arrete du 10 mai 2017). Reporting annuel des emissions au CITEPA.',
    'Directive NEC 2016/2284/UE ; Decret 2017-949 ; PREPA',
    'FR',
  ],
  [
    'Epandage des boues de station d\'epuration',
    'Contamination des sols par les metaux lourds (cadmium, plomb, mercure), les agents pathogenes, les micropolluants organiques (HAP, PCB).',
    'Plan d\'epandage valide par la DDT. Analyse obligatoire des boues (metaux, agents pathogenes, micropolluants) et des sols (tous les 10 ans). Suivi agronomique par un prestataire agree. Respect des teneurs limites en metaux lourds. Registre d\'epandage conserve 10 ans.',
    'Arrete du 8 janvier 1998 modifie. Distance minimale de 100 m des habitations. Interdiction sur sols acides (pH < 6) ou engorgement en metaux. Commission de suivi des epandages.',
    'Arrete du 8 janvier 1998 ; Code de l\'environnement R. 211-25 a R. 211-47',
    'FR',
  ],
  [
    'Gestion des effluents vinicoles',
    'Eaux de cave (vinification, soutirage, lavage des cuves) : forte charge organique (DBO5 1000-15 000 mg/l), pH variable, pollution saisonniere concentree sur septembre-decembre.',
    'Traitement obligatoire des effluents vinicoles : lagunage naturel, filtres plantes de roseaux (FPR), systeme d\'epandage agree, raccordement a une station d\'epuration collective (avec convention). Pas de rejet direct dans le milieu naturel.',
    'Arrete du 3 mai 2000 ; Code de l\'environnement. Les caves relevant de l\'ICPE (rubrique 2251) appliquent les prescriptions generales applicables.',
    'Arrete du 3 mai 2000 ; Code de l\'environnement R. 211-81',
    'FR',
  ],
  [
    'Erosion des sols et ruissellement agricole',
    'Perte de terre arable, comblement des cours d\'eau, transport de pesticides et nutriments vers les eaux de surface. Coulees de boue en aval.',
    'BCAE 5 (conditionnalite PAC) : protection minimale contre l\'erosion (pas de retournement de prairies permanentes en pente > 15%). BCAE 6 : couverture minimale des sols en periodes sensibles. Amenagements anti-erosifs : haies, fascines, bandes enherbees, mares tampon. Cartographie departementale de l\'erosion.',
    'Plans de lutte contre le ruissellement et l\'erosion finances par les Agences de l\'Eau. Collectivites competentes en zones d\'erosion prioritaires.',
    'BCAE 5 et BCAE 6 PAC ; Code de l\'environnement ; SDAGE',
    'FR',
  ],
];

const insertPollution = db.instance.prepare(
  `INSERT INTO pollution_prevention (activity, hazards, control_measures, regulatory_requirements, regulation_ref, jurisdiction)
   VALUES (?, ?, ?, ?, ?, ?)`
);

for (const row of pollutionPrev) {
  insertPollution.run(...row);
}
console.log(`Inserted ${pollutionPrev.length} pollution prevention entries.`);

// ---------------------------------------------------------------------------
// 6. EIA Screening -- Evaluation environnementale (Code de l'environnement
//    R. 122-2, tableau annexe)
// ---------------------------------------------------------------------------

const eiaScreenings: Array<[string, number | null, string | null, number, string, string]> = [
  [
    'Elevage bovins (ICPE autorisation)',
    null,
    '> 400 vaches laitieres ou > 800 bovins a l\'engraissement',
    1,
    'Evaluation environnementale systematique pour les elevages ICPE soumis a autorisation (rubrique 2101). Etude d\'impact incluant : emissions d\'ammoniac, odeurs, gestion des effluents, paysage, biodiversite. Enquete publique obligatoire.',
    'FR',
  ],
  [
    'Elevage porcin (ICPE autorisation)',
    null,
    '> 2000 animaux-equivalents porcs',
    1,
    'Evaluation environnementale systematique pour les elevages porcins ICPE autorisation (rubrique 2102). Directive IED applicable (> 2000 places engrais ou 750 truies). Meilleures techniques disponibles (MTD) : document BREF elevage intensif.',
    'FR',
  ],
  [
    'Elevage de volailles (ICPE autorisation)',
    null,
    '> 40 000 emplacements volailles',
    1,
    'Evaluation environnementale systematique pour les elevages de volailles ICPE autorisation (rubrique 2111). Directive IED applicable. Etude d\'impact incluant : ammoniac, poussieres, odeurs, gestion des fientes.',
    'FR',
  ],
  [
    'Elevage bovins (ICPE enregistrement)',
    null,
    '101 a 400 vaches laitieres ou 401 a 800 bovins',
    1,
    'Examen au cas par cas par l\'autorite environnementale. Le prefet decide si une evaluation environnementale est necessaire en fonction de la sensibilite du milieu (proximite Natura 2000, captage AEP, zone humide).',
    'FR',
  ],
  [
    'Elevage porcin (ICPE enregistrement)',
    null,
    '451 a 2000 animaux-equivalents porcs',
    1,
    'Examen au cas par cas. Le prefet saisit l\'autorite environnementale (MRAe ou DREAL) pour determiner si une evaluation environnementale est necessaire.',
    'FR',
  ],
  [
    'Elevage de volailles (ICPE enregistrement)',
    null,
    '20 001 a 40 000 emplacements volailles',
    1,
    'Examen au cas par cas par l\'autorite environnementale.',
    'FR',
  ],
  [
    'Defrichement (> 25 ha)',
    25,
    '> 25 ha ou en zone protegee',
    1,
    'Evaluation environnementale systematique pour les defrichements de plus de 25 ha. En dessous, examen au cas par cas si foret classee ou en zone Natura 2000. Autorisation de defrichement prealable aupres de la DDT.',
    'FR',
  ],
  [
    'Retournement de prairies permanentes (> 4 ha en zone sensible)',
    4,
    '> 4 ha en zone Natura 2000 ou zone humide',
    1,
    'Examen au cas par cas pour le retournement de prairies permanentes en zone sensible. Evaluation d\'incidence Natura 2000 obligatoire. BCAE 1 PAC : ratio minimal de prairies permanentes a l\'echelle regionale.',
    'FR',
  ],
  [
    'Projets d\'irrigation (> 100 ha)',
    100,
    '> 100 ha irrigues ou prelevement > 200 000 m3/an',
    1,
    'Evaluation environnementale systematique pour les grands projets d\'irrigation ou les retenues d\'eau a usage agricole de plus de 350 000 m3. En dessous de ces seuils, examen au cas par cas.',
    'FR',
  ],
  [
    'Retenues d\'eau (retenues collinaires)',
    null,
    'Hauteur > 10 m ou volume > 5 000 000 m3',
    1,
    'Evaluation environnementale systematique. Nomenclature IOTA rubrique 3.2.5.0 (plans d\'eau, retenues). Les retenues de substitution pour l\'irrigation (bassines) font l\'objet d\'un encadrement specifique apres les travaux de la Commission de mediation (2023).',
    'FR',
  ],
  [
    'Installations photovoltaiques au sol (> 2,5 ha)',
    2.5,
    '> 2,5 ha de surface cloturee',
    1,
    'Examen au cas par cas pour les centrales photovoltaiques au sol sur terrains agricoles de plus de 2,5 ha. Evaluation systematique au-dessus de 30 ha. Loi d\'acceleration des energies renouvelables (mars 2023) : zones d\'acceleration definies par les communes.',
    'FR',
  ],
  [
    'Eoliennes (projets > 12 MW)',
    null,
    'Puissance totale > 12 MW ou hauteur mat > 50 m',
    1,
    'Evaluation environnementale systematique pour les parcs eoliens de plus de 12 MW ou dont les mats depassent 50 m. Etude d\'impact : bruit, avifaune, chiropteres, paysage. Autorisation environnementale unique (AEU).',
    'FR',
  ],
  [
    'Methanisation (biogaz agricole)',
    null,
    'Capacite > 60 t/jour d\'intrants ou > 2 MW',
    1,
    'Evaluation environnementale au cas par cas pour les unites de methanisation agricole. Au-dessus de 100 t/jour, evaluation systematique. ICPE rubrique 2781 (methanisation). Prescriptions generales : confinement, odeurs, digestat.',
    'FR',
  ],
  [
    'Elevages hors IED -- modification ou extension',
    null,
    'Augmentation > 30% de la capacite initiale autorisee',
    1,
    'L\'extension ou la modification substantielle d\'un elevage ICPE doit faire l\'objet d\'un examen au cas par cas. Augmentation de plus de 30% de la capacite : nouveau dossier d\'autorisation ou d\'enregistrement. Le prefet peut exiger une evaluation environnementale.',
    'FR',
  ],
];

const insertEia = db.instance.prepare(
  `INSERT INTO eia_screening (project_type, threshold_area_ha, threshold_other, screening_required, process, jurisdiction)
   VALUES (?, ?, ?, ?, ?, ?)`
);

for (const row of eiaScreenings) {
  insertEia.run(...row);
}
console.log(`Inserted ${eiaScreenings.length} EIA screening thresholds.`);

// ---------------------------------------------------------------------------
// 7. FTS5 Search Index
// ---------------------------------------------------------------------------

const searchEntries: Array<[string, string, string, string]> = [
  // =====================================================================
  // NVZ / Nitrates -- calendrier d'epandage
  // =====================================================================
  ['Calendrier epandage fumier type I grandes cultures', 'Effluents de type I (fumier compact, compost) : interdiction epandage du 15 novembre au 15 janvier sur grandes cultures. Fumier, compost, cereales.', 'nvz', 'FR'],
  ['Calendrier epandage fumier type I prairies', 'Effluents de type I (fumier, compost) sur prairies : interdiction du 15 novembre au 15 janvier. Fumier, prairie, paturage.', 'nvz', 'FR'],
  ['Calendrier epandage fumier type I sols nus', 'Effluents de type I sur sol nu sans culture : interdiction du 1er juillet au 15 janvier. Sol nu, fumier.', 'nvz', 'FR'],
  ['Calendrier epandage lisier type II grandes cultures', 'Effluents de type II (lisier, purin, boues) : interdiction du 1er octobre au 31 janvier sur grandes cultures. Lisier, purin, slurry, cereales.', 'nvz', 'FR'],
  ['Calendrier epandage lisier type II prairies', 'Effluents de type II (lisier, purin) sur prairies : interdiction du 15 octobre au 31 janvier. Lisier, purin, prairies.', 'nvz', 'FR'],
  ['Calendrier epandage lisier type II cultures derobees', 'Effluents de type II sur cultures derobees (CIPAN) : interdiction du 15 aout au 31 janvier. CIPAN, lisier.', 'nvz', 'FR'],
  ['Calendrier epandage lisier type II sols nus', 'Effluents de type II (lisier, purin, boues) sur sol nu : interdiction du 1er juillet au 31 janvier. Sol nu, lisier, purin.', 'nvz', 'FR'],
  ['Calendrier epandage engrais mineraux grandes cultures', 'Engrais azotes mineraux sur grandes cultures : interdiction du 1er septembre au 31 janvier. Ammonitrate, uree, solution azotee.', 'nvz', 'FR'],
  ['Calendrier epandage engrais mineraux prairies', 'Engrais azotes mineraux sur prairies : interdiction du 1er novembre au 31 janvier.', 'nvz', 'FR'],

  // Plafond et equilibre
  ['Plafond azote organique Directive Nitrates', 'Plafond de 170 kg N/ha/an d\'azote d\'origine animale par hectare de SAU epandable. Directive Nitrates 91/676/CEE. Nitrogen, nitrates, livestock.', 'nvz', 'FR'],
  ['Equilibre de fertilisation azotee', 'Obligation equilibre fertilisation : dose N totale ne doit pas depasser besoins cultures. PPF et cahier enregistrement obligatoires en zone vulnerable. Fertilisation, azote, nitrogen.', 'nvz', 'FR'],
  ['Plan previsionnel de fumure PPF', 'Plan previsionnel de fumure (PPF) obligatoire en zone vulnerable. Culture, dose, type effluent, surface. Conservation 5 ans.', 'nvz', 'FR'],
  ['Cahier enregistrement pratiques epandage', 'Cahier enregistrement epandage obligatoire : date, nature, quantite effluent, surface, ilot cultural. Conservation 5 ans. DDT, police de l\'eau.', 'nvz', 'FR'],

  // Interdictions
  ['Interdiction epandage sol gele enneige', 'Interdiction epandage sur sol gele (> 24h), enneige (> 1 cm), ou sature en eau. Tous effluents. Ruissellement.', 'nvz', 'FR'],
  ['Interdiction epandage forte pente', 'Interdiction epandage liquides (type II) sur pente > 7% vers cours d\'eau. Type I : pente > 15%. Bandes enherbees anti-ruissellement.', 'nvz', 'FR'],
  ['Distances epandage cours eau habitations captages', 'Distances minimales : 35 m cours d\'eau, 50 m habitations, 50 m captages AEP, 200 m baignade et piscicultures. Reductible 10 m avec conditions.', 'nvz', 'FR'],

  // ICPE
  ['ICPE rubrique 2101 bovins seuils', 'Rubrique 2101 bovins. D : 50-100 VL ou 100-400 engrais. E : 101-400 VL ou 401-800. A : > 400 VL ou > 800 bovins. ICPE, elevage, cattle.', 'nvz', 'FR'],
  ['ICPE rubrique 2102 porcs seuils', 'Rubrique 2102 porcs. D : 50-450 AE. E : 451-2000. A : > 2000 AE. IED : 2000 engrais ou 750 truies. ICPE, elevage, pigs.', 'nvz', 'FR'],
  ['ICPE rubrique 2111 volailles seuils', 'Rubrique 2111 volailles. D : 5000-20 000. E : 20 001-40 000. A : > 40 000 emplacements. IED. ICPE, poultry, chickens.', 'nvz', 'FR'],
  ['ICPE rubrique 2160 silos cereales', 'Rubrique 2160 silos cereales. D : > 5000 m3. E : > 15 000 m3. AS : si risque explosion ATEX. Silos, grain, stockage.', 'nvz', 'FR'],

  // CIPAN et couverture sols
  ['CIPAN couverture sols interculture zone vulnerable', 'Couverture des sols obligatoire en interculture longue (zone vulnerable). CIPAN implante avant 1er octobre, maintenu 2 mois. Destruction chimique interdite.', 'nvz', 'FR'],
  ['ZAR zones actions renforcees', 'Zones actions renforcees (ZAR) : periodes interdiction allongees, 170 kg N/ha par ilot, couverture interculture courte, reliquats azotes. Programmes actions regionaux.', 'nvz', 'FR'],

  // =====================================================================
  // Storage
  // =====================================================================
  ['Stockage lisier fosse', 'Fosse a lisier etanche (beton, geomembrane). 6 mois capacite zone vulnerable. 7 mois en ZAR. Controle etancheite 5 ans. Slurry storage, lisier.', 'storage', 'FR'],
  ['Stockage fumier fumiere', 'Fumiere couverte ou non, aire betonnee etanche, collecte jus. 4 mois capacite minimum. Fumier, manure, solid.', 'storage', 'FR'],
  ['Stockage fumier au champ', 'Fumier compact au champ : 2 mois maturation minimum, 10 mois maximum, 35 m cours d\'eau, 50 m habitations. Pas 2x meme endroit avant 3 ans.', 'storage', 'FR'],
  ['Stockage fientes volailles', 'Fientes volailles : batiment couvert ou fumiere, 4 mois minimum. Fientes humides (< 55% MS) : ouvrage etanche couvert. Poultry, litter.', 'storage', 'FR'],
  ['Stockage carburant fioul GNR', 'Cuves carburant : double paroi ou bac retention 100%. Controle 5 ans (enterrees), annuel (visuelles). Fioul, GNR, diesel, fuel.', 'storage', 'FR'],
  ['Stockage produits phytopharmaceutiques', 'Local ferme a cle, aere, sol etanche, bac retention. Separation semences, engrais, aliments. PPNU via ADIVALOR. Pesticides, phyto.', 'storage', 'FR'],
  ['Stockage ensilage silo couloir jus', 'Silo couloir dalle betonnee etanche, collecte jus ensilage (DBO5 30 000-80 000 mg/l). Jus tres polluants. Silage, ensilage.', 'storage', 'FR'],
  ['Eaux blanches vertes salle traite', 'Eaux lavage salle traite : collecter dans fosse lisier ou traitement. 10-20 l/VL/jour. Pas de rejet direct. Dairy, milking parlour.', 'storage', 'FR'],

  // =====================================================================
  // Buffer strips / ZNT
  // =====================================================================
  ['Bande tampon BCAE 4 cours eau', 'Bande tampon 5 m enherbee ou boisee le long cours d\'eau (cartes IGN 1/25 000). Conditionnalite PAC BCAE 4. Buffer strip, watercourse.', 'buffer_strips', 'FR'],
  ['Distance epandage 35 m cours eau', 'Distance minimale epandage 35 m des cours d\'eau. Reductible a 10 m si bande enherbee et enfouissement rapide. Spreading distance.', 'buffer_strips', 'FR'],
  ['Distance 50 m captages AEP', 'Distance minimale 50 m autour captages eau potable (AEP). Perimetres protection rapprochee peuvent imposer plus. Drinking water, AEP.', 'buffer_strips', 'FR'],
  ['Distance 50 m habitations epandage', 'Distance minimale 50 m des habitations pour epandage effluents elevage. 100 m pour boues STEP. Housing, neighbours, odour.', 'buffer_strips', 'FR'],
  ['ZNT habitations 5 m phyto', 'Zone Non-Traitement (ZNT) 5 m habitations pour phyto sans distance AMM specifique. Decret 2019-1500. Pesticides, neighbours.', 'buffer_strips', 'FR'],
  ['ZNT habitations 10 m CMR2', 'ZNT 10 m habitations pour produits CMR categorie 2. Cancerogene, mutagene, reprotoxique. ANSES, phytopharmaceutique.', 'buffer_strips', 'FR'],
  ['ZNT habitations 20 m CMR1', 'ZNT 20 m habitations pour produits CMR categorie 1A/1B. Non reductible. Pesticides, cancerogene, sante publique.', 'buffer_strips', 'FR'],
  ['ZNT cours eau phyto 5 m', 'ZNT 5 m minimum le long cours d\'eau pour phyto (defaut). Certains produits : 20, 50 ou 100 m selon AMM. Materiel anti-derive pour reduire.', 'buffer_strips', 'FR'],
  ['Distance 200 m baignade pisciculture', 'Distance 200 m des lieux de baignade et piscicultures pour epandage effluents. Bathing, fishery, buffer.', 'buffer_strips', 'FR'],
  ['Perimetres protection captages AEP', 'Perimetres protection captages (immediat, rapproche, eloigne) : arrete prefectoral DUP. Restrictions epandage et phyto en perimetre rapproche.', 'buffer_strips', 'FR'],

  // =====================================================================
  // Abstraction / IOTA / Agences de l'Eau
  // =====================================================================
  ['Prelevement eaux superficielles IOTA', 'IOTA 1.2.1.0 : prelevement eaux surface > 400 m3/h = autorisation. 5% debit a 400 m3/h = declaration. Surface water, abstraction.', 'abstraction', 'FR'],
  ['Prelevement eaux souterraines IOTA', 'IOTA 1.1.2.0 : prelevement souterrain > 200 000 m3/an = autorisation. 10 000-200 000 m3/an = declaration. Groundwater, borehole.', 'abstraction', 'FR'],
  ['Forage puits declaration', 'Tout forage ou puits : declaration en mairie. Usage agricole : declaration loi sur l\'eau si > 10 000 m3/an. Foreur agree. Borehole, well.', 'abstraction', 'FR'],
  ['Irrigation ZRE gestion volumetrique', 'Zone de repartition des eaux (ZRE) : OUGC, volumes par exploitation, compteur obligatoire. Arretes secheresse 4 niveaux. Irrigation, drought.', 'abstraction', 'FR'],
  ['Arretes secheresse restrictions', 'Arretes prefectoraux secheresse : vigilance, alerte (-25%), alerte renforcee (-50%), crise (arret). Propluvia. Drought, restriction.', 'abstraction', 'FR'],
  ['Agence Eau Seine-Normandie', 'Seine-Normandie : redevances, aides stockages substitution, zones alimentation captages (ZAC), SDAGE, bon etat ecologique DCE.', 'abstraction', 'FR'],
  ['Agence Eau Loire-Bretagne algues vertes', 'Loire-Bretagne : algues vertes Bretagne (plan PABAN), reduction nitrates bassins cotiers, continuite ecologique, SDAGE.', 'abstraction', 'FR'],
  ['Agence Eau Adour-Garonne irrigation', 'Adour-Garonne : irrigation durable, retenues substitution, plan gestion etiages (PGE), pollutions diffuses agricoles, SDAGE.', 'abstraction', 'FR'],
  ['Agence Eau Rhone-Mediterranee-Corse', 'Rhone-Mediterranee-Corse : changement climatique, economie eau, reduction pesticides viticulture arboriculture, SDAGE.', 'abstraction', 'FR'],
  ['Agence Eau Rhin-Meuse nappe Alsace', 'Rhin-Meuse : protection nappe Alsace, reduction phyto, SDAGE Rhin-Meuse.', 'abstraction', 'FR'],
  ['Agence Eau Artois-Picardie captages', 'Artois-Picardie : pollutions diffuses grandes cultures, 25 captages prioritaires, SDAGE.', 'abstraction', 'FR'],

  // =====================================================================
  // Pollution prevention
  // =====================================================================
  ['Epandage effluents elevage regles generales', 'Calendrier PAN 7, equilibre fertilisation PPF, 170 kg N organique/ha/an, incorporation lisier 12h, pendillards, ammoniac. Manure spreading.', 'pollution', 'FR'],
  ['Distances epandage resume reglementaire', '35 m cours eau (10 m conditions), 50 m habitations (100 m boues), 50 m captages AEP, 200 m baignade. Distances, spreading, buffer.', 'pollution', 'FR'],
  ['Produits phytopharmaceutiques utilisation', 'Certiphyto obligatoire, controle pulverisateur 3 ans, registre phyto, ZNT 5-20 m habitations, ZNT cours eau, anti-derive. Pesticides, spraying.', 'pollution', 'FR'],
  ['Aires lavage effluents phytopharmaceutiques', 'Aire lavage etanche, traitement agree (Phytobac, Heliosec), rincage champ, PPNU ADIVALOR. Pesticide washdown, effluent.', 'pollution', 'FR'],
  ['Batiments elevage distances implantation', 'Distances ICPE : 100 m habitations tiers, 50 m cours eau, 35 m puits forages. RSD. Livestock buildings, setback.', 'pollution', 'FR'],
  ['Contentieux nitrates France CJUE', 'France condamnee CJUE 2014 (C-237/12) Directive Nitrates. 70% SAU en zone vulnerable. PAN 7 reponse reglementaire. Nitrates, ECJ, compliance.', 'pollution', 'FR'],
  ['Emissions ammoniac NEC PREPA', 'Agriculture = 94% emissions NH3 France. PREPA : -13% en 2030. Couverture fosses, incorporation, alimentation biphase. Ammonia, NEC, air quality.', 'pollution', 'FR'],
  ['Epandage boues station epuration', 'Boues STEP : plan epandage DDT, analyses metaux/pathogenes, suivi sols 10 ans. Distance 100 m habitations. Sewage sludge, biosolids.', 'pollution', 'FR'],
  ['Effluents vinicoles traitement', 'Eaux de cave : DBO5 1000-15 000 mg/l. Traitement obligatoire : lagunage, FPR, epandage agree. Pas de rejet direct. Wine, winery, effluent.', 'pollution', 'FR'],
  ['Erosion sols ruissellement agricole', 'BCAE 5 protection erosion (pas retournement prairies > 15% pente). BCAE 6 couverture sols. Haies, fascines, bandes enherbees. Erosion, runoff.', 'pollution', 'FR'],

  // =====================================================================
  // EIA
  // =====================================================================
  ['Evaluation environnementale elevage bovins', 'Bovins ICPE autorisation (> 400 VL, > 800 engrais) : etude impact systematique. Enregistrement : cas par cas. Cattle, EIA, ICPE.', 'eia', 'FR'],
  ['Evaluation environnementale elevage porcin', 'Porcs ICPE autorisation (> 2000 AE) : etude impact systematique. Directive IED. Enregistrement (451-2000) : cas par cas. Pigs, EIA.', 'eia', 'FR'],
  ['Evaluation environnementale elevage volailles', 'Volailles ICPE autorisation (> 40 000 emplacements) : etude impact. IED. Enregistrement (20 001-40 000) : cas par cas. Poultry, EIA.', 'eia', 'FR'],
  ['Evaluation environnementale defrichement', 'Defrichement > 25 ha : evaluation systematique. < 25 ha en zone Natura 2000 : cas par cas. Autorisation DDT. Deforestation, clearing.', 'eia', 'FR'],
  ['Evaluation environnementale retournement prairies', 'Retournement prairies permanentes > 4 ha en zone Natura 2000/humide : cas par cas. BCAE 1 ratio prairies. Grassland, conversion.', 'eia', 'FR'],
  ['Evaluation environnementale irrigation', 'Projet irrigation > 100 ha ou > 200 000 m3/an : evaluation systematique. Retenues > 350 000 m3 idem. Irrigation, reservoir, EIA.', 'eia', 'FR'],
  ['Evaluation environnementale retenues eau', 'Retenues eau hauteur > 10 m ou volume > 5 000 000 m3 : evaluation systematique. IOTA 3.2.5.0. Bassines, retenues collinaires.', 'eia', 'FR'],
  ['Evaluation environnementale photovoltaique agricole', 'PV au sol > 2,5 ha : cas par cas. > 30 ha : systematique. Loi EnR 2023. Zones acceleration. Solar, photovoltaic, farmland.', 'eia', 'FR'],
  ['Evaluation environnementale eoliennes', 'Parc eolien > 12 MW ou mat > 50 m : evaluation systematique. Bruit, avifaune, chiropteres, paysage. AEU. Wind, turbine, EIA.', 'eia', 'FR'],
  ['Evaluation environnementale methanisation', 'Methanisation > 60 t/j : cas par cas. > 100 t/j : systematique. ICPE 2781. Biogaz, digestat. Biogas, anaerobic digestion.', 'eia', 'FR'],
  ['Evaluation environnementale extension elevage', 'Extension > 30% capacite ICPE : nouvel examen ou nouveau dossier. Cas par cas. Modification substantielle. Livestock expansion.', 'eia', 'FR'],
];

const insertSearch = db.instance.prepare(
  `INSERT INTO search_index (title, body, topic, jurisdiction) VALUES (?, ?, ?, ?)`
);

for (const row of searchEntries) {
  insertSearch.run(...row);
}
console.log(`Inserted ${searchEntries.length} FTS5 search index entries.`);

// ---------------------------------------------------------------------------
// 8. Metadata
// ---------------------------------------------------------------------------

const totalRecords = nvzRules.length + storageReqs.length + bufferStrips.length +
  abstractionRules.length + pollutionPrev.length + eiaScreenings.length;

db.run("INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('last_ingest', ?)", [now]);
db.run("INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('build_date', ?)", [now]);
db.run("INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('jurisdiction', 'FR')", []);
db.run("INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('mcp_name', 'France Environmental Compliance MCP')", []);
db.run("INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('data_sources', ?)", [
  'Code de l\'environnement (ICPE), Nomenclature ICPE (2101/2102/2111/2160), Directive Nitrates 91/676/CEE, 7eme programme d\'actions national (PAN 7), Arrete du 19 decembre 2011, Arrete du 27 decembre 2013, BCAE 4 PAC, Loi sur l\'eau (IOTA), Code rural (phytopharmaceutiques), Decret 2019-1500 (ZNT habitations), Code de l\'evaluation environnementale (R. 122-2), 6 Agences de l\'Eau, SDAGE',
]);
db.run("INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('record_counts', ?)", [
  JSON.stringify({
    nvz_rules: nvzRules.length,
    storage_requirements: storageReqs.length,
    buffer_strip_rules: bufferStrips.length,
    abstraction_rules: abstractionRules.length,
    pollution_prevention: pollutionPrev.length,
    eia_screening: eiaScreenings.length,
    search_index: searchEntries.length,
    total_structured: totalRecords,
  }),
]);

writeFileSync('data/coverage.json', JSON.stringify({
  mcp_name: 'France Environmental Compliance MCP',
  jurisdiction: 'FR',
  build_date: now,
  status: 'populated',
  record_counts: {
    nvz_rules: nvzRules.length,
    storage_requirements: storageReqs.length,
    buffer_strip_rules: bufferStrips.length,
    abstraction_rules: abstractionRules.length,
    pollution_prevention: pollutionPrev.length,
    eia_screening: eiaScreenings.length,
    search_index: searchEntries.length,
    total_structured: totalRecords,
  },
  data_sources: [
    'Code de l\'environnement (Livre V -- ICPE)',
    'Nomenclature ICPE (rubriques 2101, 2102, 2111, 2160)',
    'Directive Nitrates 91/676/CEE',
    '7eme programme d\'actions national nitrates (PAN 7)',
    'Arrete du 19 decembre 2011 (programmes d\'actions nitrates)',
    'Arrete du 27 decembre 2013 (prescriptions generales ICPE elevage)',
    'Arrete du 4 mai 2017 modifie (ZNT, produits phytopharmaceutiques)',
    'Decret 2019-1500 du 27 decembre 2019 (ZNT habitations)',
    'BCAE 4 conditionnalite PAC (bandes tampon)',
    'Loi sur l\'eau -- nomenclature IOTA',
    'Code rural L. 253-1 a L. 253-17 (produits phytopharmaceutiques)',
    'Code de la sante publique L. 1321-2 (captages AEP)',
    'Code de l\'evaluation environnementale R. 122-2',
    'Directive IED 2010/75/UE (elevages industriels)',
    'Directive NEC 2016/2284/UE (emissions atmospheriques)',
    'SDAGE des 6 Agences de l\'Eau',
    'Reglement CE 1107/2009 (produits phytopharmaceutiques)',
  ],
}, null, 2));

db.close();

console.log(`\nIngestion complete. Database: data/database.db`);
console.log(`  NVZ / nitrates rules:   ${nvzRules.length}`);
console.log(`  Storage requirements:   ${storageReqs.length}`);
console.log(`  Buffer strip / ZNT:     ${bufferStrips.length}`);
console.log(`  Abstraction / IOTA:     ${abstractionRules.length}`);
console.log(`  Pollution prevention:   ${pollutionPrev.length}`);
console.log(`  EIA screening:          ${eiaScreenings.length}`);
console.log(`  FTS5 search entries:    ${searchEntries.length}`);
console.log(`  Total structured rows:  ${totalRecords}`);
