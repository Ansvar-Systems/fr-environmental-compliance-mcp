import { buildMeta } from '../metadata.js';
import { SUPPORTED_JURISDICTIONS } from '../jurisdiction.js';

export function handleAbout() {
  return {
    name: 'France Environmental Compliance MCP',
    description:
      'Donnees de conformite environnementale agricole pour la France : nomenclature ICPE elevage, ' +
      'calendrier d\'epandage (PAN 7), capacites de stockage des effluents, bandes tampon (BCAE 4), ' +
      'ZNT habitations, loi sur l\'eau (IOTA), Agences de l\'Eau, evaluation environnementale, ' +
      'et prevention des pollutions diffuses.',
    version: '0.1.0',
    jurisdiction: [...SUPPORTED_JURISDICTIONS],
    data_sources: [
      'Code de l\'environnement (ICPE, nomenclature 2101/2102/2111/2160)',
      'Directive Nitrates 91/676/CEE -- PAN 7',
      'Arrete du 19 decembre 2011 (programmes d\'actions nitrates)',
      'Arrete du 27 decembre 2013 (prescriptions ICPE elevage)',
      'Decret 2019-1500 (ZNT habitations)',
      'BCAE 4 PAC (bandes tampon)',
      'Loi sur l\'eau -- nomenclature IOTA',
      '6 Agences de l\'Eau (SDAGE)',
    ],
    tools_count: 11,
    links: {
      homepage: 'https://ansvar.eu/open-agriculture',
      repository: 'https://github.com/Ansvar-Systems/fr-environmental-compliance-mcp',
      mcp_network: 'https://ansvar.ai/mcp',
    },
    _meta: buildMeta(),
  };
}
