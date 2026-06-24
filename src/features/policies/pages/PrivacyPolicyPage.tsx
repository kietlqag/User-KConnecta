import { LegalDocumentLayout } from '../components/LegalDocumentLayout';

const UPDATED_AT = '20 tháng 6, 2025';

export default function PrivacyPolicyPage() {
  return (
    <LegalDocumentLayout
      title="Chính sách bảo mật"
      subtitle="Cách KConnecta thu thập, sử dụng và bảo vệ thông tin của bạn"
      updatedAt={UPDATED_AT}
      icon="privacy"
      sections={[
        {
          title: '1. Thông tin chúng tôi thu thập',
          paragraphs: [
            'KConnecta thu thập thông tin bạn cung cấp khi đăng ký, cập nhật hồ sơ, đăng bài, nhắn tin hoặc sử dụng các tính năng trên nền tảng.',
          ],
          bullets: [
            'Thông tin tài khoản: họ tên, email, tên người dùng, ảnh đại diện.',
            'Nội dung bạn tạo: bài viết, bình luận, tin nhắn, ảnh và video.',
            'Dữ liệu kỹ thuật: thiết bị, trình duyệt, nhật ký truy cập để vận hành và bảo mật hệ thống.',
          ],
        },
        {
          title: '2. Mục đích sử dụng',
          paragraphs: ['Chúng tôi sử dụng dữ liệu để vận hành, cá nhân hóa trải nghiệm và bảo vệ cộng đồng KConnecta.'],
          bullets: [
            'Hiển thị hồ sơ, bạn bè, nhóm và nội dung bạn chọn chia sẻ.',
            'Gửi thông báo về hoạt động quan trọng (tin nhắn, lời mời, bình luận).',
            'Phát hiện spam, lừa đảo và vi phạm chính sách cộng đồng.',
          ],
        },
        {
          title: '3. Chia sẻ thông tin',
          paragraphs: [
            'KConnecta không bán dữ liệu cá nhân của bạn. Thông tin chỉ được chia sẻ khi bạn chủ động công khai, khi có yêu cầu pháp lý hợp lệ, hoặc với nhà cung cấp dịch vụ cần thiết để vận hành nền tảng (lưu trữ, email, bảo mật).',
          ],
        },
        {
          title: '4. Quyền của bạn',
          paragraphs: ['Bạn có thể quản lý quyền riêng tư trong phần Cài đặt tài khoản.'],
          bullets: [
            'Chỉnh sửa hoặc xóa thông tin hồ sơ.',
            'Điều chỉnh ai được xem bài viết và trang cá nhân.',
            'Tắt một số loại thông báo hoặc email.',
            'Yêu cầu hỗ trợ khi cần truy cập, chỉnh sửa hoặc xóa dữ liệu.',
          ],
        },
        {
          title: '5. Bảo mật & lưu trữ',
          paragraphs: [
            'Chúng tôi áp dụng các biện pháp kỹ thuật và tổ chức phù hợp để bảo vệ dữ liệu khỏi truy cập trái phép, mất mát hoặc lạm dụng. Dữ liệu được lưu trữ trong thời gian cần thiết để cung cấp dịch vụ và tuân thủ quy định pháp luật.',
          ],
        },
        {
          title: '6. Liên hệ',
          paragraphs: [
            'Nếu có câu hỏi về chính sách bảo mật, vui lòng liên hệ đội ngũ KConnecta qua trang Liên hệ hoặc email privacy@kconnecta.vn.',
          ],
        },
      ]}
    />
  );
}
