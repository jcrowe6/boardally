import { signOut } from "../../auth"
 
export default function SignOutButton() {
  return (
    <div className="inline-block">
    <form
      action={async () => {
        "use server"
        await signOut()
      }}
    >
      <button className="bg-button-background text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all transform hover:scale-105 cursor-pointer" type="submit">Sign Out</button>
    </form>
    </div>
  )
} 