import Link from "next/link";
import SignInButton from "./SignInButton";

export default function Navbar() {
    return (
      <nav className="bg-white shadow-md p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="text-xl font-bold">YourAppName</div>
          <div className="space-x-4">
            <Link href="/" className="hover:text-blue-500">Home</Link>
            <Link href="/about" className="hover:text-blue-500">About</Link>
            <Link href="/contact" className="hover:text-blue-500">Contact</Link>
            <SignInButton/>
          </div>
        </div>
      </nav>
    );
  }