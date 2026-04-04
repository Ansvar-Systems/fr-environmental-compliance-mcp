import { buildMeta } from '../metadata.js';
import type { Database } from '../db.js';

interface Source {
  name: string;
  authority: string;
  official_url: string;
  retrieval_method: string;
  update_frequency: string;
  license: string;
  coverage: string;
  last_retrieved?: string;
}

export function handleListSources(db: Database): { sources: Source[]; _meta: ReturnType<typeof buildMeta> } {
  const lastIngest = db.get<{ value: string }>('SELECT value FROM db_metadata WHERE key = ?', ['last_ingest']);

  const sources: Source[] = [
    {
      name: 'Code de l\'environnement -- ICPE (nomenclature 2101, 2102, 2111, 2160)',
      authority: 'Ministere de la Transition ecologique',
      official_url: 'https://www.legifrance.gouv.fr/codes/id/LEGITEXT000006074220/',
      retrieval_method: 'MANUAL_EXTRACT',
      update_frequency: 'annuel',
      license: 'Licence Ouverte / Open Licence (Etalab)',
      coverage: 'Nomenclature ICPE elevage : seuils declaration, enregistrement, autorisation',
      last_retrieved: lastIngest?.value,
    },
    {
      name: 'Directive Nitrates 91/676/CEE -- 7eme programme d\'actions national (PAN 7)',
      authority: 'Ministere de l\'Agriculture',
      official_url: 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000024944198',
      retrieval_method: 'MANUAL_EXTRACT',
      update_frequency: 'quadriennal (cycle Directive Nitrates)',
      license: 'Licence Ouverte / Open Licence (Etalab)',
      coverage: 'Calendrier epandage, equilibre fertilisation, CIPAN, stockage, zones vulnerables, ZAR',
      last_retrieved: lastIngest?.value,
    },
    {
      name: 'Arrete du 27 decembre 2013 (prescriptions generales ICPE elevage)',
      authority: 'Ministere de l\'Ecologie',
      official_url: 'https://www.legifrance.gouv.fr/loda/id/JORFTEXT000028381657/',
      retrieval_method: 'MANUAL_EXTRACT',
      update_frequency: 'selon modifications',
      license: 'Licence Ouverte / Open Licence (Etalab)',
      coverage: 'Distances implantation, stockage effluents, epandage, rejets pour elevages ICPE',
      last_retrieved: lastIngest?.value,
    },
    {
      name: 'BCAE 4 PAC (bandes tampon) et Decret 2019-1500 (ZNT habitations)',
      authority: 'Ministere de l\'Agriculture / Ministere de la Sante',
      official_url: 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000039686039',
      retrieval_method: 'MANUAL_EXTRACT',
      update_frequency: 'selon modifications',
      license: 'Licence Ouverte / Open Licence (Etalab)',
      coverage: 'Bandes tampon 5 m cours d\'eau, ZNT habitations 5/10/20 m, ZNT cours d\'eau',
      last_retrieved: lastIngest?.value,
    },
    {
      name: 'Loi sur l\'eau (IOTA) et 6 Agences de l\'Eau (SDAGE)',
      authority: 'Ministere de la Transition ecologique / Agences de l\'Eau',
      official_url: 'https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074220/LEGISCTA000006108640/',
      retrieval_method: 'MANUAL_EXTRACT',
      update_frequency: 'annuel (programmes Agences)',
      license: 'Licence Ouverte / Open Licence (Etalab)',
      coverage: 'Prelevements eau (IOTA), arretes secheresse, prescriptions par bassin hydrographique',
      last_retrieved: lastIngest?.value,
    },
    {
      name: 'Code de l\'evaluation environnementale (R. 122-2)',
      authority: 'Ministere de la Transition ecologique',
      official_url: 'https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074220/LEGISCTA000006108640/',
      retrieval_method: 'MANUAL_EXTRACT',
      update_frequency: 'selon modifications',
      license: 'Licence Ouverte / Open Licence (Etalab)',
      coverage: 'Seuils evaluation environnementale, examen cas par cas, etude d\'impact',
      last_retrieved: lastIngest?.value,
    },
  ];

  return {
    sources,
    _meta: buildMeta({ source_url: 'https://www.legifrance.gouv.fr/' }),
  };
}
