import { createDatabase, type Database } from '../../src/db.js';

export function createSeededDatabase(dbPath: string): Database {
  const db = createDatabase(dbPath);

  // NVZ rules
  db.run(
    `INSERT INTO nvz_rules (activity, material_type, soil_type, closed_period_start, closed_period_end, max_application_rate, conditions, regulation_ref, jurisdiction)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['Epandage lisier sur grandes cultures (type II)', 'lisier (type II)', null, 'Oct 1', 'Jan 31', null, 'Effluents de type II (lisier, purin) : interdiction du 1er octobre au 31 janvier sur grandes cultures.', 'Arrete du 19 decembre 2011 art. 2-3 ; PAN 7', 'FR']
  );
  db.run(
    `INSERT INTO nvz_rules (activity, material_type, soil_type, closed_period_start, closed_period_end, max_application_rate, conditions, regulation_ref, jurisdiction)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['Epandage fumier sur grandes cultures (type I)', 'fumier (type I)', null, 'Nov 15', 'Jan 15', null, 'Effluents de type I (fumier compact, compost) : interdiction du 15 novembre au 15 janvier.', 'Arrete du 19 decembre 2011 art. 2-3 ; PAN 7', 'FR']
  );
  db.run(
    `INSERT INTO nvz_rules (activity, material_type, soil_type, closed_period_start, closed_period_end, max_application_rate, conditions, regulation_ref, jurisdiction)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['ICPE rubrique 2111 -- elevage de volailles', null, null, null, null, null, 'Rubrique 2111 (volailles). Declaration : 5000-20 000. Enregistrement : 20 001-40 000. Autorisation : > 40 000 emplacements.', 'Code de l\'environnement R. 511-9 ; Nomenclature ICPE rubrique 2111', 'FR']
  );
  db.run(
    `INSERT INTO nvz_rules (activity, material_type, soil_type, closed_period_start, closed_period_end, max_application_rate, conditions, regulation_ref, jurisdiction)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['Plafond azote d\'origine animale (Directive Nitrates)', 'effluents d\'elevage', null, null, null, '170 kg N/ha/an d\'origine animale', 'Plafond de 170 kg N organique par hectare de SAU epandable et par an.', 'Directive Nitrates 91/676/CEE art. 5', 'FR']
  );

  // Storage requirements
  db.run(
    `INSERT INTO storage_requirements (material, min_capacity_months, construction_standard, separation_distance_m, inspection_frequency, regulation_ref, jurisdiction)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['Lisier (fosse a lisier)', 6, 'Fosse a lisier etanche (beton ou geomembrane). Capacite minimale 6 mois en zone vulnerable.', 35, 'Controle etancheite 5 ans. Inspection visuelle mensuelle.', 'Arrete du 27 decembre 2013 art. 26-30', 'FR']
  );
  db.run(
    `INSERT INTO storage_requirements (material, min_capacity_months, construction_standard, separation_distance_m, inspection_frequency, regulation_ref, jurisdiction)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['Stockage carburant (fioul, GNR)', null, 'Cuve double paroi ou bac retention 100%. Conforme arrete 1er juillet 2004.', null, 'Controle 5 ans (enterrees), annuel (visuelles).', 'Arrete du 1er juillet 2004', 'FR']
  );

  // Buffer strip rules
  db.run(
    `INSERT INTO buffer_strip_rules (watercourse_type, activity, min_width_m, conditions, scheme_payment, regulation_ref, jurisdiction)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['Cours d\'eau (bande tampon BCAE 4)', 'Epandage et traitement phytopharmaceutique', 5, 'Bande tampon enherbee ou boisee de 5 metres minimum le long des cours d\'eau. Conditionnalite PAC.', 'Eco-regime PAC possible', 'BCAE 4 ; Arrete du 24 avril 2015', 'FR']
  );
  db.run(
    `INSERT INTO buffer_strip_rules (watercourse_type, activity, min_width_m, conditions, scheme_payment, regulation_ref, jurisdiction)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['ZNT habitations -- produits phytopharmaceutiques (5 m)', 'Traitement phytopharmaceutique', 5, 'Zone de Non-Traitement 5 metres vis-a-vis des habitations.', null, 'Decret 2019-1500', 'FR']
  );

  // Abstraction rules
  db.run(
    `INSERT INTO abstraction_rules (source_type, threshold_m3_per_day, licence_required, exemptions, conditions, jurisdiction)
     VALUES (?, ?, ?, ?, ?, ?)`,
    ['Prelevement en eaux souterraines (> 200 000 m3/an)', null, 1, null, 'Nomenclature IOTA rubrique 1.1.2.0 : prelevement souterrain > 200 000 m3/an -- regime d\'autorisation.', 'FR']
  );

  // Pollution prevention
  db.run(
    `INSERT INTO pollution_prevention (activity, hazards, control_measures, regulatory_requirements, regulation_ref, jurisdiction)
     VALUES (?, ?, ?, ?, ?, ?)`,
    ['Epandage des effluents d\'elevage -- regles generales', 'Pollution des eaux par les nitrates, phosphore, agents pathogenes. Emissions ammoniac.', 'Calendrier PAN 7, equilibre fertilisation, 170 kg N/ha/an, incorporation lisier 12h.', 'PPF et cahier enregistrement obligatoires en zone vulnerable.', 'Arrete du 19 decembre 2011 ; PAN 7', 'FR']
  );

  // EIA screening
  db.run(
    `INSERT INTO eia_screening (project_type, threshold_area_ha, threshold_other, screening_required, process, jurisdiction)
     VALUES (?, ?, ?, ?, ?, ?)`,
    ['Elevage bovins (ICPE autorisation)', null, '> 400 vaches laitieres ou > 800 bovins', 1, 'Evaluation environnementale systematique. Etude d\'impact incluant emissions, odeurs, effluents.', 'FR']
  );

  // FTS5 search index
  db.run(
    `INSERT INTO search_index (title, body, topic, jurisdiction) VALUES (?, ?, ?, ?)`,
    ['Calendrier epandage lisier type II grandes cultures', 'Effluents de type II (lisier, purin) : interdiction du 1er octobre au 31 janvier sur grandes cultures. Lisier, slurry.', 'nvz', 'FR']
  );
  db.run(
    `INSERT INTO search_index (title, body, topic, jurisdiction) VALUES (?, ?, ?, ?)`,
    ['Calendrier epandage fumier type I grandes cultures', 'Effluents de type I (fumier, compost) : interdiction du 15 novembre au 15 janvier. Fumier, manure.', 'nvz', 'FR']
  );
  db.run(
    `INSERT INTO search_index (title, body, topic, jurisdiction) VALUES (?, ?, ?, ?)`,
    ['Stockage lisier fosse', 'Fosse a lisier etanche. 6 mois capacite zone vulnerable. Slurry storage.', 'storage', 'FR']
  );
  db.run(
    `INSERT INTO search_index (title, body, topic, jurisdiction) VALUES (?, ?, ?, ?)`,
    ['Bande tampon BCAE 4 cours eau', 'Bande tampon 5 m le long des cours d\'eau. Conditionnalite PAC BCAE 4. Buffer strip.', 'buffer_strips', 'FR']
  );
  db.run(
    `INSERT INTO search_index (title, body, topic, jurisdiction) VALUES (?, ?, ?, ?)`,
    ['Epandage effluents elevage regles', 'Calendrier PAN 7, equilibre fertilisation, 170 kg N/ha/an. Manure spreading rules.', 'pollution', 'FR']
  );

  // Metadata
  const today = new Date().toISOString().split('T')[0];
  db.run("INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('last_ingest', ?)", [today]);

  return db;
}
