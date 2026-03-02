import { useState } from 'react';
import { FileText } from 'lucide-react';
import { CommentItem, Comment } from './CommentItem';
import { CommentInput } from './CommentInput';

interface CommentSectionProps {
  postId: string;
  initialComments?: Comment[];
}

export function CommentSection({ postId, initialComments = [] }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);

  const handleAddComment = (content: string) => {
    const newComment: Comment = {
      id: Date.now().toString(),
      author: {
        name: 'Quốc Kiệt',
        avatar: 'https://images.unsplash.com/photo-1724435811349-32d27f4d5806?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXJzb24lMjBhdmF0YXIlMjBwcm9maWxlfGVufDF8fHx8MTc2OTYxOTc2NHww&ixlib=rb-4.1.0&q=80&w=400',
      },
      content,
      timestamp: 'Vừa xong',
      likes: 0,
    };
    setComments([...comments, newComment]);
  };

  return (
    <div className="px-4 py-3">
      {/* Comments List */}
      {comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="relative w-20 h-20 mb-3">
            <div className="absolute inset-0 bg-gray-200 rounded-lg transform rotate-6"></div>
            <div className="absolute inset-0 bg-gray-300 rounded-lg flex items-center justify-center">
              <FileText className="w-10 h-10 text-gray-500" />
            </div>
          </div>
          <h3 className="font-semibold text-gray-800 text-[17px] mb-1">
            Chưa có bình luận nào
          </h3>
          <p className="text-gray-600 text-[15px]">Hãy là người đầu tiên bình luận.</p>
        </div>
      ) : (
        <div className="space-y-4 mb-4">
          {comments.map((comment) => (
            <div key={comment.id} className="group">
              <CommentItem comment={comment} />
            </div>
          ))}
        </div>
      )}

      {/* Comment Input */}
      <CommentInput onSubmit={handleAddComment} />
    </div>
  );
}
