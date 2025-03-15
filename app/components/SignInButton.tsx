import { signIn } from "../../auth"
 
export default function SignInGoogle() {
  return (
    <div className="inline-block">
    <form
      action={async () => {
        "use server"
        await signIn("google")
      }}
    >
      <button className="text-primary-text cursor-pointer" type="submit">Sign in with Google</button>
    </form>
    </div>
  )
} 