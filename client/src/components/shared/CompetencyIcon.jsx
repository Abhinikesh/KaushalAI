import { getCompetencyIcon } from '../../utils/competencyIcons'

/**
 * Reusable Competency / Course Icon renderer.
 * Sizes: 'sm' (16px), 'md' (20px), 'lg' (24px), 'xl' (32px)
 */
export default function CompetencyIcon({
  name = '',
  category = '',
  size = 'md',
  color = 'currentColor',
  className = '',
  style = {},
  ariaLabel,
}) {
  const IconComponent = getCompetencyIcon(name, category)

  const sizePx = {
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
  }[size] || 20

  return (
    <IconComponent
      size={sizePx}
      color={color}
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-label={ariaLabel || name || 'Competency icon'}
      role={ariaLabel || name ? 'img' : 'presentation'}
    />
  )
}
