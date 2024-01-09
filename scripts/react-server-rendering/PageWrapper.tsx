import { QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import Character from '../../src/Character.tsx'
import { queryClient } from './PrefetchingClient.ts'

type Props = {
  id: number
}

export default function PageWrapper({ id }: Props) {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <Character id={id} />
      </QueryClientProvider>
    </React.StrictMode>
  )
}
