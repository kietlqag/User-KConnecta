import { Post } from '../../../../components/shared';
import { GroupsHeader, GroupsLeftSidebar } from '../components';
import { Group, GroupPost } from '../types/groups.types';
import exampleImage from 'figma:asset/74ca37b8e92fb5ac2cb3fb9e7b8898e6ebafb02b.png';

const mockJoinedGroups: Group[] = [
  {
    id: '1',
    name: 'Liên Quân Mobile Trải Nghiệm Game',
    icon: 'https://images.unsplash.com/photo-1647881936538-03f29176b1aa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaG90b2dyYXBoeSUyMGdyb3VwJTIwaWNvbnxlbnwxfHx8fDE3Njk2NjY5NDV8MA&ixlib=rb-4.1.0&q=80&w=1080',
    members: 12500,
    privacy: 'public',
    lastActivity: 'Lần hoạt động gần nhất: 13 giờ trước',
  },
  {
    id: '2',
    name: 'Việt Nam Glory Clash Royale',
    icon: 'https://images.unsplash.com/photo-1762340278560-ada94c871862?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWNobm9sb2d5JTIwY29tbXVuaXR5JTIwbG9nb3xlbnwxfHx8fDE3Njk2NjY5NDV8MA&ixlib=rb-4.1.0&q=80&w=1080',
    members: 8200,
    privacy: 'public',
    lastActivity: 'Lần hoạt động gần nhất: 13 giờ trước',
  },
  {
    id: '3',
    name: 'Động Quỷ của CrisDevilGamer',
    icon: 'https://images.unsplash.com/photo-1764738130382-cc7a8eaf26c7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb29raW5nJTIwZm9vZCUyMGNvbW11bml0eXxlbnwxfHx8fDE3Njk1NjU2NDZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    members: 5400,
    privacy: 'private',
    lastActivity: 'Lần hoạt động gần nhất: 1 ngày trước',
  },
  {
    id: '4',
    name: '<3 Yêu anime và Nghiện nhạc <3',
    icon: 'https://images.unsplash.com/photo-1647881936538-03f29176b1aa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaG90b2dyYXBoeSUyMGdyb3VwJTIwaWNvbnxlbnwxfHx8fDE3Njk2NjY5NDV8MA&ixlib=rb-4.1.0&q=80&w=1080',
    members: 3200,
    privacy: 'public',
    lastActivity: 'Lần hoạt động gần nhất: 2 giờ trước',
  },
];

