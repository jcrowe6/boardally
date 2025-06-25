export default function SubscriptionButton() {
    return (
        <form action="/api/create-checkout-session" method="POST">
            <section>
                <button
                    type="submit"
                    role="link"
                    className="bg-button-background text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all transform hover:scale-105 cursor-pointer"
                >
                    Upgrade to Premium
                </button>
            </section>
        </form>
    );
}