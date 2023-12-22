import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import Character from './Character'
import { CHARACTER_IDS } from './api/characters'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <h1>Star Wars Characters</h1>
      <ol>
        {CHARACTER_IDS.map((id) => (
          <Character key={id} id={id} />
        ))}
      </ol>
    </QueryClientProvider>
  )
}

export default App
