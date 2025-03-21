import React, { FormEvent, useState } from "react";
import SearchBox from "./components/SearchBox";
import QueryBox from "./components/QueryBox";

export default function Home() {
    return (
        <div className="bg-app-background min-h-screen bg-opacity-90 flex md:justify-center items-center flex-col px-4">
            <div className="w-full max-w-md pt-40 md:pt-0">
                <h1 className="text-5xl md:text-6xl text-center font-bold mb-8 text-primary-text font-title">
                    Boardally
                </h1>
                <QueryBox/>
            </div>
        </div>
    );
}