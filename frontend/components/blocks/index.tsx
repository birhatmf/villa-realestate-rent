import type { Section } from '@/lib/types';
import ConceptGrid from './ConceptGrid';
import CtaBanner from './CtaBanner';
import EditorialSplit from './EditorialSplit';
import FeaturedVillas from './FeaturedVillas';
import Hero from './Hero';
import RegionGrid from './RegionGrid';
import StatBar from './StatBar';
import Testimonials from './Testimonials';
import ValueProps from './ValueProps';

type BlockComponent = React.ComponentType<{ content: Record<string, any> }>;

/** Tek kayıt yeri: admin paneli de eklenebilir blok listesini buradan türetecek. */
export const BLOCKS: Record<string, BlockComponent> = {
  hero: Hero,
  statBar: StatBar,
  regionGrid: RegionGrid,
  conceptGrid: ConceptGrid,
  featuredVillas: FeaturedVillas,
  editorialSplit: EditorialSplit,
  valueProps: ValueProps,
  testimonials: Testimonials,
  ctaBanner: CtaBanner,
};

export function renderSections(sections: Section[]) {
  return sections.map((s) => {
    const Block = BLOCKS[s.type];
    if (!Block) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`Bilinmeyen blok tipi: ${s.type}`);
      }
      return null;
    }
    // data-section-id: inline editörün DOM'da bloğu bulması için.
    return (
      <div key={s.id} data-section-id={s.id} data-section-type={s.type}>
        <Block content={s.content} />
      </div>
    );
  });
}
