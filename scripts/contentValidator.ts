/**
 * Simple content validator 
 */
export class ContentValidationError extends Error {
    constructor(message: string) {
        super(message);
    }
}

export function validateInputContent(input: string): {
    isValid: boolean;
    reason?: string;
    content?: string;
} {
    // 1. Check minimum length
    const MIN_LENGTH = 10;
    if (input.length < MIN_LENGTH) {
        return {
            isValid: false,
            reason: `Content too short (minimum ${MIN_LENGTH} characters)`,
            content: input
        };
    }

    // 2. Check content is only text and punctuation
    const TEXT_AND_PUNCTUATION_REGEX = /^[a-zA-Z0-9\s.,;:!?"'()\-]+$/;
    if (!TEXT_AND_PUNCTUATION_REGEX.test(input)) {
        return {
            isValid: false,
            reason: 'Content contains disallowed characters',
            content: input
        };
    }

    // Would like to add more
    return {
        isValid: true,
    };
}