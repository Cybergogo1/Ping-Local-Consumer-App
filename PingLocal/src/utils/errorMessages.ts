/**
 * Maps Supabase authentication error messages to user-friendly messages
 */
export function getAuthErrorMessage(error: Error): string {
  const message = error.message?.toLowerCase() || '';

  // Signup errors
  if (message.includes('user already registered') || message.includes('already been registered')) {
    return 'An account with this email already exists. Try logging in instead.';
  }
  if (message.includes('invalid email')) {
    return 'Please enter a valid email address.';
  }
  if (message.includes('password') && message.includes('weak')) {
    return 'Password is too weak. Please use a stronger password.';
  }

  // Login errors
  if (message.includes('invalid login credentials')) {
    return 'Incorrect email or password. Please try again.';
  }
  if (message.includes('email not confirmed')) {
    return 'Please verify your email before logging in.';
  }

  // Rate limiting
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  // Network errors
  if (message.includes('network') || message.includes('fetch')) {
    return 'Connection error. Please check your internet and try again.';
  }

  // Generic fallback
  return 'Something went wrong. Please try again.';
}
