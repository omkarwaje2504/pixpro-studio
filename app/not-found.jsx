"use client";

import Link from "next/link";
import "./globals.css";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="flex flex-col-reverse lg:flex-row items-center justify-center lg:px-24 lg:py-24 md:py-20 md:px-44 px-4 py-24 gap-16 md:gap-28">
      <div className="xl:pt-24 w-full xl:w-1/2 relative pb-12 lg:pb-0">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Looks like you found the doorway to the great nothing
        </h1>
        <p className="text-gray-800 mb-6">
          Sorry about that! Please visit our homepage to get where you need to
          go.
        </p>
        <Link
          href="/"
          className="inline-block px-8 py-4 bg-indigo-600 text-white rounded-md text-center hover:bg-indigo-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-700 focus:ring-opacity-50"
        >
          Take me there!
        </Link>
      </div>
      <div>
        <Image
          src="https://i.ibb.co/G9DC8S0/404-2.png"
          width={0}
          height={0}
          alt="404 Error Illustration"
          sizes="100vw"
          className="w-full"
        />
      </div>
    </div>
  );
}
