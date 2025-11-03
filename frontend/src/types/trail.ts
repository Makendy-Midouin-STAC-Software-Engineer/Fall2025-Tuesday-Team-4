export interface TrailSummary {
  id: number | string
  name: string | null
  type: 'Route' | 'Way'
  lengthKm: number | null
  difficulty: string | null
  website: string | null
}

