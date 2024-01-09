import { QueryClient } from '@tanstack/react-query'
import {
  fetchCharacter,
  getCharacterQueryKey,
} from '../../src/api/characters.ts'

export const queryClient = new QueryClient()

export function prefetchCharacters(ids: number[]) {
  return Promise.all(
    ids.map((id) =>
      queryClient.prefetchQuery({
        queryKey: getCharacterQueryKey(id),
        queryFn: fetchCharacter,
      })
    )
  )
}
