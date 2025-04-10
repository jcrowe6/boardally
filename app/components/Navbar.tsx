import Link from "next/link";
import { auth } from "../../auth"
import SignInButton from "./SignInButton";
import SignOutButton from "./SignOutButton";
import Image from "next/image";
import SubscriptionButton from "./SubscriptionButton";

export default async function Navbar() {
  const session = await auth()
  const isAuthenticated = !!session
  return (
    <nav className="bg-primary-container px-4 fixed top-0 left-0 w-full h-16 shadow-md z-50 flex items-center">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-baseline space-x-4">
          <Link href="/" className="text-primary-text text-xl font-bold">Boardally</Link>
          <Link href="/about" className="text-primary-text hidden md:block">About</Link>
        </div>

        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <div className="flex items-center space-x-3">
              <Link href='/account'>
                <button
                  type="submit"
                  role="link"
                  className="bg-button-background text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all transform hover:scale-105 cursor-pointer"
                >
                  Account
                </button>
              </Link>
              <SignOutButton />
            </div>
          ) : (
            <SignInButton />
          )}
        </div>
      </div>
    </nav>
  );
}