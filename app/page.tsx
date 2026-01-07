import QueryBox from "./components/QueryBox";
import { fetchUserUsage } from "./actions/usage";
import { fetchInitialGames } from "./actions/games";

export default async function Home() {
  const [userUsage, initialGames] = await Promise.all([
    fetchUserUsage(),
    fetchInitialGames(),
  ]);

  return (
    <div className="bg-app-background min-h-screen bg-opacity-90 flex items-center flex-col px-4">
      <div className="w-full max-w-md pt-40 mb-20">
        <h1 className="text-5xl md:text-6xl text-center font-bold mb-8 text-primary-text font-title">
          Boardally
        </h1>

        <QueryBox userUsage={userUsage} initialGames={initialGames} />
      </div>
    </div>
  );
}
