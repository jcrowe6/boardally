import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react'
import { useState } from 'react'

type Game = {
  id: number;
  displayName: string;
  gameId: string;
};

const data: Game[] = [
  { id: 1, displayName: 'Azul', gameId: '230802_azul' },
  { id: 2, displayName: 'Starry Night Sky', gameId: '368519_starry-night-sky' },
  { id: 3, displayName: 'Sky Team', gameId: '373106_sky-team' },
  { id: 4, displayName: 'Dune Imperium Uprising', gameId: '397598_dune-imperium-uprising' },
  { id: 5, displayName: 'Compile Main 1', gameId: '406652_compile-main-1' },
]

export default function SearchBox() {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [query, setQuery] = useState('')

  const filteredGames =
    query === ''
      ? data
      : data.filter((game) => {
          return game.displayName.toLowerCase().includes(query.toLowerCase())
        })

  const handleChange = (game: Game | null) => {
    if (game) {
      setSelectedGame(game)
    }
  }
  
  return (
    <Combobox value={selectedGame} onChange={handleChange} onClose={() => setQuery('')}>
      <ComboboxInput
        aria-label="Assignee"
        displayValue={(game: Game) => game?.displayName}
        onChange={(event) => setQuery(event.target.value)}
      />
      <ComboboxOptions anchor="bottom" className="border empty:invisible">
        {filteredGames.map((game) => (
          <ComboboxOption key={game.id} value={game} className="data-[focus]:bg-blue-100">
            {game.displayName}
          </ComboboxOption>
        ))}
      </ComboboxOptions>
    </Combobox>
  )
}