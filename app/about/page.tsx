export default function About() {
  return (
    <div className="bg-app-background min-h-screen bg-opacity-90 flex md:justify-center items-center flex-col px-4">
      <div className="w-full max-w-md pt-40 md:pt-0">
        <div className="bg-primary-container/50 rounded-lg shadow-lg p-6 mb-6 text-center">
          <p className="text-primary-text text-xl">Hi there!</p>
          <br />
          <p className="text-primary-text text-xl">
            Boardally is a RAG application that helps keep your board game
            nights running smoothly.
          </p>
          <br />
          <p className="text-primary-text text-xl">
            As an avid board gamer, I've spent way too much time digging through
            lengthy rulebooks trying to find answers to specific questions.
            That's why I built Boardally - to make it easy for you to quickly
            get the rules answers you need.
          </p>
        </div>
      </div>
    </div>
  );
}
