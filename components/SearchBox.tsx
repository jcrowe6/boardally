import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import { useState } from 'react';
import clsx from 'clsx';

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
];

export default function SearchBox() {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [query, setQuery] = useState('');

  const filteredGames =
    query === ''
      ? data
      : data.filter((game) => {
          return game.displayName.toLowerCase().includes(query.toLowerCase());
        });

  const handleChange = (game: Game | null) => {
    if (game) {
      setSelectedGame(game);
    }
  };

  return (
    <Combobox value={selectedGame} onChange={handleChange} onClose={() => setQuery('')}>
      <ComboboxInput
        aria-label="selectedGame"
        displayValue={(game: Game) => game?.displayName}
        onChange={(event) => setQuery(event.target.value)}
        className={clsx(
          'w-full h-12 rounded-lg border-none bg-gray-800 text-white px-4 text-base',
          'focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25'
        )}
      />
      <ComboboxOptions
        anchor="bottom"
        transition
        className={clsx(
          'w-[var(--input-width)] rounded-xl border border-white/10 bg-gray-900 p-1 [--anchor-gap:var(--spacing-1)] empty:invisible',
          'transition duration-100 ease-in data-[leave]:data-[closed]:opacity-0',
          'shadow-lg shadow-black/20'
        )}
      >
        {filteredGames.map((game) => (
          <ComboboxOption
            key={game.id}
            value={game}
            className="group flex cursor-default items-center gap-2 rounded-lg py-1.5 px-3 select-none data-[focus]:bg-gray-800"
          >
            <div className="text-sm/6 text-white">{game.displayName}</div>
          </ComboboxOption>
        ))}
      </ComboboxOptions>
    </Combobox>
  );
}