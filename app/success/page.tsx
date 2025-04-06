import { redirect } from 'next/navigation'

import { stripe } from '../../lib/stripe'

export default async function Success({ searchParams }) {
  const { session_id } = await searchParams

  if (!session_id)
    throw new Error('Please provide a valid session_id (`cs_test_...`)')

  const {
    status,
    // customer_details
  } = await stripe.checkout.sessions.retrieve(session_id, {
    expand: ['line_items', 'payment_intent']
  })

  // const customerEmail = customer_details?.email

  if (status === 'open') {
    return redirect('/')
  }

  if (status === 'complete') {
    return (
      <div className="bg-app-background min-h-screen bg-opacity-90 flex md:justify-center items-center flex-col px-4">
            <div className="w-full max-w-md pt-40 md:pt-0">
                <div className="bg-primary-container/50 rounded-lg shadow-lg p-6 mb-6 text-center">
                    <p className="text-primary-text text-xl">
                        Thank you for subscribing to Boardally!
                    </p>
                    <br />
                    <p className="text-primary-text text-xl">
                        Enjoy unlimited requests and early access to new features.
                    </p>
                    <br />
                    <button className="bg-button-background text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all transform hover:scale-105 cursor-pointer">
                        <a href="/">
                            <span className="text-primary-text text-xl">
                                Back to Home
                            </span>
                        </a>
                    </button>
                </div>
                
            </div>
        </div>
    )
  }
}