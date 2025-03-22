import { SessionProvider } from "next-auth/react"
import { fetchUserUsage } from "./actions/usage";
import UsageBar from "./components/UsageBar";
import QueryBox from "./components/QueryBox";

export default async function Home() {

    return (
        <SessionProvider>
            <div className="bg-app-background min-h-screen bg-opacity-90 flex md:justify-center items-center flex-col px-4">
                <div className="w-full max-w-md pt-40 md:pt-0">
                    <h1 className="text-5xl md:text-6xl text-center font-bold mb-8 text-primary-text font-title">
                        Boardally
                    </h1>

                    <UsageBar />
                    <QueryBox />

                </div>
            </div>
        </SessionProvider>
    );
}