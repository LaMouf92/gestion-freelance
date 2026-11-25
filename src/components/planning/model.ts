import type { Milestone, Project } from '../../lib/types'

/** Ce que reçoivent toutes les vues du planning */
export interface PlanningProject {
  project: Project
  color: string
  clientName: string
  milestones: Milestone[]
}

export const parseDay = (iso: string) => new Date(iso + 'T12:00:00')
export const DAY = 24 * 3600 * 1000
export const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY)

/** Début et fin affichables d'un projet (si une seule date existe, le projet dure 1 jour) */
export function projectRange(p: Project): [string, string] {
  const start = p.start_date ?? p.due_date!
  const end = p.delivered_date && p.delivered_date > (p.due_date ?? '') ? p.delivered_date : p.due_date ?? start
  return start <= end ? [start, end] : [end, start]
}