const mockGroupPosts: GroupPost[] = [
  {
    id: '1',
    group: {
      id: '1',
      name: 'Liên Quân Mobile Trải Nghiệm Game',
      icon: 'https://images.unsplash.com/photo-1647881936538-03f29176b1aa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaG90b2dyYXBoeSUyMGdyb3VwJTIwaWNvbnxlbnwxfHx8fDE3Njk2NjY5NDV8MA&ixlib=rb-4.1.0&q=80&w=1080',
    },
    author: {
      id: '101',
      name: 'Hùng Dũng',
      avatar: 'https://images.unsplash.com/photo-1695800998493-ccff5ea292ea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMHByb2Zlc3Npb25hbCUyMEFzaWFuJTIweY91bmclMjBtYW58ZW58MXx8fHwxNzY5NjY2MzY5fDA&ixlib=rb-4.1.0&q=80&w=1080',
    },
    timestamp: '27 tháng 1 lúc 21:43',
    content: 'esbu là ịu c( ị ha âe =)), M5 màx chiêu mà bê như lv1',
    media: {
      type: 'image',
      url: exampleImage,
    },
    reactions: {
      like: 37,
      love: 0,
      haha: 0,
    },
    commentsCount: 2,
    sharesCount: 0,
    comments: [
      {
        id: 'c1',
        author: {
          id: '102',
          name: 'Dung Kim',
          avatar: 'https://images.unsplash.com/photo-1758600587839-56ba05596c69?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMHByb2Zlc3Npb25hbCUyMEFzaWFuJTIweY91bmclMjB3b21hbnxlbnwxfHx8fDE3Njk2NjYzNjl8MA&ixlib=rb-4.1.0&q=80&w=1080',
        },
        content: 'Dạng bị lội hay sao ấy . Máy mòay này nỏi',
        timestamp: '1 ngày',
        reactions: 0,
      },
      {
        id: 'c2',
        author: {
          id: '103',
          name: 'Nhật Minh',
          avatar: 'https://images.unsplash.com/photo-1717985498747-f081679d2c33?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMGNhc3VhbCUyMFZpZXRuYW1lc2UlMjBtYW58ZW58MXx8fHwxNzY5NjY2MzcwfDA&ixlib=rb-4.1.0&q=80&w=1080',
        },
        content: 'Tớ cũng gặp))) tưởng giảm tấm chiêu 1',
        timestamp: '1 ngày',
        reactions: 0,
      },
    ],
  },
  {
    id: '2',
    group: {
      id: '2',
      name: 'Vi��t Nam Glory Clash Royale',
      icon: 'https://images.unsplash.com/photo-1762340278560-ada94c871862?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWNobm9sb2d5JTIwY29tbXVuaXR5JTIwbG9nb3xlbnwxfHx8fDE3Njk2NjY5NDV8MA&ixlib=rb-4.1.0&q=80&w=1080',
    },
    author: {
      id: '104',
      name: 'Minh Tuấn',
      avatar: 'https://images.unsplash.com/photo-1738566061505-556830f8b8f5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMGJ1c2luZXNzJTIwQXNpYW4lMjBtYW58ZW58MXx8fHwxNzY5NjY2MzcxfDA&ixlib=rb-4.1.0&q=80&w=1080',
    },
    timestamp: '26 tháng 1 lúc 14:32',
    content: 'Hôm nay chơi được vài trận hay lắm! Ai muốn đấu thử không? 🎮',
    reactions: {
      like: 24,
      love: 5,
      haha: 2,
    },
    commentsCount: 5,
    sharesCount: 1,
  },
  {
    id: '3',
    group: {
      id: '3',
      name: 'Động Quỷ của CrisDevilGamer',
      icon: 'https://images.unsplash.com/photo-1764738130382-cc7a8eaf26c7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb29raW5nJTIwZm9vZCUyMGNvbW11bml0eXxlbnwxfHx8fDE3Njk1NjU2NDZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    },
    author: {
      id: '105',
      name: 'Thu Hà',
      avatar: 'https://images.unsplash.com/photo-1718307701476-bf46ac964396?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMGNhc3VhbCUyMFZpZXRuYW1lc2UlMjB3b21hbnxlbnwxfHx8fDE3Njk2NjYzNzB8MA&ixlib=rb-4.1.0&q=80&w=1080',
    },
    timestamp: '25 tháng 1 lúc 19:20',
    content: 'Mình vừa hoàn thành nhiệm vụ khó nhất trong game! Cảm giác tuyệt vời quá đi! 🎉✨',
    reactions: {
      like: 48,
      love: 12,
      haha: 0,
    },
    commentsCount: 8,
    sharesCount: 2,
  },
];

export const GroupsPage = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <GroupsHeader />
      
      <div className="max-w-[1920px] mx-auto">
        <div className="flex pt-14">
          {/* Left Sidebar */}
          <GroupsLeftSidebar joinedGroups={mockJoinedGroups} />
          
          {/* Main Content */}
          <main className="flex-1 max-w-[680px] mx-auto p-4">
            <div className="space-y-4">
              {mockGroupPosts.map((post) => {
                const totalReactions = post.reactions.like + post.reactions.love + post.reactions.haha;
                return (
                  <Post
                    key={post.id}
                    id={post.id}
                    author={post.author}
                    timestamp={post.timestamp}
                    content={post.content}
                    media={post.media}
                    likes={totalReactions}
                    comments={post.commentsCount}
                    shares={post.sharesCount}
                    group={post.group}
                    commentsData={post.comments}
                  />
                );
              })}
            </div>

            {/* Load More */}
            <div className="text-center py-8">
              <button className="text-blue-600 hover:text-blue-700 font-medium">
                Xem thêm bài viết
              </button>
            </div>
          </main>

          {/* Right Side - Whitespace for balance */}
          <div className="w-[360px] hidden xl:block" />
        </div>
      </div>
    </div>
  );
};