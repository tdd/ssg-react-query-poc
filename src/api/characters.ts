import type { UndefinedInitialDataOptions } from '@tanstack/react-query'

export const CHARACTER_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

type Character = {
  name: string
  birth_year: string
}

type CharacterQueryKey = ['characters', id: number]

type CharacterQueryFnParam = {
  queryKey: CharacterQueryKey
}

export function getCharacterQueryKey(id: number): CharacterQueryKey {
  return ['characters', id]
}

export async function fetchCharacter({
  queryKey: [, id],
}: CharacterQueryFnParam): Promise<Character> {
  const res = await fetch(`https://swapi.dev/api/people/${id}/`)
  if (!res.ok) {
    throw new Error(`Could not fetch character #${id}`)
  }
  return res.json()
}
