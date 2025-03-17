import { redirect } from "next/navigation"
import { signIn, auth, providerMap } from "../../auth"
import { AuthError } from "next-auth"

export default async function SignInPage(props: {
    searchParams: Promise<{ callbackUrl: string | undefined }>
}) {
    return (
        <div className="bg-app-background min-h-screen bg-opacity-90 flex justify-center items-center flex-col px-4 py-12">
            <div className="w-full max-w-md">
                <div className="bg-primary-container bg-opacity-overlay backdrop-blur-sm rounded-lg shadow-lg p-6 mb-6 border border-primary-container-border flex justify-center items-center flex-col">
                    <h1 className="text-2xl md:text-3xl text-center font-bold mb-8 text-primary-text font-title">
                        Sign In
                    </h1>
                    {Object.values(providerMap).map((provider) => (
                        <form
                            key={provider.id}
                            action={async () => {
                                "use server"
                                try {
                                    await signIn(provider.id, {
                                        redirectTo: (await props.searchParams)?.callbackUrl ?? "",
                                    })
                                } catch (error) {
                                    // Signin can fail for a number of reasons, such as the user
                                    // not existing, or the user not having the correct role.
                                    // In some cases, you may want to redirect to a custom error
                                    //   if (error instanceof AuthError) {
                                    //     return redirect(`${SIGNIN_ERROR_URL}?error=${error.type}`)
                                    //   }

                                    // Otherwise if a redirects happens Next.js can handle it
                                    // so you can just re-thrown the error and let Next.js handle it.
                                    // Docs:
                                    // https://nextjs.org/docs/app/api-reference/functions/redirect#server-component
                                    throw error
                                }
                            }}
                        >
                            <button type="submit" className="bg-button-background text-white font-medium py-3 px-6 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all transform hover:scale-105">
                                <span>Sign in with {provider.name}</span>
                            </button>
                        </form>
                    ))}
                </div>
            </div>
        </div>
    );
}