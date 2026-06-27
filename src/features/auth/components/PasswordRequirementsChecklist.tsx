import { calculatePasswordStrength, getPasswordChecks } from '@/features/auth/utils/passwordValidation';

interface PasswordRequirementsChecklistProps {
  password: string;
  showStrength?: boolean;
  className?: string;
}

export function PasswordRequirementsChecklist({
  password,
  showStrength = true,
  className = '',
}: PasswordRequirementsChecklistProps) {
  if (!password) return null;

  const { hasMinLength, hasUpperAndLower, hasNumber } = getPasswordChecks(password);
  const passwordStrength = calculatePasswordStrength(password);
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
  const strengthLabels = ['Yếu', 'Trung bình', 'Tốt', 'Mạnh'];

  const items = [
    { ok: hasMinLength, label: 'Ít nhất 8 ký tự' },
    { ok: hasUpperAndLower, label: 'Chữ hoa và chữ thường' },
    { ok: hasNumber, label: 'Ít nhất một số' },
  ];

  return (
    <div className={className}>
      {showStrength ? (
        <div className="mb-3">
          <div className="mb-2 flex gap-1">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${ index < passwordStrength ? strengthColors[passwordStrength - 1] : 'bg-muted' }`}
              />
            ))}
          </div>
          {passwordStrength > 0 ? (
            <p className="text-sm text-muted-foreground">
              Độ mạnh:{' '}
              <span
                className={`font-semibold ${ passwordStrength >= 3 ? 'text-primary' : passwordStrength === 2 ? 'text-amber-600' : 'text-orange-600' }`}
              >
                {strengthLabels[passwordStrength - 1]}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-[10px] bg-muted/50 p-4">
        <p className="mb-2 text-sm font-medium text-foreground">Mật khẩu phải có:</p>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {items.map((item) => (
            <li key={item.label} className="flex items-center gap-2">
              <div
                className={`flex h-4 w-4 items-center justify-center rounded-full ${ item.ok ? 'bg-primary' : 'bg-muted-foreground/30' }`}
              >
                {item.ok ? (
                  <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : null}
              </div>
              {item.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function validateNewPassword(password: string): string | true {
  if (!password) return 'Mật khẩu mới là bắt buộc';
  if (password.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự';

  const { hasAllRequiredChecks } = getPasswordChecks(password);
  if (!hasAllRequiredChecks) {
    return 'Mật khẩu phải có chữ hoa, chữ thường và ít nhất một số';
  }

  if (calculatePasswordStrength(password) < 2) {
    return 'Mật khẩu quá yếu. Hãy thêm chữ hoa, số hoặc ký tự đặc biệt';
  }

  return true;
}
