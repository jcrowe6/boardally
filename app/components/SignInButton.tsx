import { signIn } from "../../auth"
 
export default function SignInButton() {
  return (
    <div className="inline-block">
    <form
      action={async () => {
        "use server"
        await signIn()
      }}
    >
      <button className="bg-button-background text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all transform hover:scale-105 cursor-pointer" type="submit">Sign in</button>
    </form>
    </div>
  )
} 