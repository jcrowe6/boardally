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
      <button className="text-primary-text cursor-pointer" type="submit">Sign in</button>
    </form>
    </div>
  )
} 