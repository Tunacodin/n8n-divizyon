// Tag atama algoritma testi — pickLeafAndParent saf fonksiyonu, DB'siz.
// Kurallar: TAG_ASSIGNMENT_RULES.md

import { describe, it, expect } from 'vitest'
import { pickLeafAndParent } from '../lib/character-tags'

describe('pickLeafAndParent', () => {
  it('1. Tek max skor — leaf + parent deterministik', () => {
    const r = pickLeafAndParent(
      { kendinden_emin: 9, canli: 6, pratik: 4 },
      { 'Kendinden Emin': 31, 'Canlı': 13, 'Pratik': 0 },
      new Set(),
    )
    expect(r.leaf).toBe('Kendinden Emin')
    expect(r.parent).toBe('Gözcü')
  })

  it('2. Iki max esit, count farkli — az count secilir', () => {
    const r = pickLeafAndParent(
      { pratik: 9, sistemli: 9, canli: 3 },
      { 'Pratik': 0, 'Sistemli': 6, 'Canlı': 13 },
      new Set(),
    )
    expect(r.leaf).toBe('Pratik')
    expect(r.parent).toBe('Öncü')
  })

  it('3. Iki max esit, count esit — alfabetik secilir', () => {
    const r = pickLeafAndParent(
      { pratik: 9, tecrubeli: 9 },
      { 'Pratik': 0, 'Tecrübeli': 0 },
      new Set(),
    )
    expect(r.leaf).toBe('Pratik')
    expect(r.parent).toBe('Öncü')
  })

  it('4. Max leaf kullanicida zaten var — diger max aday varsa secer', () => {
    const r = pickLeafAndParent(
      { pratik: 9, sistemli: 9 },
      { 'Pratik': 0, 'Sistemli': 6 },
      new Set(['Pratik']),
    )
    expect(r.leaf).toBe('Sistemli')
    expect(r.parent).toBe('Öncü')
  })

  it('5. Tum max leafler kullanicida var — null', () => {
    const r = pickLeafAndParent(
      { pratik: 9 },
      { 'Pratik': 0 },
      new Set(['Pratik']),
    )
    expect(r.leaf).toBeNull()
    expect(r.reason).toMatch(/zaten var/)
  })

  it('6. Skor tablosu bos — null', () => {
    const r = pickLeafAndParent({}, {}, new Set())
    expect(r.leaf).toBeNull()
    expect(r.reason).toMatch(/skoru yok/)
  })

  it('7. Tum skorlar 0 — null', () => {
    const r = pickLeafAndParent(
      { pratik: 0, canli: 0 },
      { 'Pratik': 0, 'Canlı': 13 },
      new Set(),
    )
    expect(r.leaf).toBeNull()
  })

  it('bonus — CHARACTER_TAG_MAP disi keyler gozardi edilir', () => {
    const r = pickLeafAndParent(
      { unknown_key: 99, pratik: 5 },
      { 'Pratik': 0 },
      new Set(),
    )
    expect(r.leaf).toBe('Pratik')
  })

  it('bonus — count missing tag => MAX_SAFE_INTEGER (en son tercih)', () => {
    const r = pickLeafAndParent(
      { pratik: 9, tecrubeli: 9 },
      { 'Pratik': 5 }, // Tecrübeli count yok
      new Set(),
    )
    expect(r.leaf).toBe('Pratik')
  })
})
