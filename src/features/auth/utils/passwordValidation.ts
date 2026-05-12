export function calculatePasswordStrength(value: string): number {
  let strength = 0;
  if (value.length >= 8) strength++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) strength++;
  if (/\d/.test(value)) strength++;
  if (/[^a-zA-Z\d]/.test(value)) strength++;
  return strength;
}

export function getPasswordChecks(password: string) {
  const hasMinLength = password.length >= 8;
  const hasUpperAndLower = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  return {
    hasMinLength,
    hasUpperAndLower,
    hasNumber,
    hasAllRequiredChecks: hasMinLength && hasUpperAndLower && hasNumber,
  };
}

