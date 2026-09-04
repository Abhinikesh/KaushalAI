import { Tag } from 'lucide-react'
import RoadmapNotice from '../../components/shared/RoadmapNotice'

export default function SkillTaxonomyPage() {
  return (
    <RoadmapNotice
      title="National Statistical Skill Taxonomy &amp; Knowledge Graph"
      subtitle="Ontological classification of statistical concepts, methodology clusters, and international taxonomy mapping"
      icon={Tag}
      phase="Phase II Statistical Knowledge Graph"
      description="In an enterprise deployment, this module manages a formal statistical knowledge graph mapping Indian official statistical standards directly to international taxonomies (e.g. UN Statistics Division, IMF SDDS, and ILO guidelines) for automated cross-jurisdictional competency equivalence."
      prerequisites={[
        'Graph database engine (Neo4j / Amazon Neptune) deployment for multi-hop semantic relationship queries.',
        'Ontological alignment with Karmayogi Bharat competency dictionaries.',
        'Automated synonym clustering pipeline linking academic statistical concepts with administrative terminology.',
      ]}
    />
  )
}
