import Link from "next/link";
import SignInButton from "./SignInButton";
import SignOutButton from "./SignOutButton";

export default function Navbar() {
    return (
      <nav className="bg-primary-container shadow-md p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="text-xl text-primary-text font-bold">Boardally</div>
          <div className="space-x-4">
            <Link href="/" className="text-primary-text">Home</Link>
            <Link href="/about" className="text-primary-text">About</Link>
            <Link href="/contact" className="text-primary-text">Contact</Link>
            <SignInButton/>
            <SignOutButton/>
          </div>
        </div>
      </nav>
    );
  }