// @ts-expect-error esbuild-register has no idea about Vite's automatic React injection…
import React from 'react'
import { useQuery } from '@tanstack/react-query'

import { fetchCharacter, getCharacterQueryKey } from './api/characters'

type Props = {
  id: number
}

export default function Character({ id }: Props) {
  const { data: character } = useQuery({
    queryKey: getCharacterQueryKey(id),
    queryFn: fetchCharacter,
  })

  return (
    <section className='character'>
      {character ? (
        <>
          <h2>{character.name}</h2>
          <p>Born {character.birth_year}</p>
        </>
      ) : (
        <h2>Character #{id}</h2>
      )}
      <hr />
    </section>
  )
}
