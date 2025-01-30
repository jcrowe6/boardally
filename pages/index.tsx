import React, { FormEvent } from "react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Index() {
  const [answer, setAnswer] = React.useState("")

  let testQuery = {game: "Azul", question: "who wins?"} 

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const formDataJson = JSON.stringify(Object.fromEntries(formData))

    const response = await fetch('/api/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: formDataJson,
    })

    const data = await response.json()
    setAnswer(data["answer"])
  }

  return (
    <div className="flex h-screen justify-center items-center flex-col">
      <h1 className="text-6xl pb-12 font-title">Boardally</h1>
      <form onSubmit={onSubmit} className="flex flex-col items-center bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <div className="mb-4">
          <input name="game" type="text" placeholder="Board game" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"/>
        </div>
        <div className="mb-6">
          <input name="question" type="text" placeholder="What's your question?" className="w-xl shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"/>
        </div>
        <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
          Submit
        </button>
      </form>
      <h1 className="text-xl max-w-2/3">{answer}</h1>
    </div>
  );
}
