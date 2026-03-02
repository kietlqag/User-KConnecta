import { Stories } from '../Stories';
import { CreatePost } from '../CreatePost';
import { Post } from '../../../../components/shared';
import { useState } from 'react';
import { PostDetailModal } from '../../../../components/posts/PostDetailModal';

export function NewsFeed() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);

  const posts = [
    {
      id: '1',
      author: {
        id: 'u1',
        name: 'UTE - THẮC MẮC HỌC TẬP ® (Trường Đại học Công nghệ Kỹ thuật|TPHCM - HCMUTE)',
        avatar: 'https://images.unsplash.com/photo-1562774053-701939374585?w=150',
      },
      timestamp: 'Hôm qua lúc 16:27',
      content: 'Mng ơi file hình lẽ Tốt Nghiệp đọt vừa rồi thi mình xem ở đâu vậy, cảm ơn mng',
      image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800',
      likes: 42,
      comments: 15,
      shares: 3,
      isLiked: false,
    },
    {
      id: '2',
      author: {
        id: 'u2',
        name: 'Nguyễn Văn An',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      },
      timestamp: '2 giờ trước',
      content: 'Cuối tuần này có ai muốn đi chơi không? Đi uống cà phê và tản bộ công viên nào! ☕🌳',
      likes: 28,
      comments: 8,
      shares: 1,
      isLiked: true,
    },
    {
      id: '3',
      author: {
        id: 'u3',
        name: 'Trần Thị Bình',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      },
      timestamp: '5 giờ trước',
      content: 'Vừa hoàn thành dự án lớn! Cảm ơn team đã hỗ trợ nhiệt tình. Giờ thì nghỉ ngơi thôi! 🎉',
      image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800',
      likes: 156,
      comments: 32,
      shares: 12,
      isLiked: true,
    },
    {
      id: '4',
      author: {
        id: 'u4',
        name: 'Lê Hoàng Nam',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      },
      timestamp: '1 ngày trước',
      content: 'Buổi sáng tuyệt vời với một tách cà phê và view đẹp. Chúc mọi người một ngày làm việc hiệu quả! 💪☕',
      image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800',
      likes: 89,
      comments: 21,
      shares: 5,
      isLiked: false,
    },
  ];

  const handleCommentClick = (post: any) => {
    setSelectedPost(post);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="space-y-0">
        <Stories />
        <CreatePost />
        {posts.map((post) => (
          <Post
            key={post.id}
            {...post}
            onCommentClick={() => handleCommentClick(post)}
          />
        ))}
      </div>

      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}