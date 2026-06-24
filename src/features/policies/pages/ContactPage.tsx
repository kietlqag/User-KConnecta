import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Clock, Headphones } from 'lucide-react';
import { InfoPageShell } from '../components/InfoPageShell';
import { KCONNECTA_CONTACT } from '../constants/contactInfo';

const contactRows = [
  {
    icon: Mail,
    label: 'Email hỗ trợ',
    value: KCONNECTA_CONTACT.supportEmail,
    href: `mailto:${KCONNECTA_CONTACT.supportEmail}`,
    note: 'Hỗ trợ tài khoản, đăng nhập, kỹ thuật và các vấn đề sử dụng',
  },
  {
    icon: Mail,
    label: 'Email bảo mật',
    value: KCONNECTA_CONTACT.privacyEmail,
    href: `mailto:${KCONNECTA_CONTACT.privacyEmail}`,
    note: 'Khiếu nại dữ liệu cá nhân, yêu cầu xóa tài khoản',
  },
  {
    icon: Phone,
    label: 'Hotline',
    value: KCONNECTA_CONTACT.hotline,
    href: `tel:${KCONNECTA_CONTACT.hotlineTel}`,
    note: 'Gọi trong giờ làm việc để được hỗ trợ nhanh',
  },
  {
    icon: MapPin,
    label: 'Địa chỉ',
    value: KCONNECTA_CONTACT.address,
    note: 'Văn phòng vận hành KConnecta',
  },
  {
    icon: Clock,
    label: 'Giờ làm việc',
    value: KCONNECTA_CONTACT.workingHours,
    note: KCONNECTA_CONTACT.responseTime,
  },
] as const;

export default function ContactPage() {
  return (
    <InfoPageShell
      title="Liên hệ"
      subtitle="Thông tin liên hệ đội ngũ hỗ trợ KConnecta"
      icon={Headphones}
    >
      <div className="mt-8 space-y-6">
        {contactRows.map((row) => (
          <section key={row.label} className="border-b border-gray-200 pb-6 last:border-b-0 dark:border-gray-700">
            <div className="flex items-start gap-3">
              <row.icon className="mt-0.5 h-5 w-5 shrink-0 text-gray-500 dark:text-gray-400" />
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{row.label}</h2>
                {'href' in row && row.href ? (
                  <a
                    href={row.href}
                    className="mt-1 block text-base font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                  >
                    {row.value}
                  </a>
                ) : (
                  <p className="mt-1 text-base font-medium text-gray-900 dark:text-gray-100">{row.value}</p>
                )}
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{row.note}</p>
              </div>
            </div>
          </section>
        ))}

        <section className="pt-2">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Tài liệu liên quan</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Xem thêm{' '}
            <Link to="/privacy" className="font-medium text-emerald-600 hover:underline dark:text-emerald-400">
              Chính sách bảo mật
            </Link>
            ,{' '}
            <Link to="/terms" className="font-medium text-emerald-600 hover:underline dark:text-emerald-400">
              Điều khoản dịch vụ
            </Link>
            .
          </p>
        </section>
      </div>
    </InfoPageShell>
  );
}
