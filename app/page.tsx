import { SessionProvider } from "next-auth/react"
import QueryBox from "./components/QueryBox";
import { fetchUserUsage } from "./actions/usage";

export default async function Home() {
    const userUsage = await fetchUserUsage()
    return (
        <div className="bg-app-background min-h-screen bg-opacity-90 flex items-center flex-col px-4">
            <div className="w-full max-w-md pt-40 mb-20">
                <h1 className="text-5xl md:text-6xl text-center font-bold mb-8 text-primary-text font-title">
                    Boardally
                </h1>

                <QueryBox userUsage={userUsage} />

            </div>
        </div>
    );
}