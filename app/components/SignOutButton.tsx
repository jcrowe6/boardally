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
      <button className="text-primary-text cursor-pointer" type="submit">Sign Out</button>
    </form>
    </div>
  )
} 