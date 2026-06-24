import { LegalDocumentLayout } from '../components/LegalDocumentLayout';

const UPDATED_AT = '20 tháng 6, 2025';

export default function TermsOfServicePage() {
  return (
    <LegalDocumentLayout
      title="Điều khoản dịch vụ"
      subtitle="Quy định khi bạn sử dụng mạng xã hội KConnecta"
      updatedAt={UPDATED_AT}
      icon="terms"
      sections={[
        {
          title: '1. Chấp nhận điều khoản',
          paragraphs: [
            'Khi tạo tài khoản hoặc sử dụng KConnecta, bạn đồng ý tuân thủ các điều khoản này và Chính sách cộng đồng. Nếu không đồng ý, vui lòng ngừng sử dụng dịch vụ.',
          ],
        },
        {
          title: '2. Tài khoản người dùng',
          paragraphs: ['Bạn chịu trách nhiệm bảo mật thông tin đăng nhập và mọi hoạt động trên tài khoản của mình.'],
          bullets: [
            'Cung cấp thông tin chính xác khi đăng ký.',
            'Không mạo danh người khác hoặc tạo tài khoản giả mạo.',
            'Thông báo ngay cho KConnecta nếu phát hiện truy cập trái phép.',
          ],
        },
        {
          title: '3. Nội dung & hành vi',
          paragraphs: [
            'Bạn giữ quyền sở hữu nội dung mình đăng tải, đồng thời cấp cho KConnecta quyền hiển thị nội đó trên nền tảng theo cài đặt quyền riêng tư bạn chọn.',
          ],
          bullets: [
            'Không đăng nội dung vi phạm pháp luật Việt Nam.',
            'Không quấy rối, đe dọa, lừa đảo hoặc phát tán thông tin sai lệch.',
            'Tôn trọng quyền riêng tư và bản quyền của người khác.',
          ],
        },
        {
          title: '4. Tính năng & dịch vụ',
          paragraphs: [
            'KConnecta có thể cập nhật, thay đổi hoặc tạm ngừng một phần dịch vụ để bảo trì, cải thiện hoặc vì lý do pháp lý. Chúng tôi sẽ cố gắng thông báo trước khi có thay đổi quan trọng.',
          ],
        },
        {
          title: '5. Chấm dứt tài khoản',
          paragraphs: [
            'Bạn có thể ngừng sử dụng dịch vụ bất cứ lúc nào. KConnecta có quyền tạm khóa hoặc chấm dứt tài khoản vi phạm điều khoản, chính sách cộng đồng hoặc gây rủi ro cho người dùng khác.',
          ],
        },
        {
          title: '6. Giới hạn trách nhiệm',
          paragraphs: [
            'KConnecta cung cấp nền tảng “nguyên trạng”. Chúng tôi không chịu trách nhiệm cho thiệt hại gián tiếp phát sinh từ việc sử dụng dịch vụ, trừ khi pháp luật có quy định khác.',
          ],
        },
        {
          title: '7. Luật áp dụng',
          paragraphs: [
            'Điều khoản này được điều chỉnh theo pháp luật Việt Nam. Mọi tranh chấp sẽ được ưu tiên giải quyết thông qua thương lượng trước khi đưa ra cơ quan có thẩm quyền.',
          ],
        },
      ]}
    />
  );
}
